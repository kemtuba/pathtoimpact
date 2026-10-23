"""Tests for engine/sync.py against a local mock portal. unittest only, Python 3.9 or later."""

from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import os
import re
import shutil
import sys
import tempfile
import threading
import unittest
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlsplit

ENGINE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ENGINE_DIR.parent


def _load_sync() -> Any:
    # Loaded by path so the tests run the same whether or not engine/ is a package.
    spec = importlib.util.spec_from_file_location("sync", str(ENGINE_DIR / "sync.py"))
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["sync"] = module
    spec.loader.exec_module(module)
    return module


sync = _load_sync()

TOKEN = "test-token-not-real"
Reply = Tuple[int, Dict[str, str], bytes]


def json_reply(status: int, payload: Any, headers: Optional[Dict[str, str]] = None) -> Reply:
    out = {"Content-Type": "application/json"}
    out.update(headers or {})
    return status, out, json.dumps(payload).encode("utf-8")


def error_reply(status: int, code: str, message: str) -> Reply:
    return json_reply(status, {"error": {"code": code, "message": message}})


def ping_body(env: str = "staging", version: str = "1.0.0") -> Dict[str, Any]:
    return {"ok": True, "at": "2026-10-25T22:00:00.000Z", "env": env, "contract_version": version, "week_key": "2026-W44"}


class Recorded:
    def __init__(self, method: str, path: str, query: Dict[str, List[str]], headers: Dict[str, str], body: bytes) -> None:
        self.method = method
        self.path = path
        self.query = query
        self.headers = headers
        self.body = body

    def json(self) -> Any:
        return json.loads(self.body.decode("utf-8"))


class MockPortal:
    """A threaded http.server on 127.0.0.1 with per-test routes and a request log."""

    def __init__(self) -> None:
        self.routes: Dict[Tuple[str, str], Callable[[Recorded], Reply]] = {}
        self.requests: List[Recorded] = []
        self.lock = threading.Lock()
        portal = self

        class Handler(BaseHTTPRequestHandler):
            def _handle(self) -> None:
                parts = urlsplit(self.path)
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                req = Recorded(self.command, parts.path, parse_qs(parts.query), dict(self.headers.items()), body)
                with portal.lock:
                    portal.requests.append(req)
                    route = portal.routes.get((self.command, parts.path))
                status, headers, payload = route(req) if route else error_reply(404, "not_found", "no route")
                self.send_response(status)
                for key, value in headers.items():
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            do_GET = _handle
            do_POST = _handle
            do_PUT = _handle

            def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
        self.thread.start()

    @property
    def url(self) -> str:
        host, port = self.server.server_address[:2]
        return f"http://{host}:{port}"

    def route(self, method: str, path: str, handler: Callable[[Recorded], Reply]) -> None:
        self.routes[(method, path)] = handler

    def sequence(self, method: str, path: str, replies: List[Reply]) -> None:
        """Serves replies in order, repeating the last one."""
        queue = list(replies)

        def handler(_: Recorded) -> Reply:
            return queue.pop(0) if len(queue) > 1 else queue[0]

        self.route(method, path, handler)

    def hits(self, method: str, path: str) -> List[Recorded]:
        with self.lock:
            return [r for r in self.requests if r.method == method and r.path == path]

    def close(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)


class SyncTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.portal = MockPortal()
        self.addCleanup(self.portal.close)
        self.sleeps: List[float] = []
        self.tmp = Path(tempfile.mkdtemp(prefix="sync-test-"))
        self.addCleanup(shutil.rmtree, str(self.tmp), True)
        self.environ = {"SYNC_URL": self.portal.url, "SYNC_TOKEN": TOKEN}

    def run_main(self, *argv: str) -> Tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = sync.main(list(argv), environ=self.environ, sleep=self.sleeps.append, out=out, err=err)
        return code, out.getvalue(), err.getvalue()

    def client(self) -> Any:
        return sync.Client(self.portal.url, TOKEN, sleep=self.sleeps.append, log=lambda _m: None)


