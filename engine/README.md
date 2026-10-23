# engine/sync.py

The reference client for the portal's sync contract, version 1. It is the only thing on the Mac that talks to pathtoimpact.us. Kem copies it into the Career vault and runs it from there. The contract it speaks is section 4 of docs/implementation-plan.md, and docs/sync-contract.md once that exists.

Today it has three commands: `ping`, `pull` and `run`. The push commands (push-postings, push-build, push-master, push-profiles, vault-created, ack-deletion, digest-send) come in WS4 step 7.

Only `ping` exists on the portal so far. `pull` and `run` are written against the contract and tested against a mock portal. Until the portal serves those endpoints, they stop with a 404 message and exit code 8.

## Python floor

Python 3.9 or later, standard library only. Nothing to pip install.

```sh
python3 --version   # must print 3.9 or later
```

Apple's Command Line Tools python3 has been 3.9 for several macOS releases, which is enough; the command above settles it. The CI job planned in checklist step 10 byte-compiles sync.py and runs these tests on 3.9. Until then, `vermin --target=3.9- --violations engine/sync.py engine/tests/test_sync.py` checks the floor statically.

## Install on the Mac

1. Copy `engine/sync.py` from this repository into the vault, for example to `<vault>/tools/sync.py`. Copy it again whenever the contract changes. Ping refuses a portal whose contract major is not 1, which tells you when.
2. Make one token per environment with `pnpm sync:token` in this repository. It prints a token and its sha256. The sha256 goes into Vercel as `SYNC_TOKEN_SHA256` for that environment. The token goes into the key file. Never reuse a token across environments.
3. Create the key file in the vault, for example `<vault>/.sync-keys.json`, and add it to the vault's `.gitignore`. Then make it readable only by you:

```sh
chmod 600 .sync-keys.json
```

sync.py warns if other users can read it.

### Key file format

```json
{
  "production": { "url": "https://pathtoimpact.us", "token": "the production token" },
  "staging": { "url": "https://pathtoimpact-git-staging-kems-projects-c9c438de.vercel.app", "token": "the staging token" }
}
```

`--env` picks the entry. A `development` entry also works, for a local `next start` at `http://localhost:3000`. Plain `http://` is refused for any host other than localhost, so a token is never sent in the clear.

Without a key file, sync.py reads `SYNC_URL` and `SYNC_TOKEN` from the environment. `SYNC_KEY_FILE` sets a default for `--key-file`, and `SYNC_ROOT` sets a default for `--root`.

## Commands

Every command needs `--env production`, `--env staging` or `--env development`. That is the environment you expect. sync.py calls ping first and stops if the portal reports a different one, so a wrong URL can never pull fixtures into a real vault or push a real week into staging.

### ping

```sh
python3 tools/sync.py ping --env production --key-file .sync-keys.json
```

Calls `GET /api/sync/v1/ping` and prints `env`, `week_key` and `contract_version`, plus the backlog counts once the portal reports them. It exits non-zero if the env differs from `--env` or the contract major is not 1.

### pull

```sh
python3 tools/sync.py pull --env production --key-file .sync-keys.json --root .
```

In order:

1. Ping, with the env and contract checks above.
2. `GET /api/sync/v1/participants?full=0`.
3. For each participant, into `vaults/<vault_slug>/`, or `vaults/<user_id>/` before the vault exists:
   - `overlay.json`, when the approved overlay version is newer than the local copy, from `GET /api/sync/v1/participants/{id}/overlay?version=N`. The file holds the overlay's `json` object as the portal approved it.
   - `resume.<ext>`, when the resume's sha256 differs from the local copy, from `GET /api/sync/v1/participants/{id}/resume`. The bytes must hash to the `X-Sha256` header or nothing is written.
   - Participants listed as `consent_stale`, or in state `deletion_requested`, `vault_pending` or `deleted`, get nothing.
4. `GET /api/sync/v1/events?after=<cursor>`, page by page. Each pull starts 500 ids below the cursor, because an event can commit out of id order. Events already in `state/seen-ids` are skipped, so nothing is written twice. New events are appended to `inbox/events.jsonl` and fsynced. Only then do `state/seen-ids` and `state/cursor` move.
5. The pull is recorded as a run of kind `pull`. Pass `--no-record` to skip that.

