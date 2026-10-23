#!/usr/bin/env python3
"""Reference client for the pathtoimpact.us sync contract, version 1.

Kem copies this file into the Career vault on the Mac. It speaks the contract
in docs/sync-contract.md, which restates section 4 of
docs/implementation-plan.md. Python 3.9 or later, standard library only.

Commands:
  ping   check the portal's env, week key and contract version
  pull   fetch overlays, resumes and events into the vault root
  run    record a run around a command, through POST /api/sync/v1/runs

See engine/README.md for the key file, the layout pull writes and exit codes.
"""

from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Deque, Dict, List, Mapping, Optional, Sequence, Set, TextIO, Tuple

CLIENT_VERSION = "0.1.0"

# Copies of src/lib/limits.ts. This file runs in the vault, away from the repo,
# so it cannot read the TypeScript; engine/tests/test_sync.py fails on drift.
CONTRACT_MAJOR = 1
MAX_BODY_BYTES = 4_194_304
EVENTS_PAGE_MAX = 500
RUN_LOG_TAIL_MAX_BYTES = 16_384
POSTINGS_PER_REQUEST = 200  # for push-postings, a later step

# Section 4.6: the first Sunday call can pay a Neon cold start.
TIMEOUT_SECONDS = 30
RETRY_DELAYS = (2, 4, 8)

# Section 4.2: events can commit out of id order, so each pull re-reads this
# many ids below the cursor and dedupes against state/seen-ids.
EVENT_REREAD_WINDOW = 500

API_PREFIX = "/api/sync/v1"
ENVS = ("production", "staging", "development")
RUN_KINDS = ("pull", "sweep", "fit", "week", "push", "build", "vault_create", "profiles", "purge")
RUN_STATUSES = ("running", "finished", "failed")

# Participant states from src/lib/contracts/states.ts in which the vault is
# being removed. Pull writes nothing for them, so it never recreates a folder
# Kem is deleting.
DELETION_STATES = ("deletion_requested", "vault_pending", "deleted")

ERROR_BODY_MAX_BYTES = 65_536

RESUME_SUFFIXES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/rtf": ".rtf",
    "text/plain": ".txt",
    "text/markdown": ".md",
}

SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
SHA256_HEX = re.compile(r"^[0-9a-f]{64}$")

Log = Callable[[str], None]


# ---------------------------------------------------------------- errors