class PingTests(SyncTestCase):
    def test_ping_success_prints_env_week_and_version(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("staging")))
        code, out, err = self.run_main("ping", "--env", "staging")
        self.assertEqual(code, 0, err)
        self.assertIn("env: staging", out)
        self.assertIn("week_key: 2026-W44", out)
        self.assertIn("contract_version: 1.0.0", out)
        (req,) = self.portal.requests
        self.assertEqual(req.headers.get("Authorization"), f"Bearer {TOKEN}")
        self.assertEqual(req.headers.get("X-Sync-Version"), "1")

    def test_ping_refuses_env_mismatch(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("production")))
        code, out, err = self.run_main("ping", "--env", "staging")
        self.assertEqual(code, sync.EnvMismatch.exit_code)
        self.assertNotEqual(code, 0)
        self.assertIn("env_mismatch", err)
        self.assertIn("'production'", err)
        self.assertEqual(out, "")

    def test_ping_refuses_other_contract_major(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("staging", "2.0.0")))
        code, _out, err = self.run_main("ping", "--env", "staging")
        self.assertEqual(code, sync.ContractMismatch.exit_code)
        self.assertIn("contract", err)


class RetryAndErrorTests(SyncTestCase):
    def test_503_then_200_is_retried_and_succeeds(self) -> None:
        self.portal.sequence(
            "GET",
            "/api/sync/v1/ping",
            [error_reply(503, "unavailable", "cold start"), json_reply(200, ping_body("staging"))],
        )
        code, out, err = self.run_main("ping", "--env", "staging")
        self.assertEqual(code, 0, err)
        self.assertIn("env: staging", out)
        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/ping")), 2)
        self.assertEqual(self.sleeps, [2])
        self.assertIn("retry 1 of 3", err)

    def test_gives_up_after_three_retries_with_2_4_8_backoff(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: error_reply(503, "unavailable", "down"))
        with self.assertRaises(sync.Unreachable):
            self.client().ping()
        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/ping")), 4)
        self.assertEqual(self.sleeps, [2, 4, 8])

    def test_429_is_retried(self) -> None:
        self.portal.sequence(
            "GET", "/api/sync/v1/ping", [error_reply(429, "rate", "slow down"), json_reply(200, ping_body())]
        )
        self.assertEqual(self.client().ping()["env"], "staging")
        self.assertEqual(self.sleeps, [2])

    def test_401_is_not_retried_and_gives_the_401_message(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: error_reply(401, "unauthorized", "Missing or wrong sync token."))
        code, _out, err = self.run_main("ping", "--env", "staging")
        self.assertEqual(code, sync.Unauthorized.exit_code)
        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/ping")), 1)
        self.assertEqual(self.sleeps, [])
        self.assertIn("refused the sync token", err)
        self.assertIn("(401)", err)

    def test_other_4xx_have_distinct_messages_and_are_not_retried(self) -> None:
        cases = [
            (409, "conflict", sync.Conflict, "conflicts with the portal's current state (409)"),
            (413, "too_large", sync.TooLarge, "as too large (413)"),
            (422, "validation", sync.ValidationFailed, "as invalid (422)"),
            (400, "env_mismatch", sync.EnvMismatch, "(env_mismatch)"),
        ]
        messages = set()
        for status, code, exc_type, phrase in cases:
            with self.subTest(status=status, code=code):
                self.portal.requests.clear()
                self.portal.route("POST", "/api/sync/v1/runs", lambda _r, s=status, c=code: error_reply(s, c, "server says no"))
                with self.assertRaises(exc_type) as caught:
                    self.client().post_run({"id": "r1", "kind": "pull", "status": "running", "week_key": "2026-W44"})
                self.assertIn(phrase, caught.exception.message)
                self.assertIn("server says no", caught.exception.message)
                self.assertEqual(len(self.portal.requests), 1)
                messages.add(caught.exception.message)
        self.assertEqual(self.sleeps, [])
        self.assertEqual(len(messages), len(cases))

    def test_body_over_the_cap_is_refused_without_a_request(self) -> None:
        client = self.client()
        with self.assertRaises(sync.TooLarge) as caught:
            client.request("POST", "/api/sync/v1/runs", body=b"x" * (sync.MAX_BODY_BYTES + 1), content_type="application/json")
        self.assertIn("Nothing was sent", caught.exception.message)
        self.assertIn("4,194,304", caught.exception.message)
        self.assertEqual(self.portal.requests, [])
        self.assertEqual(self.sleeps, [])

    def test_body_at_the_cap_is_sent(self) -> None:
        self.portal.route("POST", "/api/sync/v1/runs", lambda _r: json_reply(200, {"ok": True}))
        resp = self.client().request("POST", "/api/sync/v1/runs", body=b"x" * sync.MAX_BODY_BYTES)
        self.assertEqual(resp.status, 200)
        self.assertEqual(len(self.portal.requests[0].body), sync.MAX_BODY_BYTES)

    def test_redirect_is_refused_and_not_followed(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: (307, {"Location": "https://example.com/login"}, b""))
        with self.assertRaises(sync.SyncError) as caught:
            self.client().ping()
        self.assertIn("redirect", caught.exception.message)
        self.assertEqual(len(self.portal.requests), 1)