If one participant's file fails, for example a resume that fails its checksum, the other participants and the events still go through. The command then exits non-zero and names what failed. The next pull tries again.

What pull writes under `--root`:

| Path | What |
|---|---|
| `vaults/<slug>/overlay.json` | the approved overlay |
| `vaults/<slug>/resume.pdf` (or `.docx`, `.doc`, `.txt`, `.md`) | the current resume |
| `inbox/events.jsonl` | one event per line: `id`, `kind`, `user_id`, `at`, `payload`. Apply each by its `id`, idempotently, because a restored vault replays events |
| `state/cursor` | the highest event id pulled |
| `state/seen-ids` | event ids in the re-read window, for deduping |
| `state/participants.json` | per participant: the vault folder, the overlay version and sha256, the resume sha256, original filename and MIME type |

Deleting `state/` is safe. The next pull fetches everything again, and the events replay.

This layout is the proposal in WS4 step 7. Kem confirms it in week 2.

### run

```sh
python3 tools/sync.py run --env production --key-file .sync-keys.json --kind sweep -- make sweep
```

Records a run as `running` through `POST /api/sync/v1/runs`, runs the command after `--`, echoes its output, then records the run as `finished` or `failed` with its exit code and the last 16 KB of output. It exits with the command's exit code. The kinds are `pull`, `sweep`, `fit`, `week`, `push`, `build`, `vault_create`, `profiles` and `purge`. Add `--user-id` for a per-vault run.

### Makefile targets

WS11 step 2 asks for these in the vault:

```make
SYNC = python3 tools/sync.py
SYNC_ENV ?= production
SYNC_ARGS = --env $(SYNC_ENV) --key-file .sync-keys.json

sync-ping:
	$(SYNC) ping $(SYNC_ARGS)

sync-pull:
	$(SYNC) pull $(SYNC_ARGS) --root .
```

Use `make sync-pull SYNC_ENV=staging` against staging.

## Retries, timeouts and the size cap

- Every request has a 30 second timeout. The first call on a Sunday may wake the Neon compute.
- Connection errors, timeouts, 5xx and 429 are retried three times, after 2, 4 and 8 seconds. Each retry is printed.
- Other 4xx answers are never retried, because sending the same request again gets the same answer.
- Redirects are never followed, so the token never goes to another host. A redirect usually means Vercel deployment protection is on for that host.
- Any body over 4,194,304 bytes (4 MiB) is refused before anything is sent. A resume listed over that size is not downloaded.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | done |
| 1 | another portal refusal; the message says which |
| 2 | configuration or usage: no URL or token, a bad key file, a wrong option |
| 3 | env_mismatch, or the portal's contract major is not 1 |
| 4 | 401: the token does not match this environment's SYNC_TOKEN_SHA256 |
| 5 | 409: a conflict with the portal's current state |
| 6 | 413, or a body over the 4 MiB cap |
| 7 | 422: the portal rejected the data |
| 8 | 404: nothing at that endpoint, or the portal has not deployed it yet |
| 9 | the portal could not be reached after three retries |
| 10 | integrity: a sha256 mismatch or a malformed answer; nothing was written for it |
| 11 | a local write failed; the cursor did not move |
| 130 | interrupted |

`run` exits with the wrapped command's own code when that command fails.

## Tests

From the repository root:

```sh
python3 -m py_compile engine/sync.py
python3 -m unittest discover -s engine/tests -t . -v
```

The tests start a mock portal on 127.0.0.1 and need no network. Two of them compare sync.py's copied constants with src/lib/limits.ts and src/lib/contracts/states.ts, and skip themselves outside this repository.

## Troubleshooting

- `CERTIFICATE_VERIFY_FAILED`: with the python.org installer, run `Install Certificates.command` from the Python folder in Applications once.
- Exit 4 on a token that worked before: the hash in Vercel was rotated. Make a new token with `pnpm sync:token`.
- Exit 3 with env_mismatch: the URL in the key file entry points at the other environment.