class SyncError(Exception):
    """A failure with a plain message for Kem and an exit code for make."""

    exit_code = 1

    def __init__(self, message: str, status: Optional[int] = None, code: Optional[str] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


class ConfigError(SyncError):
    exit_code = 2


class EnvMismatch(SyncError):
    exit_code = 3


class ContractMismatch(SyncError):
    exit_code = 3


class Unauthorized(SyncError):
    exit_code = 4


class Conflict(SyncError):
    exit_code = 5


class TooLarge(SyncError):
    exit_code = 6


class ValidationFailed(SyncError):
    exit_code = 7


class NotFound(SyncError):
    exit_code = 8


class Unreachable(SyncError):
    exit_code = 9


class IntegrityError(SyncError):
    exit_code = 10


class LocalWriteError(SyncError):
    exit_code = 11


class PartialPull(SyncError):
    """Some participants failed; the rest of the pull, events included, went through."""

    def __init__(self, message: str, exit_code: int, counts: Dict[str, int]) -> None:
        super().__init__(message)
        self.exit_code = exit_code
        self.counts = counts


def _parse_envelope(body: bytes) -> Tuple[Optional[str], Optional[str], str]:
    """Reads the contract's error envelope: {"error": {"code", "message", "issues"}}."""
    try:
        data = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None, None, ""
    error = data.get("error") if isinstance(data, dict) else None
    if not isinstance(error, dict):
        return None, None, ""
    code = error.get("code") if isinstance(error.get("code"), str) else None
    message = error.get("message") if isinstance(error.get("message"), str) else None
    issues = error.get("issues")
    issues_text = ""
    if isinstance(issues, list) and issues:
        shown = [json.dumps(i, ensure_ascii=False) if not isinstance(i, str) else i for i in issues[:10]]
        more = f" (and {len(issues) - 10} more)" if len(issues) > 10 else ""
        issues_text = " Issues: " + "; ".join(shown) + more + "."
    return code, message, issues_text


def _envelope_message(body: bytes) -> Optional[str]:
    """The message from the contract's error envelope, or None."""
    try:
        parsed = json.loads(body.decode("utf-8")) if body else None
    except (UnicodeDecodeError, ValueError):
        return None
    error = parsed.get("error") if isinstance(parsed, dict) else None
    message = error.get("message") if isinstance(error, dict) else None
    return message if isinstance(message, str) and message else None


def error_for_status(where: str, base_url: str, status: int, body: bytes, location: Optional[str] = None) -> SyncError:
    """Maps a refusal to its own exception and message. None of these is retried."""
    code, server_message, issues = _parse_envelope(body)
    said = f" The portal said: {server_message}" if server_message else ""
    if code == "env_mismatch":
        return EnvMismatch(
            f"The portal at {base_url} refused {where} because the environment does not match (env_mismatch).{said} "
            "Check that SYNC_URL or the key file entry points at the portal --env names. Nothing was changed.",
            status,
            code,
        )
    if status == 401:
        return Unauthorized(
            f"The portal at {base_url} refused the sync token on {where} (401). The token does not match "
            "SYNC_TOKEN_SHA256 for that environment. Check that --env picks the right key file entry, "
            "or make a new token with pnpm sync:token and set its hash in Vercel.",
            status,
            code,
        )
    if status == 409:
        return Conflict(
            f"The portal refused {where} because it conflicts with the portal's current state (409).{said} "
            "Sending it again gives the same answer, so it was not retried.",
            status,
            code,
        )
    if status == 413:
        return TooLarge(
            f"The portal refused {where} as too large (413). Every sync body is capped at {MAX_BODY_BYTES:,} bytes.{said}",
            status,
            code,
        )
    if status == 422:
        return ValidationFailed(
            f"The portal rejected {where} as invalid (422).{said}{issues} Fix the data and send it again.",
            status,
            code,
        )
    if status == 404:
        return NotFound(
            f"The portal has nothing at {where} (404).{said} If the endpoint is new, the portal may not have deployed it yet.",
            status,
            code,
        )
    if 300 <= status < 400:
        target = f" to {location}" if location else ""
        return SyncError(
            f"The portal answered {where} with a redirect ({status}){target}. sync.py never follows redirects, "
            "so the token cannot leak to another host. Check SYNC_URL, and whether Vercel deployment protection "
            "is on for this host.",
            status,
            code,
        )
    return SyncError(f"The portal refused {where} with HTTP {status}.{said}{issues}", status, code)


# ---------------------------------------------------------------- HTTP


class Response:
    def __init__(self, where: str, status: int, headers: Any, body: bytes) -> None:
        self.where = where
        self.status = status
        self.headers = headers
        self.body = body

    def header(self, name: str) -> Optional[str]:
        value = self.headers.get(name) if self.headers is not None else None
        return value.strip() if isinstance(value, str) else None

    def json(self) -> Any:
        try:
            return json.loads(self.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise IntegrityError(
                f"The portal's answer to {self.where} is not JSON. If the host shows a login page, "
                "Vercel deployment protection may be on for it."
            ) from None


class _Retryable(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Turns every 3xx into an HTTPError, so the bearer token never follows a redirect."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


def _is_loopback(host: str) -> bool:
    return host in ("localhost", "::1") or host.startswith("127.")


def normalize_base_url(url: str) -> str:
    raw = (url or "").strip()
    parsed = urllib.parse.urlsplit(raw)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("https", "http") or not host:
        raise ConfigError(f"SYNC_URL {raw!r} is not a URL. Use the portal's base address, such as https://pathtoimpact.us.")
    if parsed.scheme == "http" and not _is_loopback(host):
        raise ConfigError(
            f"SYNC_URL {raw!r} uses plain http. Use https:// so the token is never sent in the clear; "
            "http:// is accepted only for localhost, such as a local next start."
        )
    if parsed.query or parsed.fragment:
        raise ConfigError(f"SYNC_URL {raw!r} has a query or fragment. Use the portal's base address only.")
    path = parsed.path.rstrip("/")
    if path.endswith(API_PREFIX):
        path = path[: -len(API_PREFIX)]
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))


def _describe(exc: BaseException, timeout: float) -> str:
    reason: Any = exc.reason if isinstance(exc, urllib.error.URLError) else exc
    if isinstance(reason, (socket.timeout, TimeoutError)) or "timed out" in str(reason):
        return f"no answer within {timeout:g} s"
    if isinstance(exc, urllib.error.URLError):
        return f"could not connect ({reason})"
    return f"{type(exc).__name__}: {exc}"


class Client:
    """One method per contract endpoint over a single retrying request()."""

    def __init__(
        self,
        base_url: str,
        token: str,
        timeout: float = TIMEOUT_SECONDS,
        sleep: Optional[Callable[[float], None]] = None,
        retry_delays: Sequence[float] = RETRY_DELAYS,
        log: Optional[Log] = None,
    ) -> None:
        self.base_url = normalize_base_url(base_url)
        if not token or not token.strip():
            raise ConfigError("The sync token is empty. Set SYNC_TOKEN or the token in the key file entry.")
        self.token = token.strip()
        self.timeout = timeout
        self.sleep = sleep if sleep is not None else time.sleep
        self.retry_delays = tuple(retry_delays)
        self.log: Log = log if log is not None else (lambda message: print(message, file=sys.stderr))
        handlers: List[Any] = [_NoRedirect()]
        if _is_loopback((urllib.parse.urlsplit(self.base_url).hostname or "").lower()):
            # A local next start must never go through a configured proxy.
            handlers.append(urllib.request.ProxyHandler({}))
        self._opener = urllib.request.build_opener(*handlers)

    # -- transport

    def request(
        self,
        method: str,
        path: str,
        query: Optional[Mapping[str, Any]] = None,
        body: Optional[bytes] = None,
        content_type: Optional[str] = None,
        accept: str = "application/json",
        max_response_bytes: int = MAX_BODY_BYTES,
    ) -> Response:
        where = f"{method} {path}"
        if body is not None and len(body) > MAX_BODY_BYTES:
            raise TooLarge(
                f"Refusing to send {where}: the body is {len(body):,} bytes and the sync contract caps every body "
                f"at {MAX_BODY_BYTES:,} bytes (4 MiB). Nothing was sent."
            )
        url = self.base_url + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Sync-Version": str(CONTRACT_MAJOR),
            "Accept": accept,
            "User-Agent": f"pathtoimpact-sync/{CLIENT_VERSION} python/{sys.version_info[0]}.{sys.version_info[1]}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        attempts = len(self.retry_delays) + 1
        last = ""
        for attempt in range(attempts):
            try:
                return self._send_once(where, url, method, headers, body, max_response_bytes)
            except _Retryable as failure:
                last = failure.reason
                if attempt == attempts - 1:
                    break
                delay = self.retry_delays[attempt]
                self.log(f"{where}: {last}; retry {attempt + 1} of {attempts - 1} in {delay:g} s")
                self.sleep(delay)
        raise Unreachable(f"Gave up on {where} at {self.base_url} after {attempts} attempts. Last failure: {last}.")

    def _send_once(
        self, where: str, url: str, method: str, headers: Dict[str, str], body: Optional[bytes], max_bytes: int
    ) -> Response:
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with self._opener.open(req, timeout=self.timeout) as resp:
                data = resp.read(max_bytes + 1)
                status = resp.getcode()
                resp_headers = resp.headers
        except urllib.error.HTTPError as exc:
            # HTTPError subclasses URLError, so it must be caught first.
            try:
                data = exc.read(ERROR_BODY_MAX_BYTES) or b""
            except (OSError, http.client.HTTPException):
                data = b""
            location = exc.headers.get("Location") if exc.headers is not None else None
            exc.close()
            if exc.code >= 500 or exc.code == 429:
                said = _envelope_message(data)
                raise _Retryable(f"HTTP {exc.code}" + (f" ({said})" if said else "")) from None
            raise error_for_status(where, self.base_url, exc.code, data, location) from None
        except urllib.error.URLError as exc:
            if isinstance(exc.reason, ssl.SSLCertVerificationError):
                raise SyncError(
                    f"Could not verify the TLS certificate of {self.base_url} ({exc.reason}). With the python.org "
                    "installer on a Mac, run Install Certificates.command from the Python folder in Applications once."
                ) from None
            raise _Retryable(_describe(exc, self.timeout)) from None
        except (OSError, http.client.HTTPException) as exc:
            # Timeouts and resets while reading the body land here.
            raise _Retryable(_describe(exc, self.timeout)) from None
        if len(data) > max_bytes:
            raise TooLarge(f"The portal sent more than {max_bytes:,} bytes for {where}; refusing it.")
        return Response(where, status, resp_headers, data)

    def get_json(self, path: str, query: Optional[Mapping[str, Any]] = None) -> Any:
        return self.request("GET", path, query=query).json()

    def send_json(self, method: str, path: str, payload: Any) -> Any:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        resp = self.request(method, path, body=body, content_type="application/json; charset=utf-8")
        return resp.json() if resp.body else None

    # -- endpoints, section 4.2

    def ping(self) -> Dict[str, Any]:
        return _expect_dict(self.get_json(API_PREFIX + "/ping"), "GET /ping")

    def participants(self, full: bool = False) -> List[Dict[str, Any]]:
        data = _expect_dict(self.get_json(API_PREFIX + "/participants", {"full": "1" if full else "0"}), "GET /participants")
        items = data.get("participants")
        if not isinstance(items, list) or not all(isinstance(p, dict) for p in items):
            raise IntegrityError("The portal's participants answer has no participants list.")
        return items

    def overlay(self, user_id: str, version: Optional[int] = None) -> Dict[str, Any]:
        path = f"{API_PREFIX}/participants/{urllib.parse.quote(user_id, safe='')}/overlay"
        query = {"version": version} if version is not None else None
        return _expect_dict(self.get_json(path, query), f"GET {path}")

    def resume(self, user_id: str) -> Response:
        path = f"{API_PREFIX}/participants/{urllib.parse.quote(user_id, safe='')}/resume"
        return self.request("GET", path, accept="*/*")

    def events(self, after: int, limit: int = EVENTS_PAGE_MAX) -> Dict[str, Any]:
        return _expect_dict(self.get_json(API_PREFIX + "/events", {"after": after, "limit": limit}), "GET /events")

    def post_run(self, run: Mapping[str, Any]) -> Any:
        if run.get("kind") not in RUN_KINDS:
            raise ConfigError(f"Unknown run kind {run.get('kind')!r}. Use one of: {', '.join(RUN_KINDS)}.")
        if run.get("status") not in RUN_STATUSES:
            raise ConfigError(f"Unknown run status {run.get('status')!r}. Use one of: {', '.join(RUN_STATUSES)}.")
        return self.send_json("POST", API_PREFIX + "/runs", dict(run))


def _expect_dict(value: Any, where: str) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise IntegrityError(f"The portal's answer to {where} is not a JSON object.")
    return value


def _as_int(value: Any) -> Optional[int]:
    """Event ids are bigserial, which the portal may send as a string."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


# ---------------------------------------------------------------- config


def load_config(env_name: str, key_file: Optional[str], environ: Mapping[str, str], log: Log) -> Tuple[str, str]:
    """Returns (url, token) from the key file entry for env_name, or from SYNC_URL and SYNC_TOKEN."""
    if key_file:
        path = Path(key_file).expanduser()
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            raise ConfigError(f"Could not read the key file {path}: {exc.strerror or exc}.") from None
        try:
            data = json.loads(text)
        except ValueError as exc:
            raise ConfigError(f"The key file {path} is not valid JSON ({exc}).") from None
        entry = data.get(env_name) if isinstance(data, dict) else None
        if not isinstance(entry, dict):
            raise ConfigError(f'The key file {path} has no "{env_name}" entry. It needs {{"{env_name}": {{"url": ..., "token": ...}}}}.')
        url, token = entry.get("url"), entry.get("token")
        if not isinstance(url, str) or not url.strip() or not isinstance(token, str) or not token.strip():
            raise ConfigError(f'The "{env_name}" entry in {path} needs a non-empty "url" and "token".')
        if os.name == "posix":
            try:
                if path.stat().st_mode & 0o077:
                    log(f"Warning: other users on this machine can read {path}. Run: chmod 600 {path}")
            except OSError:
                pass
        return url.strip(), token.strip()
    url = (environ.get("SYNC_URL") or "").strip()
    token = (environ.get("SYNC_TOKEN") or "").strip()
    if not url or not token:
        raise ConfigError(
            f'No portal is configured. Set SYNC_URL and SYNC_TOKEN, or pass --key-file with a "{env_name}" entry.'
        )
    return url, token


def check_ping(client: Client, expected_env: str) -> Dict[str, Any]:
    """Section 4.4: refuse to go on unless env and the contract major match."""
    info = client.ping()
    env = info.get("env")
    if env != expected_env:
        raise EnvMismatch(
            f"Refusing to continue: --env is {expected_env} but the portal at {client.base_url} says it is {env!r} "
            f"(env_mismatch). Nothing was pulled or pushed. Check that SYNC_URL or the key file's "
            f'"{expected_env}" entry points at the {expected_env} portal.'
        )
    version = info.get("contract_version")
    major = str(version).split(".")[0] if isinstance(version, str) else None
    if major != str(CONTRACT_MAJOR):
        raise ContractMismatch(
            f"The portal speaks sync contract {version!r} and this sync.py speaks {CONTRACT_MAJOR}.x. "
            "Copy the current engine/sync.py from the portal repository into the vault before syncing."
        )
    if not isinstance(info.get("week_key"), str):
        raise IntegrityError("The portal's ping answer has no week_key.")
    return info


# ---------------------------------------------------------------- local files


class Layout:
    """Where pull writes, relative to --root. Section 4.4 and WS4 step 7."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.vaults = root / "vaults"
        self.inbox = root / "inbox"
        self.state = root / "state"
        self.events_file = self.inbox / "events.jsonl"
        self.cursor_file = self.state / "cursor"
        self.seen_file = self.state / "seen-ids"
        self.participants_file = self.state / "participants.json"


def _fsync_dir(path: Path) -> None:
    # Makes a new or renamed directory entry durable; not every OS allows it.
    try:
        fd = os.open(str(path), os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def write_atomic(path: Path, data: bytes) -> None:
    """Write, fsync, then rename, so a crash leaves the old file or the new one, never half of either."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        with open(tmp, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(str(tmp), str(path))
    except BaseException:
        try:
            tmp.unlink()
        except OSError:
            pass
        raise
    _fsync_dir(path.parent)


def append_jsonl(path: Path, records: Sequence[Mapping[str, Any]]) -> None:
    """Append one JSON line per record and fsync. On failure, cut the file back so no torn line stays."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = "".join(
        json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for record in records
    ).encode("utf-8")
    existed = path.exists()
    if existed and path.is_file() and path.stat().st_size > 0:
        with open(path, "rb") as handle:
            handle.seek(-1, os.SEEK_END)
            if handle.read(1) != b"\n":
                payload = b"\n" + payload  # an earlier crash left a torn line; start clean
    with open(path, "ab") as handle:
        start = handle.tell()
        try:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        except BaseException:
            try:
                handle.truncate(start)
                handle.flush()
                os.fsync(handle.fileno())
            except OSError:
                pass
            raise
    if not existed:
        _fsync_dir(path.parent)


def read_cursor(layout: Layout) -> int:
    try:
        text = layout.cursor_file.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return 0
    value = _as_int(text)
    if value is None:
        raise LocalWriteError(
            f"{layout.cursor_file} holds {text!r}, which is not an event id. Fix it, or delete it to replay every "
            "event, which the engine applies idempotently by event id."
        )
    return value


def read_seen(layout: Layout) -> Set[int]:
    try:
        lines = layout.seen_file.read_text(encoding="utf-8").split()
    except FileNotFoundError:
        return set()
    seen: Set[int] = set()
    for line in lines:
        value = _as_int(line)
        if value is None:
            raise LocalWriteError(f"{layout.seen_file} has a line that is not an event id: {line!r}.")
        seen.add(value)
    return seen


def _read_json_file(path: Path) -> Dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except ValueError:
        raise LocalWriteError(f"{path} is not valid JSON. Delete it and pull again; files are fetched afresh.") from None
    return data if isinstance(data, dict) else {}


def _write_json_file(path: Path, data: Any) -> None:
    write_atomic(path, (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8"))


def safe_name(value: Any, what: str) -> str:
    """A vault folder name taken from the portal must stay one path component inside vaults/."""
    if not isinstance(value, str) or not SAFE_NAME.match(value) or ".." in value:
        raise IntegrityError(f"Refusing {what} {value!r}: it must be letters, digits, dot, dash or underscore.")
    return value


def resume_suffix(mime: Any, filename: Any) -> str:
    if isinstance(mime, str) and mime.split(";")[0].strip().lower() in RESUME_SUFFIXES:
        return RESUME_SUFFIXES[mime.split(";")[0].strip().lower()]
    if isinstance(filename, str):
        suffix = Path(filename).suffix.lower()
        if re.match(r"^\.[a-z0-9]{1,8}$", suffix):
            return suffix
    return ".bin"


# ---------------------------------------------------------------- pull


def _sha(value: Any, what: str) -> str:
    text = value.strip().lower() if isinstance(value, str) else ""
    if not SHA256_HEX.match(text):
        raise IntegrityError(f"The portal sent {what} without a valid sha256.")
    return text


def overlay_sha256(obj: Any) -> str:
    """The contract's overlay hash: keys sorted at every level, no whitespace, UTF-8."""
    text = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def pull_overlay(client: Client, user_id: str, listed: Mapping[str, Any], vault_dir: Path, entry: Dict[str, Any], log: Log) -> bool:
    """Writes overlay.json when the approved version is newer than the local copy. Returns True when written."""
    version = _as_int(listed.get("version"))
    if version is None:
        raise IntegrityError(f"The portal listed an overlay for {user_id} without a version.")
    sha = _sha(listed.get("sha256"), f"the overlay for {user_id}")
    target = vault_dir / "overlay.json"
    have = entry.get("overlay") if isinstance(entry.get("overlay"), dict) else {}
    have_version = _as_int(have.get("version"))
    if target.is_file() and have.get("dir") == vault_dir.name and have_version is not None:
        if have_version == version and have.get("sha256") == sha:
            return False
        if have_version > version:
            log(f"{user_id}: the portal lists overlay version {version}, older than the local {have_version}; keeping the local copy.")
            return False
        if have_version == version:
            log(f"{user_id}: overlay version {version} has a new sha256 on the portal; fetching it again.")
    answer = client.overlay(user_id, version)
    if answer.get("user_id") != user_id or _as_int(answer.get("version")) != version:
        raise IntegrityError(f"The portal answered the overlay request for {user_id} version {version} with another overlay.")
    if _sha(answer.get("sha256"), f"the overlay for {user_id}") != sha:
        raise IntegrityError(
            f"The overlay for {user_id} version {version} has a different sha256 from the participants list. Nothing was written."
        )
    if not isinstance(answer.get("json"), dict):
        raise IntegrityError(f"The overlay for {user_id} version {version} has no json object.")
    if overlay_sha256(answer["json"]) != sha:
        raise IntegrityError(
            f"The overlay for {user_id} version {version} does not hash to its sha256 under the contract's rule. Nothing was written."
        )
    try:
        _write_json_file(target, answer["json"])
    except OSError as exc:
        raise LocalWriteError(f"Could not write {target}: {exc.strerror or exc}.") from None
    entry["overlay"] = {"dir": vault_dir.name, "version": version, "sha256": sha, "approved_at": answer.get("approved_at")}
    return True


def pull_resume(client: Client, user_id: str, listed: Mapping[str, Any], vault_dir: Path, entry: Dict[str, Any], log: Log) -> bool:
    """Downloads the resume when its sha256 differs from the local copy, checked against X-Sha256."""
    sha = _sha(listed.get("sha256"), f"the resume for {user_id}")
    byte_length = _as_int(listed.get("byte_length"))
    if byte_length is not None and byte_length > MAX_BODY_BYTES:
        raise TooLarge(f"The resume for {user_id} is listed at {byte_length:,} bytes, over the {MAX_BODY_BYTES:,}-byte cap. Not downloaded.")
    name = "resume" + resume_suffix(listed.get("mime"), listed.get("filename"))
    target = vault_dir / name
    have = entry.get("resume") if isinstance(entry.get("resume"), dict) else {}
    same_dir = have.get("dir") == vault_dir.name
    if target.is_file() and same_dir and have.get("file") == name and have.get("sha256") == sha:
        return False
    resp = client.resume(user_id)
    header = (resp.header("X-Sha256") or "").lower()
    actual = hashlib.sha256(resp.body).hexdigest()
    if not header:
        raise IntegrityError(f"The portal sent the resume for {user_id} without an X-Sha256 header. Nothing was written.")
    if header != actual:
        raise IntegrityError(
            f"The resume for {user_id} failed its checksum: X-Sha256 says {header} but the bytes hash to {actual}. "
            "Nothing was written; the next pull tries again."
        )
    if actual != sha:
        # A re-upload between the list and the download; the file itself checked out.
        log(f"{user_id}: the resume changed while pulling; keeping the newer file, sha256 {actual}.")
    try:
        write_atomic(target, resp.body)
        old = have.get("file")
        if same_dir and isinstance(old, str) and old != name and SAFE_NAME.match(old):
            stale = vault_dir / old
            if stale.is_file():
                stale.unlink()  # a file this client wrote; leaving it could feed the engine the old resume
    except OSError as exc:
        raise LocalWriteError(f"Could not write {target}: {exc.strerror or exc}.") from None
    entry["resume"] = {
        "dir": vault_dir.name,
        "id": listed.get("id"),
        "sha256": actual,
        "file": name,
        "filename": listed.get("filename"),
        "mime": listed.get("mime"),
        "byte_length": len(resp.body),
    }
    return True


def pull_participants(client: Client, layout: Layout, log: Log, problems: List[SyncError]) -> Dict[str, int]:
    """Section 4.4 first half. Per-participant failures go to problems so one bad file does not block the rest."""
    counts = {"participants": 0, "skipped": 0, "overlays_written": 0, "resumes_written": 0}
    items = client.participants(full=False)
    counts["participants"] = len(items)
    local = _read_json_file(layout.participants_file)
    for item in items:
        user_id = item.get("user_id")
        if not isinstance(user_id, str) or not user_id:
            raise IntegrityError("The portal listed a participant without a user_id.")
        if item.get("consent_stale") is True:
            log(f"{user_id}: pilot consent is not the current version, so nothing is pulled for them.")
            counts["skipped"] += 1
            continue
        if item.get("state") in DELETION_STATES:
            log(f"{user_id}: state is {item.get('state')}, so nothing is pulled for them.")
            counts["skipped"] += 1
            continue
        try:
            dir_name = safe_name(item.get("vault_slug") or user_id, "vault name")
        except IntegrityError as exc:
            log(f"{user_id}: {exc.message}")
            problems.append(exc)
            continue
        vault_dir = layout.vaults / dir_name
        entry = local.get(user_id) if isinstance(local.get(user_id), dict) else {}
        if entry.get("dir") not in (None, dir_name):
            log(f"{user_id}: the vault is now vaults/{dir_name}; vaults/{entry.get('dir')} holds an older copy you can remove.")
        entry["dir"] = dir_name
        local[user_id] = entry
        # Overlay and resume fail independently, and whatever was written is
        # recorded either way, so the next pull does not fetch it again.
        for kind, puller, key in (("overlay", pull_overlay, "overlays_written"), ("resume", pull_resume, "resumes_written")):
            listed = item.get(kind)
            if not isinstance(listed, dict):
                continue
            try:
                if puller(client, user_id, listed, vault_dir, entry, log):
                    counts[key] += 1
            except (IntegrityError, NotFound, TooLarge, LocalWriteError) as exc:
                log(f"{user_id}: {exc.message}")
                problems.append(exc)
        try:
            _write_json_file(layout.participants_file, local)
        except OSError as exc:
            raise LocalWriteError(f"Could not write {layout.participants_file}: {exc.strerror or exc}.") from None
    return counts


def _check_events(page: Mapping[str, Any]) -> List[Dict[str, Any]]:
    raw = page.get("events")
    if not isinstance(raw, list):
        raise IntegrityError("The portal's events answer has no events list.")
    events: List[Dict[str, Any]] = []
    for item in raw:
        event_id = _as_int(item.get("id")) if isinstance(item, dict) else None
        if event_id is None or not isinstance(item.get("kind"), str):
            raise IntegrityError(f"The portal sent an event without an id or kind: {item!r}.")
        event = dict(item)
        event["id"] = event_id
        events.append(event)
    return events


def pull_events(
    client: Client,
    layout: Layout,
    on_events: Optional[Callable[[List[Dict[str, Any]]], None]] = None,
) -> Tuple[int, int]:
    """Reads events after the cursor, page by page, and returns (appended, cursor).

    Each page's new events go to on_events, by default an fsynced append to
    inbox/events.jsonl. state/seen-ids and then state/cursor are written only
    after on_events returns, so a failed write never skips an event.
    """
    deliver = on_events if on_events is not None else (lambda batch: append_jsonl(layout.events_file, batch))
    cursor = read_cursor(layout)
    seen = read_seen(layout)
    after = max(0, cursor - EVENT_REREAD_WINDOW)
    appended = 0
    while True:
        page = client.events(after, EVENTS_PAGE_MAX)
        events = _check_events(page)
        fresh: List[Dict[str, Any]] = []
        fresh_ids: Set[int] = set()
        for event in events:
            if event["id"] in seen or event["id"] in fresh_ids:
                continue
            fresh.append(event)
            fresh_ids.add(event["id"])
        page_max = max((e["id"] for e in events), default=after)
        next_after = _as_int(page.get("next_after"))
        if next_after is None:
            next_after = page_max
        if fresh:
            try:
                deliver(fresh)
            except OSError as exc:
                raise LocalWriteError(
                    f"Could not write {layout.events_file}: {exc.strerror or exc}. The cursor stays at {cursor}, "
                    "so the next pull fetches these events again."
                ) from None
        new_cursor = max(cursor, next_after, page_max)
        if fresh or new_cursor != cursor:
            seen.update(fresh_ids)
            # Ids at or below new_cursor - window are never re-read, so they need not be remembered.
            seen = {i for i in seen if i > new_cursor - EVENT_REREAD_WINDOW}
            try:
                write_atomic(layout.seen_file, "".join(f"{i}\n" for i in sorted(seen)).encode("ascii"))
                write_atomic(layout.cursor_file, f"{new_cursor}\n".encode("ascii"))
            except OSError as exc:
                raise LocalWriteError(f"Could not write {layout.state}: {exc.strerror or exc}.") from None
        cursor = new_cursor
        appended += len(fresh)
        if page.get("has_more") is not True or not events or next_after <= after:
            break
        after = next_after
    return appended, cursor


# ---------------------------------------------------------------- runs


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clip_tail(text: str, limit: int = RUN_LOG_TAIL_MAX_BYTES) -> str:
    """The last `limit` bytes of text as UTF-8, never splitting a character."""
    encoded = text.encode("utf-8")
    if len(encoded) <= limit:
        return text
    return encoded[-limit:].decode("utf-8", errors="ignore")


class RunRecorder:
    """Records a run as running, then finished or failed. Usable as a context manager."""

    def __init__(
        self,
        client: Client,
        kind: str,
        week_key: str,
        user_id: Optional[str] = None,
        engine_version: str = f"sync.py {CLIENT_VERSION}",
        log: Optional[Log] = None,
    ) -> None:
        self.client = client
        self.log: Log = log if log is not None else client.log
        self.body: Dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "kind": kind,
            "week_key": week_key,
            "status": "running",
            "started_at": _now_iso(),
            "host": socket.gethostname(),
            "engine_version": engine_version,
        }
        if user_id:
            self.body["user_id"] = user_id
        self.counts: Dict[str, Any] = {}

    @property
    def id(self) -> str:
        return str(self.body["id"])

    def start(self) -> None:
        self.client.post_run(self.body)

    def finish(self, status: str = "finished", log_tail: str = "") -> None:
        body = dict(self.body, status=status, finished_at=_now_iso())
        if self.counts:
            body["counts"] = dict(self.counts)
        if log_tail:
            body["log_tail"] = clip_tail(log_tail)
        self.client.post_run(body)

    def __enter__(self) -> "RunRecorder":
        self.start()
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> bool:
        if exc_type is None:
            self.finish("finished")
            return False
        message = exc.message if isinstance(exc, SyncError) else f"{exc_type.__name__}: {exc}"
        try:
            self.finish("failed", log_tail=message)
        except SyncError as record_error:
            self.log(f"Could not record the failed run {self.id}: {record_error.message}")
        return False  # never swallow the original failure


def run_command(client: Client, kind: str, week_key: str, command: Sequence[str], user_id: Optional[str], out: TextIO) -> int:
    """Runs command between a running and a finished or failed run record. Returns its exit code."""
    recorder = RunRecorder(client, kind, week_key, user_id=user_id)
    recorder.start()
    tail: Deque[bytes] = deque()
    kept = 0

    def record_failure(note: str) -> None:
        # Recording must not hide the failure that is already on its way out.
        try:
            recorder.finish("failed", log_tail=b"".join(tail).decode("utf-8", errors="replace") + note)
        except SyncError as record_error:
            recorder.log(f"Could not record the failed run {recorder.id}: {record_error.message}")

    try:
        proc = subprocess.Popen(list(command), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    except OSError as exc:
        record_failure(f"could not start {command[0]}: {exc}")
        raise SyncError(f"Could not start {command[0]}: {exc.strerror or exc}. The run is recorded as failed.") from None
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            out.write(line.decode("utf-8", errors="replace"))
            out.flush()
            tail.append(line)
            kept += len(line)
            while kept > RUN_LOG_TAIL_MAX_BYTES and len(tail) > 1:
                kept -= len(tail.popleft())
        code = proc.wait()
    except BaseException as exc:
        proc.kill()
        proc.wait()
        record_failure(f"\n{type(exc).__name__}")
        raise
    recorder.counts["exit_code"] = code
    recorder.finish("finished" if code == 0 else "failed", log_tail=b"".join(tail).decode("utf-8", errors="replace"))
    return code


# ---------------------------------------------------------------- commands


def cmd_ping(client: Client, args: argparse.Namespace, out: TextIO, log: Log) -> int:
    info = check_ping(client, args.env)
    print(f"env: {info.get('env')}", file=out)
    print(f"week_key: {info.get('week_key')}", file=out)
    print(f"contract_version: {info.get('contract_version')}", file=out)
    for key in ("portal_commit", "last_pull_at", "last_push_at"):
        if info.get(key) is not None:
            print(f"{key}: {info[key]}", file=out)
    counts = info.get("counts")
    if isinstance(counts, dict):
        for key in sorted(counts):
            print(f"counts.{key}: {counts[key]}", file=out)
    return 0


def _pull(client: Client, layout: Layout, log: Log) -> Dict[str, int]:
    problems: List[SyncError] = []
    counts = pull_participants(client, layout, log, problems)
    appended, cursor = pull_events(client, layout)
    counts["events_appended"] = appended
    counts["cursor"] = cursor
    if problems:
        raise PartialPull(
            f"{len(problems)} file(s) could not be pulled; everything else, events included, was written. "
            "The messages above say which and why.",
            problems[0].exit_code,
            counts,
        )
    return counts


def cmd_pull(client: Client, args: argparse.Namespace, out: TextIO, log: Log) -> int:
    info = check_ping(client, args.env)
    layout = Layout(Path(args.root).expanduser())
    if args.no_record:
        counts = _pull(client, layout, log)
    else:
        with RunRecorder(client, "pull", info["week_key"], log=log) as recorder:
            try:
                counts = _pull(client, layout, log)
            except PartialPull as partial:
                recorder.counts.update(partial.counts)
                raise
            recorder.counts.update(counts)
    print(f"pulled from {info['env']} for week {info['week_key']} into {layout.root}", file=out)
    print(f"participants: {counts['participants']} listed, {counts['skipped']} skipped", file=out)
    print(f"overlays written: {counts['overlays_written']}", file=out)
    print(f"resumes written: {counts['resumes_written']}", file=out)
    print(f"events appended: {counts['events_appended']}, cursor {counts['cursor']}", file=out)
    return 0


def cmd_run(client: Client, args: argparse.Namespace, out: TextIO, log: Log) -> int:
    if not args.command:
        raise ConfigError("Give the command after --, for example: sync.py run --env production --kind sweep -- make sweep")
    info = check_ping(client, args.env)
    return run_command(client, args.kind, info["week_key"], args.command, args.user_id, out)


def build_parser(environ: Mapping[str, str]) -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--env", required=True, choices=ENVS, help="the portal environment you expect; ping must agree")
    common.add_argument(
        "--key-file",
        default=environ.get("SYNC_KEY_FILE") or None,
        help="JSON key file with production and staging entries (default: $SYNC_KEY_FILE, else SYNC_URL and SYNC_TOKEN)",
    )
    parser = argparse.ArgumentParser(prog="sync.py", description="Sync client for the pathtoimpact.us portal, contract v1.")
    parser.add_argument("--version", action="version", version=f"sync.py {CLIENT_VERSION}, contract {CONTRACT_MAJOR}")
    sub = parser.add_subparsers(dest="command_name", metavar="command")
    sub.required = True
    sub.add_parser("ping", parents=[common], help="check env, week key and contract version")
    pull = sub.add_parser("pull", parents=[common], help="fetch overlays, resumes and events")
    pull.add_argument("--root", default=environ.get("SYNC_ROOT") or ".", help="where vaults/, inbox/ and state/ live (default: $SYNC_ROOT, else .)")
    pull.add_argument("--no-record", action="store_true", help="do not record the pull as a run")
    run = sub.add_parser("run", parents=[common], help="record a run around a command given after --")
    run.add_argument("--kind", required=True, choices=RUN_KINDS)
    run.add_argument("--user-id", default=None)
    return parser


COMMANDS: Dict[str, Callable[[Client, argparse.Namespace, TextIO, Log], int]] = {
    "ping": cmd_ping,
    "pull": cmd_pull,
    "run": cmd_run,
}


def main(
    argv: Optional[Sequence[str]] = None,
    environ: Optional[Mapping[str, str]] = None,
    sleep: Optional[Callable[[float], None]] = None,
    out: Optional[TextIO] = None,
    err: Optional[TextIO] = None,
) -> int:
    args_list = list(sys.argv[1:] if argv is None else argv)
    env_map: Mapping[str, str] = os.environ if environ is None else environ
    stdout = out if out is not None else sys.stdout
    stderr = err if err is not None else sys.stderr
    # Split at "--" here rather than with argparse.REMAINDER, whose handling of
    # "--" differs between Python versions.
    command: List[str] = []
    if "--" in args_list:
        index = args_list.index("--")
        args_list, command = args_list[:index], args_list[index + 1 :]
    parser = build_parser(env_map)
    args = parser.parse_args(args_list)
    if command and args.command_name != "run":
        parser.error(f"only run takes a command after --, not {args.command_name}")
    args.command = command

    def log(message: str) -> None:
        print(message, file=stderr)

    try:
        url, token = load_config(args.env, args.key_file, env_map, log)
        client = Client(url, token, sleep=sleep, log=log)
        return COMMANDS[args.command_name](client, args, stdout, log)
    except SyncError as exc:
        print(f"sync.py: {exc.message}", file=stderr)
        return exc.exit_code
    except KeyboardInterrupt:
        print("sync.py: interrupted", file=stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