class ConfigTests(SyncTestCase):
    def test_key_file_entry_is_selected_by_env(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("staging")))
        key_file = self.tmp / "sync-keys.json"
        key_file.write_text(
            json.dumps(
                {
                    "production": {"url": "https://pathtoimpact.invalid", "token": "prod-token"},
                    "staging": {"url": self.portal.url, "token": "staging-token"},
                }
            ),
            encoding="utf-8",
        )
        os.chmod(str(key_file), 0o600)
        self.environ = {}
        code, out, err = self.run_main("ping", "--env", "staging", "--key-file", str(key_file))
        self.assertEqual(code, 0, err)
        self.assertIn("env: staging", out)
        self.assertEqual(self.portal.requests[0].headers.get("Authorization"), "Bearer staging-token")
        self.assertNotIn("Warning", err)

    def test_missing_configuration_is_a_plain_error(self) -> None:
        self.environ = {}
        code, _out, err = self.run_main("ping", "--env", "production")
        self.assertEqual(code, sync.ConfigError.exit_code)
        self.assertIn("SYNC_URL and SYNC_TOKEN", err)

    def test_plain_http_is_refused_for_a_remote_host(self) -> None:
        with self.assertRaises(sync.ConfigError):
            sync.Client("http://pathtoimpact.us", TOKEN)
        self.assertEqual(sync.normalize_base_url("https://pathtoimpact.us/api/sync/v1/"), "https://pathtoimpact.us")


OVERLAY_JSON = {"primary_profile_id": "V3", "name_printed": "Test Persona", "email": "persona@example.invalid"}
OVERLAY_SHA = hashlib.sha256(json.dumps(OVERLAY_JSON, sort_keys=True).encode("utf-8")).hexdigest()
OVERLAY_B_JSON = {"primary_profile_id": "V4", "name_printed": "Second Persona"}
OVERLAY_B_SHA = hashlib.sha256(json.dumps(OVERLAY_B_JSON, sort_keys=True).encode("utf-8")).hexdigest()
RESUME_BYTES = b"%PDF-1.4\n% synthetic test resume\n%%EOF\n"
RESUME_SHA = hashlib.sha256(RESUME_BYTES).hexdigest()


def event(event_id: int, kind: str = "decision.recorded") -> Dict[str, Any]:
    return {"id": str(event_id), "kind": kind, "user_id": "u_alpha", "at": "2026-10-25T21:00:00Z", "payload": {"n": event_id}}


