# Verification log

What was checked, how, and what it showed. Newest session first. A check that could not run says so; nothing here is reported as passed without having run.

## 23 Oct 2026: the first session's checklist

Plan section 12, run on the branch claude/epic-cori-s93zjr from main at eadc7c2. Container: Node 22.22.0, pnpm 10.28.0, Python 3.13.

### Network

The session's proxy still refuses neon.tech, console.neon.tech, vercel.com and api.resend.com with 403. Package registries work. So no step that needs Neon, a Vercel deployment or Resend ran here. Section 8 of the plan lists allowing those hosts as a day-1 need.

### Steps

| Step | Result |
|---|---|
| 1 Branch, read the docs, check network | Done. Network as above |
| 2 Apply docs/plan/proof-of-stack.patch | Applied cleanly; lockfile regenerated; `!.env.example` added to .gitignore |
| 3 Move the wiring | Ping at /api/sync/v1/ping with sha256 and timingSafeEqual over the current and previous hashes; /app checks the session; the proxy covers /app and /admin and redirects to /sign-in; stub /sign-in. Public sign-up is disabled now, not in WS1, so production never accepts a sign-up before invites exist |
| 4 Packages and scripts | tsx 4.23.15, react-email 6.11.3 and vitest 5.0.5 added; every new or upgraded package pinned exactly; make-sync-token.ts, migrate.ts and vercel-build.sh written; package scripts added |
| 5 Build on Next 16.0.8 | Passed. / and /sign-in static; /api/auth, /api/sync/v1/ping and /app dynamic |
| 6 Upgrade and smoke test | Next 16.4.2, React 19.3.1, @types/node 22.20.5, engines node >=22.12.0 (vitest 5 needs 22.12), no cacheComponents. Smoke results below |
| 7 Migrate the staging branch | Not run: Neon is unreachable from this container and no staging URL is set. drizzle-kit check and generate pass offline with no schema change |
| 8 env, limits, week, states | Written with tests. A reviewer compared week keys with Python zoneinfo over 384,903 instants from 2019 to 2041 in 9 timezones: no mismatch |
| 9 Contract skeleton | src/lib/contracts, contracts/*.schema.json via pnpm contracts:json, docs/sync-contract.md, engine/sync.py with ping, pull and run, engine/tests |
| 10 CI | .github/workflows/ci.yml. The session could push a workflow file: it went up in 6ae7e3c |
| 11 CLAUDE.md | Written |
| 12 setup.md, README.md | Written; docs/decisions.md unchanged, no decision landed |
| 13 All green | See below |
| 14 Pull request | See below |

### Smoke test, next start on Next 16.4.2

| Request | Result |
|---|---|
| GET /api/sync/v1/ping, no token | 401 |
| same, wrong token | 401 |
| same, right token, X-Sync-Version: 1 | 200 `{"ok":true,"env":"staging","contract_version":"1.0.0","week_key":"2026-W43"}` |
| same, X-Sync-Version: 2 | 400 validation |
| same, SYNC_TOKEN_SHA256 set to a malformed value | 500 with the error envelope naming the variable, not its value |
| GET /app, anonymous | 307 to /sign-in |
| GET /admin/x, anonymous | 307 to /sign-in |
| GET /api/auth/ok | 200 |
| POST /api/auth/sign-up/email | 400 EMAIL_PASSWORD_SIGN_UP_DISABLED |
| GET / | 200, the holding page |
| python3 engine/sync.py ping --env staging against it | env staging, week 2026-W43, contract 1.0.0 |

### Checks at the end of the session

| Check | Result |
|---|---|
| pnpm lint | clean, no warnings |
| pnpm typecheck | clean |
| pnpm test | 5 files, 41 tests passed |
| pnpm contracts:json | deterministic, committed output matches |
| pnpm db:check, pnpm db:generate | fine; no schema change |
| python3 -m unittest discover -s engine/tests -t . | 26 tests passed on Python 3.13 |
| Python 3.9 floor | vermin 1.9.2: minimum 3.7, so 3.9 holds statically. No 3.9 interpreter here; CI runs the tests in python:3.9-slim |
| pnpm build with dummy auth values | passed |
| pnpm build with no auth values | exits 0, logs better-auth errors; sign-in would fail at run time |
| scripts/vercel-build.sh with VERCEL_ENV=production and a dead database URL | runs migrate.ts, which fails on the connection as it should |

### Findings worth keeping

- **A build without the auth pair still passes.** It exits 0 and logs better-auth errors, and sign-in fails at run time. The plan said the build fails; plan, setup.md and .env.example now say this instead.
- **Next 16.4.3 was published on 23 Oct.** This branch stays on 16.4.2, which the plan names and which is a week old.
- **Two reviewers checked the branch** before the pull request and returned 13 findings, all fixed. The ones that mattered:
  - migrate.ts used top-level await, which tsx refuses under CommonJS, so every production build would have failed once the build command changed. A new CI step now loads the scripts.
  - The build state machine refused the call order the contract publishes.
  - One bad posting would have failed a whole push. Items are now checked one at a time.
  - The path scrub missed markdown links and file:// URIs.
  - A failed Resend send looked like a success.
  - sync.py now re-hashes the overlay under the contract's rule.
- **Not verified, waiting on Kem:**
  - the production deploys of ab7651f and eadc7c2
  - the Vercel project's settings, including Fluid compute and deployment protection
  - whether VERCEL_ENV is "production" in a production build, which vercel-build.sh relies on; check it on the first build with `pnpm run build:vercel`