class PullTests(SyncTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.root = self.tmp / "vault-root"
        self.events: List[Dict[str, Any]] = [event(1, "overlay.approved"), event(2), event(3)]
        self.page_size = 2  # smaller than the client's limit, so paging is exercised
        self.resume_header_sha = RESUME_SHA
        self.runs: List[Dict[str, Any]] = []
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("staging")))
        self.portal.route("GET", "/api/sync/v1/participants", self._participants)
        self.portal.route("GET", "/api/sync/v1/participants/u_alpha/overlay", self._overlay("u_alpha", 2, OVERLAY_SHA, OVERLAY_JSON))
        self.portal.route("GET", "/api/sync/v1/participants/u_beta/overlay", self._overlay("u_beta", 1, OVERLAY_B_SHA, OVERLAY_B_JSON))
        self.portal.route("GET", "/api/sync/v1/participants/u_alpha/resume", self._resume)
        self.portal.route("GET", "/api/sync/v1/events", self._events)
        self.portal.route("POST", "/api/sync/v1/runs", self._run)

    def _participants(self, req: Recorded) -> Reply:
        assert req.query.get("full") == ["0"], req.query
        return json_reply(
            200,
            {
                "participants": [
                    {
                        "user_id": "u_alpha",
                        "vault_slug": "alpha-v3",
                        "state": "active",
                        "timezone": "America/New_York",
                        "profiles": [{"id": "V3", "is_primary": True}],
                        "overlay": {"version": 2, "sha256": OVERLAY_SHA, "approved_at": "2026-10-24T15:00:00Z"},
                        "resume": {
                            "id": "res_1",
                            "sha256": RESUME_SHA,
                            "mime": "application/pdf",
                            "byte_length": len(RESUME_BYTES),
                            "filename": "Test Persona Resume.pdf",
                        },
                        "masters": [],
                        "consents": {"pilot": "pilot.v1", "retention_days": 90},
                    },
                    {
                        "user_id": "u_beta",
                        "vault_slug": None,
                        "state": "intake_approved",
                        "overlay": {"version": 1, "sha256": OVERLAY_B_SHA, "approved_at": "2026-10-24T16:00:00Z"},
                        "resume": None,
                    },
                    {"user_id": "u_gamma", "vault_slug": "gamma", "state": "active", "consent_stale": True, "overlay": None, "resume": None},
                    {"user_id": "u_delta", "vault_slug": "delta", "state": "deletion_requested", "overlay": None, "resume": None},
                ]
            },
        )

    def _overlay(self, user_id: str, version: int, sha: str, body: Dict[str, Any]) -> Callable[[Recorded], Reply]:
        def handler(req: Recorded) -> Reply:
            assert req.query.get("version") == [str(version)], req.query
            return json_reply(200, {"user_id": user_id, "version": version, "sha256": sha, "json": body, "approved_at": "2026-10-24T15:00:00Z"})

        return handler

    def _resume(self, _req: Recorded) -> Reply:
        headers = {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="Test Persona Resume.pdf"',
            "X-Sha256": self.resume_header_sha,
        }
        return 200, headers, RESUME_BYTES

    def _events(self, req: Recorded) -> Reply:
        after = int(req.query["after"][0])
        limit = min(int(req.query["limit"][0]), self.page_size)
        ordered = sorted(self.events, key=lambda e: int(e["id"]))
        newer = [e for e in ordered if int(e["id"]) > after]
        page = newer[:limit]
        next_after = int(page[-1]["id"]) if page else after
        return json_reply(200, {"events": page, "next_after": str(next_after), "has_more": len(newer) > len(page)})

    def _run(self, req: Recorded) -> Reply:
        body = req.json()
        self.runs.append(body)
        return json_reply(200, {"id": body["id"], "status": body["status"]})

    def pull(self) -> Tuple[int, str, str]:
        return self.run_main("pull", "--env", "staging", "--root", str(self.root))

    def inbox_ids(self) -> List[int]:
        path = self.root / "inbox" / "events.jsonl"
        return [json.loads(line)["id"] for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def cursor(self) -> Optional[str]:
        path = self.root / "state" / "cursor"
        return path.read_text(encoding="utf-8").strip() if path.exists() else None

    def test_pull_writes_overlay_resume_and_events_and_a_second_pull_adds_no_duplicates(self) -> None:
        code, out, err = self.pull()
        self.assertEqual(code, 0, err)

        overlay = json.loads((self.root / "vaults" / "alpha-v3" / "overlay.json").read_text(encoding="utf-8"))
        self.assertEqual(overlay, OVERLAY_JSON)
        beta = json.loads((self.root / "vaults" / "u_beta" / "overlay.json").read_text(encoding="utf-8"))
        self.assertEqual(beta, OVERLAY_B_JSON)
        resume = (self.root / "vaults" / "alpha-v3" / "resume.pdf").read_bytes()
        self.assertEqual(hashlib.sha256(resume).hexdigest(), RESUME_SHA)
        self.assertFalse((self.root / "vaults" / "gamma").exists(), "consent_stale participants get nothing")
        self.assertFalse((self.root / "vaults" / "delta").exists(), "participants being deleted get nothing")

        state = json.loads((self.root / "state" / "participants.json").read_text(encoding="utf-8"))
        self.assertEqual(state["u_alpha"]["overlay"]["version"], 2)
        self.assertEqual(state["u_alpha"]["resume"]["sha256"], RESUME_SHA)

        self.assertEqual(self.inbox_ids(), [1, 2, 3])
        self.assertEqual(self.cursor(), "3")
        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/events")), 2, "three events at two per page")
        self.assertIn("events appended: 3, cursor 3", out)
        self.assertEqual([r["status"] for r in self.runs], ["running", "finished"])
        self.assertEqual(self.runs[0]["kind"], "pull")
        self.assertEqual(self.runs[0]["week_key"], "2026-W44")
        self.assertEqual(self.runs[1]["counts"]["events_appended"], 3)

        # Event 5 lands, then event 4 commits late with a lower id, then 6. The
        # second pull re-reads below the cursor, so 4 is caught and 1 to 3 and 5
        # are not written twice.
        self.events.append(event(5))
        code, _out, err = self.pull()
        self.assertEqual(code, 0, err)
        self.assertEqual(self.inbox_ids(), [1, 2, 3, 5])
        self.assertEqual(self.cursor(), "5")
        self.events.extend([event(4), event(6)])
        before = len(self.portal.requests)
        code, _out, err = self.pull()
        self.assertEqual(code, 0, err)
        ids = self.inbox_ids()
        self.assertEqual(sorted(ids), [1, 2, 3, 4, 5, 6])
        self.assertEqual(len(ids), len(set(ids)), "no duplicate event lines")
        self.assertEqual(self.cursor(), "6")
        third = self.portal.requests[before:]
        first_events_call = next(r for r in third if r.path == "/api/sync/v1/events")
        self.assertEqual(first_events_call.query["after"], ["0"], "re-reads the window below the cursor")

        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/participants/u_alpha/overlay")), 1, "overlay not fetched again")
        self.assertEqual(len(self.portal.hits("GET", "/api/sync/v1/participants/u_alpha/resume")), 1, "resume not fetched again")

    def test_cursor_does_not_advance_when_writing_the_inbox_fails(self) -> None:
        code, _out, err = self.pull()
        self.assertEqual(code, 0, err)
        self.assertEqual(self.cursor(), "3")
        seen_before = (self.root / "state" / "seen-ids").read_text(encoding="utf-8")

        # A directory where the inbox file should be makes the append fail for real.
        inbox = self.root / "inbox" / "events.jsonl"
        saved = self.root / "inbox" / "events.saved"
        inbox.rename(saved)
        inbox.mkdir()
        self.events.append(event(4))
        code, _out, err = self.pull()
        self.assertEqual(code, sync.LocalWriteError.exit_code, err)
        self.assertIn("The cursor stays at 3", err)
        self.assertEqual(self.cursor(), "3")
        self.assertEqual((self.root / "state" / "seen-ids").read_text(encoding="utf-8"), seen_before)
        self.assertEqual(self.runs[-1]["status"], "failed")

        inbox.rmdir()
        saved.rename(inbox)
        code, _out, err = self.pull()
        self.assertEqual(code, 0, err)
        self.assertEqual(self.inbox_ids(), [1, 2, 3, 4])
        self.assertEqual(self.cursor(), "4")

    def test_a_callback_failure_leaves_the_cursor_alone(self) -> None:
        layout = sync.Layout(self.root)

        def fail(_batch: List[Dict[str, Any]]) -> None:
            raise OSError(28, "No space left on device")

        with self.assertRaises(sync.LocalWriteError):
            sync.pull_events(self.client(), layout, on_events=fail)
        self.assertIsNone(self.cursor())
        self.assertFalse(layout.seen_file.exists())

    def test_resume_with_a_wrong_sha_is_not_written(self) -> None:
        self.resume_header_sha = "0" * 64
        code, _out, err = self.pull()
        self.assertEqual(code, sync.IntegrityError.exit_code)
        self.assertIn("failed its checksum", err)
        self.assertFalse((self.root / "vaults" / "alpha-v3" / "resume.pdf").exists())
        self.assertTrue((self.root / "vaults" / "alpha-v3" / "overlay.json").exists(), "the overlay still lands")
        self.assertEqual(self.inbox_ids(), [1, 2, 3], "events still land")
        self.assertEqual(self.runs[-1]["status"], "failed")

    def test_pull_refuses_env_mismatch_before_writing_anything(self) -> None:
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("production")))
        code, _out, _err = self.pull()
        self.assertEqual(code, sync.EnvMismatch.exit_code)
        self.assertFalse(self.root.exists())
        self.assertEqual(self.portal.hits("GET", "/api/sync/v1/participants"), [])


class RunTests(SyncTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.runs: List[Dict[str, Any]] = []
        self.portal.route("GET", "/api/sync/v1/ping", lambda _r: json_reply(200, ping_body("staging")))

        def record(req: Recorded) -> Reply:
            self.runs.append(req.json())
            return json_reply(200, {"id": req.json()["id"], "status": req.json()["status"]})

        self.portal.route("POST", "/api/sync/v1/runs", record)

    def test_run_records_start_and_finish_around_a_command(self) -> None:
        code, out, err = self.run_main("run", "--env", "staging", "--kind", "sweep", "--", sys.executable, "-c", "print('swept 3')")
        self.assertEqual(code, 0, err)
        self.assertIn("swept 3", out)
        self.assertEqual([r["status"] for r in self.runs], ["running", "finished"])
        self.assertEqual(self.runs[0]["id"], self.runs[1]["id"])
        self.assertEqual(self.runs[0]["kind"], "sweep")
        self.assertEqual(self.runs[1]["counts"], {"exit_code": 0})
        self.assertIn("swept 3", self.runs[1]["log_tail"])
        self.assertIn("finished_at", self.runs[1])
        self.assertTrue(re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$", self.runs[0]["started_at"]))

    def test_a_failing_command_is_recorded_as_failed(self) -> None:
        code, _out, _err = self.run_main("run", "--env", "staging", "--kind", "fit", "--", sys.executable, "-c", "import sys; sys.exit(3)")
        self.assertEqual(code, 3)
        self.assertEqual(self.runs[-1]["status"], "failed")
        self.assertEqual(self.runs[-1]["counts"], {"exit_code": 3})

    def test_log_tail_is_clipped_to_16_kib_without_splitting_characters(self) -> None:
        clipped = sync.clip_tail("é" * 20000)
        self.assertLessEqual(len(clipped.encode("utf-8")), sync.RUN_LOG_TAIL_MAX_BYTES)
        self.assertTrue(clipped.endswith("é"))
        self.assertEqual(sync.clip_tail("short"), "short")


class DriftTests(unittest.TestCase):
    """sync.py copies a few values from the portal; these fail when the copies drift."""

    def _source(self, relative: str) -> str:
        path = REPO_ROOT / relative
        if not path.is_file():
            self.skipTest(f"{relative} is not here; this copy of sync.py is outside the portal repository")
        return path.read_text(encoding="utf-8")

    def test_constants_match_src_lib_limits_ts(self) -> None:
        source = self._source("src/lib/limits.ts")

        def number(name: str) -> int:
            match = re.search(rf"export const {name} = ([0-9_]+);", source)
            self.assertIsNotNone(match, name)
            assert match is not None
            return int(match.group(1).replace("_", ""))

        self.assertEqual(sync.MAX_BODY_BYTES, number("MAX_BODY_BYTES"))
        self.assertEqual(sync.CONTRACT_MAJOR, number("CONTRACT_MAJOR"))
        self.assertEqual(sync.EVENTS_PAGE_MAX, number("EVENTS_PAGE_MAX"))
        self.assertEqual(sync.RUN_LOG_TAIL_MAX_BYTES, number("RUN_LOG_TAIL_MAX_BYTES"))
        self.assertEqual(sync.POSTINGS_PER_REQUEST, number("POSTINGS_PER_REQUEST"))
        version = re.search(r'export const CONTRACT_VERSION = "([^"]+)";', source)
        assert version is not None
        self.assertEqual(version.group(1).split(".")[0], str(sync.CONTRACT_MAJOR))

    def test_deletion_states_are_participant_states(self) -> None:
        source = self._source("src/lib/contracts/states.ts")
        block = re.search(r"participantState = z\.enum\(\[(.*?)\]\)", source, re.S)
        assert block is not None
        states = set(re.findall(r'"([a-z_]+)"', block.group(1)))
        for name in sync.DELETION_STATES:
            self.assertIn(name, states)


if __name__ == "__main__":
    unittest.main()
