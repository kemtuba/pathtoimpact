# pathtoimpact.us portal: implementation plan, draft 1.2, 23 Oct 2026

Written for Kem. This plan implements the Build Scope, draft 1 of 21 Oct 2026, in the repository kemtuba/pathtoimpact. It is a plan, not code: nothing in the repository changes until Kem answers the week-1 decisions in section 9. It starts from the plan the two judges favoured, the operator's week first, and folds in every graft and every blind spot the judges named.

Source tags used throughout: [scope] is the Build Scope draft 1; [facts] is the repository and environment facts file of 22 Oct 2026; [research] is the verified vendor research of 22 Oct 2026; [proof] is the stack feasibility proof run on this scaffold today; [plan] marks an estimate this plan makes itself, such as effort in session-days; [verified] marks a check run in this repository's cloud container on 23 Oct 2026. A session-day is about six hours of focused Claude Code work including tests and the pull request write-up [plan].

Companion files in this folder: docs/plan/research-notes.md holds every verified vendor claim with its source and confidence; docs/plan/proof-of-stack.patch is the wiring the feasibility proof built and smoke-tested on this scaffold, ready for git apply; docs/plan/README.md says how this plan was produced and what each file is for.

## Revision notes

Draft 1.2 records Kem's week-1 decisions. On 23 Oct Kem accepted this plan's recommendation on all eleven. Hosting, decision 2, had no recommendation, so one was made the same day and is marked as such. Section 9 marks each of the eleven decided, and docs/decisions.md is the running record. The same day Kem chose to hide the Capital Clarity offer for now rather than move it. WS13 step 1 is done on the working branch in commit 2d83e2a, and the proof patch was regenerated against that commit. The rest of this note describes draft 1.1.

Draft 1 went to two adversarial critics: one checked it against the scope section by section, the other against platform limits, security and failure recovery. They returned 67 findings. Every high-severity finding is fixed here, and almost every other one is too. The changes that matter most:

- **The first session can start from the repository.** The plan and the proof's wiring are committed under docs/, and the checklist in section 12 now moves the proxy, ping route and sign-in stub to their final shape before it tests them.
- **Sessions cannot reach Neon, Vercel or Resend today.** This was checked on 23 Oct. Allowing those hosts is now a day-1 need, and until then database tests run in GitHub Actions.
- **Nothing is deployed until decision 1.** Deploying the repository as it stands would serve the paid Capital Clarity offer from the new Vercel project. Decision 1 is therefore week 1 with no default.
- **Deletion now reaches everything.** That includes event payloads, the access log and a stub that outlives the purge. The confirmation states the backup and mail-log windows.
- **The sync contract recovers from a Sunday run that dies halfway.** Builds become ready only when the PDF arrives. A finalize call clears dropped picks. The event cursor cannot skip a late commit. Digests resume per recipient under a lease, and a late push still announces its roles.
- **The scope's thirteen decisions are mapped** to the portal steps they gate, in a table at the head of section 9. The V4 bench rule, the L1 bar-admission field, SerpApi and the dual-role fact behind the staffing statement are carried explicitly.
- **Kem's hours are added up in one table.** The total runs 78 to 97 against the scope's 65 to 85, and decision 25 puts the gap to Kem.
- **New items:** the overlay field list in 5.7, WS13 for the landing, privacy, terms and consent pages, a four-weekly process survey, a coverage push for the profile review, and decisions 23 to 25.
- **Smaller fixes:** no operator impersonation. Email links never act on a GET. The public health check never touches the database. The invite token is separate from the 1-hour reset token. Mail caps apply only to unauthenticated triggers. Scripts run through tsx. Fixtures are synthetic.

Two findings were adopted in a different form. The critic suggested moving engineering calls out of section 9; they are tagged "engineering default" instead, so the numbering other documents cite stays stable. The critic also suggested re-deciding the database driver in favour of pg; the HTTP driver stays, because Neon's own Drizzle guide recommends it for Vercel [research] and the proof already ran it.

## 1 What this plan covers and what it does not

### The repository versus the engine

This plan covers one system: the portal in kemtuba/pathtoimpact, deployed to Vercel at pathtoimpact.us, plus the contract between that portal and Kem's engine. The repository today is a create-next-app scaffold of 18 files with Next.js 16.0.8, React 19.2.1, Tailwind CSS 4, TypeScript 5 and pnpm 10, with no tests, no continuous integration, no database, no authentication and no API routes [facts].

The engine, the Python modules in the Career vault on Kem's Mac, is not reachable from any Claude Code session, and neither are gallery-os, kemartaylor nor s38-audit-workspace [facts]. Every engine change in the scope's phases 1 to 4 is Kem's to do. This plan does not write engine code. It gives the engine a fixed target instead: a versioned sync contract document, JSON Schema files exported from the portal's validation code, a Python reference client that Kem copies into the vault as sync.py, fixtures, and a weekly runbook. JSON is JavaScript Object Notation. Those are listed as a handoff workstream with dates so the milestones carry the dependency honestly.

The scope says auth, schema, email and provisioning are lifted from gallery-os. This plan builds them fresh because gallery-os is unreachable [facts] and because the feasibility proof already compiled and smoke-tested better-auth 1.7.12, a CLI-generated Drizzle schema, the Next 16 proxy file and a token-checked sync endpoint on this exact scaffold [proof]. CLI is command-line interface. See decision 3.

### The existing Capital Clarity page

Until 23 Oct the only route, src/app/page.tsx, was a landing page for a different offer: the Capital Clarity Session, a 175 dollar one-to-one funding session for NYC founders, with an embedded Typeform, form id ONoqryDd, under the footer "Path to Impact" [facts]. src/app/layout.tsx still carries the "Create Next App" metadata [facts]. What happens to that page is not decided anywhere [facts], and it matters twice. First, Vercel's fair-use definition counts advertising the sale of a product or service as commercial use, which a Hobby plan does not allow [research]. Second, the scope's landing page has to say the portal is free, that a person runs it weekly, that nothing is auto-submitted, and that a separate placement business exists [scope], which collides with a paid funding offer at the same root under the same name.

The interim layout this plan adopts: the portal lives under /app, the operator console under /admin, the auth pages under /sign-in, /set-password, /forgot-password and /verify-email, and the proxy matcher covers only /app and /admin. The page keeps building unchanged alongside the new stack [proof] until WS13 step 1 removes it. Deploying the repository as it stands would put the paid offer on the new Vercel project, which is the commercial use decision 2 is about. On 23 Oct Kem decided to hide the offer for now, decision 1, and WS13 step 1 did that on the working branch the same day. Until that change is on main, sessions build and test locally and in continuous integration, and no Vercel production deployment is connected.

### Out of scope here

Profile content, the add-a-profile procedure, SerpApi policy, counsel's wording, and creating the Vercel, Neon and Resend accounts are Kem's items. Section 8 lists the accounts, access and wording as needs. Section 9 opens with a table that maps each of the scope's thirteen decisions, the profile rulings and SerpApi included, to the portal step it gates. Draft 2 of the scope, which will fold in the adversarial critique [scope], will need a pass over this plan.

## 2 Ground truth that changed the scope

| Fact | Source | What it changes in this plan |
|---|---|---|
| The repo serves a paid offer at / under the Path to Impact name; Vercel fair use treats advertising a paid service as commercial | [facts], [research] | Decision 1 and decision 2. Interim route layout under /app so week 1 proceeds. The hosting question is put to Kem with both readings. |
| gallery-os, the engine and the vault are unreachable from sessions | [facts] | Auth is built fresh. Engine changes are a handoff workstream. The contract, schemas and reference client ship from this repo in week 1. |
| Next 16.4.2 is current; 16.4.1 carried security fixes; the repo pins 16.0.8 | [facts], [research] | Upgrade in WS0 and re-run the proof's smoke test. Cache Components stay off. |
| Vercel Functions cap request and response bodies at 4.5 MB on every plan; streaming does not lift the request cap | [research] | A hard cap of 4,194,304 bytes on resume uploads, built PDFs and every sync body, enforced in the schema, the handlers and the client. The PDF travels as a raw body, never base64. |
| Vercel Hobby cron: once a day at most, fires anywhere within the scheduled hour, best effort, production deployments only; 300 s maximum duration with Fluid compute | [research] | Every scheduled job claims a digest_run row under a unique key before doing work. The digest is sent at the end of Kem's push and the Monday cron is a backstop. |
| Neon Free: 1 GB storage per project, 100 compute-unit hours, scale to zero after 5 minutes that cannot be disabled, 10 branches per project with no extras purchasable, 5 GB egress a month | [research] | Retries with backoff on the first call of a run. One fixed staging branch for previews, no per-pull-request branching. Compute pinned small. |
| The Neon HTTP driver has no interactive transactions; a Drizzle batch on it is one Neon transaction; the better-auth Drizzle adapter never calls transactions on Postgres by default | [research], [proof] | All multi-table writes go through one batch helper, ids are minted in app code, version numbers use INSERT then SELECT, and a lint rule forbids db.transaction. |
| Stable drizzle-orm 0.45.4 has no bytea helper; the docs site shows the 1.0 release-candidate syntax and a different migrations layout | [research] | bytea via customType. Versions pinned to 0.45.x and 0.31.x. CLAUDE.md warns about copying docs examples. |
| better-auth 1.7.12: the CLI is the npm package auth; disableSignUp plus admin createUser closes sign-up with no new table; the reset token expires in 3,600 s by default; the api-key plugin rate-limits to 10 requests a day by default; nextCookies must be last; two Next 16 issues are unresolved | [research], [proof] | Operator-created invites with a 7-day set-password token. Static hashed sync token, not the api-key plugin. A week-1 verification pass on a Vercel preview before anything is built on the auth stack. |
| betterAuth initialises at build time, so BETTER_AUTH_SECRET and BETTER_AUTH_URL are needed when Vercel builds, in Production and Preview | [proof] | Listed as a week-1 need. Different secrets per environment. |
| Resend Free: 100 emails a day resetting at 00:00 UTC, 3,000 a month, hard fail at the cap, 10 requests a second, domain verification in 15 minutes to 72 hours, only onboarding@resend.dev to the owner's address before verification; per-email headers inside a batch call are not verified | [research] | Digests send one request per user with an idempotency key, inside the 10 a second limit. A per-address daily send budget protects the digest from public reset requests. Invite links print to the operator when mail cannot be sent. DNS work starts in week 1. |
| The session's network policy allows package registries only. On 23 Oct 2026 the proxy refused neon.tech, console.neon.tech, the regional Neon endpoint, vercel.com and api.resend.com | [verified] | Sessions cannot migrate, run database tests, call a Vercel deployment or send mail until Kem allows those hosts, a day-1 need. Until then database-tier tests run in GitHub Actions, and nothing is reported as passed without a real connection. |
| kemtuba/pathtoimpact is a public repository | [verified] | Nothing personal is committed. Fixtures are synthetic, and this plan leaves out the figures from Kem's own application record. |
| Node 22's built-in TypeScript runner fails on extensionless relative imports, which the auth chain needs | [verified] | Every script runs through a pinned tsx. |
| The proof's diff, saved as docs/plan/proof-of-stack.patch, applies to a clean clone of 2d83e2a, the commit that hid the offer, and builds with only the two auth variables set | [verified] | The first session starts from the patch, not from anything outside the repository. |
| The proof's wiring needs relative imports inside the auth config chain, a lazy database proxy, and .gitignore's .env* line hides .env.example | [proof] | Carried into WS0 and CLAUDE.md. |
| The scope's forms say Claude pre-fills what a resume can show; the scope's operating model has the engine start the follow-up clock; the scope asks whether Kem's own tracks become profiles | [scope] | Decision 16 on pre-fill. The follow-up clock moves to the portal, a stated deviation. Decision 18 on Kem's tracks, which changes what the week-5 demo means. |
| The vault already holds Kem's own application history and response-rate baseline. This repository is public, so the figures stay in the scope and out of this file | [scope], [verified] | Decision 17: whether user zero's history enters the portal. |

## 3 Target architecture in this repo

### 3.1 Directory layout

```
src/app/page.tsx                         root: untouched until decision 1, then the pilot landing
src/app/layout.tsx                       metadata and fonts fixed in WS0
src/app/privacy/page.tsx                 static, rendered from content/privacy.md
src/app/terms/page.tsx                   static, rendered from content/terms.md
src/app/consent/page.tsx                 static, rendered from content/consent/*.md
src/app/sign-in/page.tsx
src/app/set-password/page.tsx            invite and reset land here with ?token=
src/app/forgot-password/page.tsx
src/app/verify-email/page.tsx
src/app/app/layout.tsx                   requireSession, participant-state gate, current-consent gate
src/app/app/page.tsx                     home by state
src/app/app/intake/[step]/page.tsx       the six forms
src/app/app/intake/actions.ts
src/app/app/staffing/page.tsx            the separate opt-in screen, placement store only
src/app/app/master/page.tsx              drafted master and claims register
src/app/app/week/page.tsx                this week
src/app/app/ready/page.tsx               ready to send, draft approval, I applied
src/app/app/sent/page.tsx                applications, replies, write-off
src/app/app/profile/page.tsx             edit overlay, digest toggle, timezone, revoke opt-in
src/app/app/data/page.tsx                download everything, access log, delete account
src/app/admin/layout.tsx                 requireRole operator
src/app/admin/page.tsx                   Week view
src/app/admin/participants/**            list, detail, invite, pause, state history
src/app/admin/intake/[userId]/page.tsx   review and approve
src/app/admin/builds/**                  queue with ages
src/app/admin/runs/**
src/app/admin/time/**
src/app/admin/review/**                  reason codes, surveys, metrics
src/app/admin/profiles/**                mirror and four-week review
src/app/admin/deletions/**
src/app/placement/layout.tsx, page.tsx   own layout, requireRole placement, opt-in list only
src/app/api/auth/[...all]/route.ts
src/app/api/app/resume/route.ts          upload, Route Handler, 4 MB cap
src/app/api/app/builds/[buildId]/pdf/route.ts
src/app/api/app/export/route.ts
src/app/api/sync/v1/**/route.ts          the contract, section 4
src/app/api/cron/digest/route.ts
src/app/api/cron/followups/route.ts
src/app/api/cron/retention/route.ts
src/app/api/health/route.ts              liveness only, no database call
src/app/s/[token]/page.tsx               survey answer from the digest
src/app/u/[token]/route.ts               unsubscribe: confirm page on GET, RFC 8058 POST acts directly
src/proxy.ts                             matcher /app and /admin, cookie presence only
src/lib/env.ts                           zod-validated, lazy
src/lib/auth.ts  src/lib/auth-schema.ts  src/lib/auth-client.ts  src/lib/access.ts  src/lib/session.ts
src/lib/db.ts                            lazy proxy over drizzle neon-http
src/lib/db/batch.ts                      the only path for multi-table writes
src/lib/db/columns.ts                    bytea customType
src/lib/schema/*.ts                      domain tables; index.ts excludes placement
src/lib/schema/placement.ts              pgSchema placement, imported only by the five named paths in 3.4
src/lib/placement/db.ts
src/lib/contracts/*.ts                   zod: overlay, posting-export, build-push, master-push, profile-mirror, events, reason-codes, states
contracts/*.schema.json                  exported for the engine
contracts/profiles/*.json                Kem-provided V3, V4, V1, V2
src/lib/sync/auth.ts  events.ts  receipt.ts  scrub.ts
src/lib/email/send.ts  budget.ts  templates/*.tsx
src/lib/week.ts  digest.ts  followups.ts  retention.ts  deletion.ts  metrics.ts  limits.ts  participant-state.ts
engine/sync.py                           reference client, copied to the vault
engine/README.md
fixtures/persona/*  fixtures/sample-export.json   synthetic only, never personal data
content/consent/pilot.v1.md  retention.v1.md  staffing.v1.md  content/privacy.md  content/terms.md  content/landing.md
docs/implementation-plan.md  docs/plan/README.md  research-notes.md  proof-of-stack.patch   this plan and its evidence
docs/sync-contract.md  runbook.md  states.md  setup.md  verification.md  decisions.md  engine-handoff.md  pilot-review.md
scripts/make-sync-token.ts  invite.ts  bootstrap-operator.ts  migrate.ts  seed.ts  reset-staging.ts  check-deleted.ts  sync-smoke.sh  vercel-build.sh
tests/contract/*  tests/db/*
drizzle/  drizzle.config.ts  vercel.json  .github/workflows/ci.yml  CLAUDE.md  README.md  .env.example
engine/tests/                            sync.py unit tests, run on Python 3.9 in CI
```

No route groups are used, so every path above is also the URL path.

### 3.2 Packages and versions

| Package | Version | Why | Source |
|---|---|---|---|
| next, eslint-config-next | 16.4.2 | 16.4.1 security fixes; Vercel supports 16.3 and 16.4 | [facts], [research] |
| react, react-dom | 19.3.1 | React 18 is deprecated in Next 16 | [facts], [research] |
| better-auth, @better-auth/drizzle-adapter | 1.7.12 | pinned together; the auth CLI runs as pnpm dlx auth@1.7.12 | [proof], [research] |
| drizzle-orm | 0.45.4 | stable; not the 1.0 release candidate | [proof], [research] |
| drizzle-kit | 0.31.11, dev | stable, matches 0.45 layout | [proof] |
| @neondatabase/serverless | 1.2.0 | HTTP driver | [proof] |
| resend | 6.34.1 | sender | [proof] |
| zod | 4.6.7 | contracts, forms, env | [proof] |
| react-email | 6.11.3 or later | unified package; works with Next 16.4; not @react-email/components, which is deprecated | [research] |
| vitest | current release at install, pinned exactly | contract and route tests | [plan] |
| tsx | current release at install, pinned exactly, dev | runs scripts/*.ts; Node 22's built-in runner fails on the auth chain's extensionless imports | [verified] |

Not installed: pg, because the proof built and smoke-tested the HTTP driver and Neon's Drizzle guide recommends it for Vercel [research], and the session's network block applies to both drivers alike [verified]; @vercel/functions, because Next 16's after from next/server schedules work past the response without a dependency [research]; @better-auth/api-key, see assumption 6. Node engines field: 22 or later. Vercel runs Node 24 by default, offers 22, and has deprecated Node 20 [research]. The react-email and vitest additions were not part of the proof's install [proof], so day 1 installs and builds with them before anything else.

### 3.3 Environment variables

| Variable | Where | Needed at build | Purpose |
|---|---|---|---|
| BETTER_AUTH_SECRET | Production, Preview, local; different values per environment | yes | better-auth initialises at module load [proof] |
| BETTER_AUTH_URL | Production the production host; Preview the fixed staging host | yes | base URL for callbacks [proof]. Auth and sync are verified only on the staging host. Per-pull-request previews are build checks and cannot sign in |
| DATABASE_URL | pooled Neon string per environment | no | runtime queries |
| DATABASE_URL_UNPOOLED | direct Neon string per environment | only when the build migrates | migrations [research] |
| RESEND_API_KEY | per environment | no | constructed per call, never at module level [proof] |
| EMAIL_FROM, EMAIL_REPLY_TO | per environment | no | sending subdomain address; reply-to is a need |
| SYNC_TOKEN_SHA256, SYNC_TOKEN_SHA256_PREVIOUS | different per environment | no | sync auth with rotation |
| SYNC_ENV | production or staging | no | echoed by ping so sync.py refuses a mismatched target |
| CRON_SECRET | Production and Preview, different values | no | cron handlers 401 without it [research] |
| OPERATOR_EMAIL, OPERATOR_USER_ID | Production | no | Friday summary, adminUserIds safety net |
| DEFAULT_TIMEZONE | all | no | falls back to the value Kem gives in section 8 |

.env.example is committed; .gitignore gains a !.env.example line [proof].

### 3.4 The role model

| Role | Who | Can | Enforced by |
|---|---|---|---|
| operator | Kem | everything under /admin: invite, approve, ban, time log, run log; also a participant row if decision 12 says so. No impersonation in the pilot, because acting as a user could forge consent and I-applied rows | admin plugin with custom access control, adminRoles operator, adminUserIds as a safety net; requireRole in layouts, every server action and every route handler |
| user | invited job seekers | /app only, their own rows, their access log | requireSession plus ownership filters on every query |
| placement | whoever reads the staffing list, Kem today | /placement only: name, email, opted_in_at, text version | requireRole placement in its own layout; an eslint no-restricted-imports rule bars src/lib/placement everywhere except five named importers: the staffing screen, the revoke action, deletion, the user's own export and the placement page. Kem holds both roles today, so the isolation guards code, not the person; decision 11 puts that to Kem and counsel |
| sync | the Mac | /api/sync/v1 only | bearer token hash compared in constant time; no session code; access_log row per call |
| cron | Vercel | /api/cron only | CRON_SECRET bearer |

The proxy file does only a cookie-presence redirect for /app and /admin; the real check is the session read in each layout and handler, as better-auth's own guidance says [research]. File uploads and sync bodies live under /api, outside the proxy matcher, because proxy.ts silently truncates bodies above 10 MB instead of rejecting them [research]. Server actions post to page routes inside the matcher. They stay at Next's default 1 MB body limit, which must never be raised to 10 MB or more.

## 4 The sync contract

### 4.1 Conventions

Base URL is the production host, or the staging host for previews. Every request carries Authorization: Bearer with the raw service token and X-Sync-Version: 1. The portal hashes the presented token with sha256 and compares in constant time against SYNC_TOKEN_SHA256 or SYNC_TOKEN_SHA256_PREVIOUS; anything else is 401 [proof pattern]. JSON bodies are UTF-8; timestamps are ISO 8601 with an offset; dates are YYYY-MM-DD; ids are text. The week key is the portal's: the ISO 8601 week that contains the run date in the operator's timezone, except that a Sunday belongs to the following week, because the Sunday run prepares the week ahead. A Tuesday catch-up push therefore lands in the current week, not the next one. Ping returns the key and pushes echo it. Every body is capped at 4,194,304 bytes because Vercel's cap is 4.5 MB [research]. The error envelope is the same everywhere: an error object with code, message and optional issues, where code is one of unauthorized, env_mismatch, validation, not_found, conflict, too_large, state. Contract changes bump CONTRACT_VERSION reported by ping; changes within a major are additive; engine/sync.py is updated in the same pull request. The portal is the system of record for consent, decisions and outcomes [scope]; pulls are read-only; engine acknowledgements are explicit calls.

Two invariants are server-side refusals, not conventions: no sync endpoint can create or modify an application row or an applied date, and no sync endpoint can create a build. Those rows exist only from the user's clicks [scope].

### 4.2 Endpoints

| Endpoint | Request | Response | Idempotency | Errors |
|---|---|---|---|---|
| GET /api/sync/v1/ping | none | ok, at, env, week_key, contract_version, portal_commit, last_pull_at, last_push_at, counts: overlays_approved_unpulled, build_requests, approved_drafts, events_since_cursor, deletions_pending, masters_in_review | none; wakes the Neon compute | 401 |
| POST /api/sync/v1/runs | id client uuid, kind pull or sweep or fit or week or push or build or vault_create or profiles or purge, user_id optional, week_key, status running or finished or failed, started_at, finished_at optional, counts optional, log_tail up to 16 KB, host, engine_version | id, status | upsert by id; status never moves backwards | 409 on a backward transition, 422 validation |
| PUT /api/sync/v1/profiles | profiles: list of id, name, description, node, ruling_status, status draft or active or demoted, version, lookup_version, example_titles, form: kinds with id and label and bar, tools, employer_types, screens_default, pay_range optional, sha256 | upserted, unchanged | upsert by id; same sha is a no-op; profiles absent from the body are untouched | 422 |
| GET /api/sync/v1/participants | query full 0 or 1 | participants without the current pilot consent version are listed as consent_stale with no overlay; participants: user_id, vault_slug, state, timezone, profiles with is_primary, overlay: approved version and sha256 and approved_at, with json when full is 1, resume: id and sha256 and mime and byte_length and filename or null, masters: profile_id and version and status, consents: pilot version and retention_days | read-only | none |
| GET /api/sync/v1/participants/{user_id}/overlay | query version optional | user_id, version, sha256, json, approved_at | read-only; approved versions only | 404 |
| GET /api/sync/v1/participants/{user_id}/resume | none | raw bytes, Content-Type of the stored MIME type, Content-Disposition with the original filename, X-Sha256, Content-Length, at most 4,194,304 bytes | read-only | 404 |
| PUT /api/sync/v1/participants/{user_id}/vault | vault_slug, created_at, template_version | user_id, state | repeatable | 404, 409 if the participant is not intake_approved or later |
| GET /api/sync/v1/events | query after bigint, limit up to 500 | events: id, kind, user_id, at, payload; next_after; has_more | read-only, repeatable; the engine owns the cursor; only events older than a 10-second settle window are served, so an event that commits out of sequence order is never skipped, and sync.py re-reads the last 500 ids and dedupes by event id | none |
| POST /api/sync/v1/postings | run_id, week_key, user_id, postings: up to 200 of external_id, profile_id, company, role, url, location, comp_min, comp_max, fit, fit_why, facets object with the six keys, card_json with allowlisted keys, excerpt up to 2,000 characters, status, status_date, source_board, tier_hint, proposed, rank, pick_reason up to 500 characters, posting_date | inserted, updated, unchanged, rejected with external_id and reason, week_key | upsert by user_id plus external_id as one multi-row INSERT ON CONFLICT per request; first_seen_week kept, last_seen_week updated; existing decisions untouched; the engine's status is stored as engine_status and never touches the portal's application state, so an engine status of applied is accepted and changes nothing the user sees | 409 if week_key is not the current or previous week, 413 over 4 MB, 422 validation or scrub failure |
| PUT /api/sync/v1/participants/{user_id}/weeks/{week_key}/proposals | run_id, external_ids: the full list proposed this week | user_id, week_key, proposed, cleared | repeatable; sets proposed on the listed postings and clears it on every other posting in that week, so a pick dropped after a failed run disappears; the week is shown to the user and announced in the digest only after this call | 404, 409 if an id is unknown or the week is not current or previous |
| POST /api/sync/v1/coverage | run_id, week_key, rows: profile_id, seen, passed, written, qualified, proposed, serp_searches | upserted | upsert by profile_id plus week_key | 422 |
| POST /api/sync/v1/builds/{build_id} | run_id, status drafting or draft_review or building or uploading or failed, draft: keywords and tailored_md and cover_letter_md when draft_review, expected_sha256 and filename and keywords and tailored and gate_transcript up to 64 KB and master_sha256 and built_at when uploading, error when failed | build_id, status | transitions validated against the build state machine; same payload replays are 200 no-op; a new expected_sha256 is accepted while downloaded_at is null, and after a download only as a new build revision | 404 unknown build, never created here; 409 illegal transition |
| PUT /api/sync/v1/builds/{build_id}/pdf | raw application/pdf body, X-Sha256 header | build_id, status ready, pdf_sha256, byte_length | same sha already stored is 200 with changed false; only this call moves a build to ready and sends the build-ready mail, so a run that dies between the two calls leaves the build in uploading, never ready without a file | 413 over 4,194,304 bytes; 409 when the recomputed sha differs from the header or from expected_sha256; 409 when the build is not in uploading |
| POST /api/sync/v1/masters | idempotency_key, run_id, user_id, profile_id, version, markdown, source_resume_sha256, claims: text and basis_hint, honest_gap_prompt | master_id, status in_review | replayed from sync_receipt by idempotency_key; unique on user_id, profile_id, version | 409 if that version is approved |
| POST /api/sync/v1/record-drafts | only if decision 16 chooses engine-side pre-fill: user_id, resume_sha256, json for form 3, idempotency_key | record_draft_id | by idempotency_key | 409 if the user already confirmed form 3 |
| POST /api/sync/v1/deletions/{user_id}/ack | vault_removed_at, run_id | user_id, status deleted or already_done | repeatable: a retried ack returns already_done when the stub is gone and deletion_log holds the user id's hash | 404 only for an id never deleted |
| POST /api/sync/v1/digest/send | week_key | status sent, resumed or already_sent, count | claims digest_run with a lease; sends only to recipients with no email_send row for this digest; announces roles only for users whose push run finished and whose proposals are finalized | 409 if week_key is not current |

### 4.3 Event kinds on the stream

| Kind | Payload | Written by |
|---|---|---|
| overlay.approved | user_id, version, sha256 | operator approve action |
| resume.uploaded | user_id, resume_id, sha256, replaces_sha256 or null | upload route |
| decision.recorded | decision_id, posting_id, external_id, decision, reason_code, text, disputed, week_key, at | decide action |
| build.requested | build_id, posting_id, external_id, needs_draft_review, requested_at | ask-for-resume action |
| build.draft_approved | build_id, approved_draft json | draft approval action |
| build.cancelled | build_id | cancel action |
| application.confirmed | application_id, posting_id, external_id, build_id, applied_on, applied_tz, via, referral_name, tier, confirmed_sha256, master_sha256 | I applied action |
| reply.recorded | reply_id, application_id, external_id, kind, on, note | reply action |
| master.approved | master_id, user_id, profile_id, version, sha256 | master approve action |
| survey.answered | survey_id, user_id, week_key, question_id, answer | survey page |
| participant.paused, participant.resumed | user_id | operator |
| deletion.requested | user_id, vault_slug, requested_at, reason | delete action or retention cron |

Each event is written in the same batch as the primary write, with user_id stored as text and no foreign key. Payloads are personal data: decision text, referral names, reply notes, survey answers and approved drafts. Deletion therefore purges the user's event rows at request time, keeping only the deletion.requested event, and the vault ack removes that one too, as WS9 describes. The engine must apply events idempotently, keyed by event id, because a vault restored from a snapshot will rewind its cursor and replay them.

### 4.4 The order sync.py calls them

Sunday, from the Mac: ping, which refuses to continue if env or the contract major does not match the key file's expectation; pull, which fetches participants, writes overlay.json for any approved version newer than the local copy, downloads a resume whose sha differs, then reads events after the cursor into inbox jsonl files and advances the cursor only after the files are written; vault-created for each newly approved participant after the Makefile builds the vault from the template; run sweep around the one shared sweep; per vault, run fit, push-postings in chunks, then finalize-proposals with the full list; push-coverage once for the sweep; ack-deletion for each deletion in the inbox after the vault folder is gone; digest-send; then Kem logs time in /admin. A skipped week needs none of this; the next ping shows the whole backlog and one pull catches up.

On a build request, weekdays: pull picks up build.requested; if needs_draft_review, Kem pushes the draft with status draft_review and waits for build.draft_approved on the next pull; otherwise Kem builds; then push-build with status uploading and the expected hash, then the raw PDF; the portal verifies the hash, moves the build to ready and emails the user.

### 4.5 Export scrub rules

The portal rejects a postings item if any string field other than url has a filesystem path shape: /Users/ or /home/ followed by a name and a slash, at the start of the string or after whitespace or a quote, or a leading tilde slash, so a careers URL with /home/ in it passes; if card_json contains a key outside the allowlist in contracts/posting-export.schema.json; if the excerpt exceeds 2,000 characters; if the item's user_id differs from the body's user_id; if any string contains another participant's user_id; if the url is not http or https. A CHECK constraint repeats a strictly narrower version of the path rule, so the per-item rejection always fires first and one bad item never aborts the whole insert. The engine does its own scrub pass first, and sync.py validates against the JSON Schema before sending.

### 4.6 The reference client

engine/sync.py targets Python 3.9 or later, which has zoneinfo, and uses only urllib, json, hashlib, argparse and pathlib [plan; floor confirmed with Kem in section 8]. One function per endpoint. Automatic chunking to 200 postings. Client-side refusal of any file over 4,194,304 bytes with a plain message. A 30 second timeout, three retries with 2, 4 and 8 second backoff on connection errors, timeouts, 5xx and 429, never on other 4xx; the first Sunday call pays the Neon cold start [research]. Distinct messages for 401, 409, 413, 422 and env_mismatch. The cursor file is advanced only after the caller's callback returns. Configuration from SYNC_URL and SYNC_TOKEN, or from the vault's gitignored key file, with separate entries for production and staging. A CI job byte-compiles it and runs its tests on Python 3.9, so the stated floor is proven rather than assumed.

## 5 Data model as Drizzle tables

### 5.1 Conventions

All ids are text to match better-auth. All timestamps are timestamptz. Dates typed by users are date columns with a timezone column beside them. Vocabularies owned by the engine are text columns validated by zod, so a new fit value, status, tier or facet key needs no migration. Vocabularies owned by the portal are Postgres enums. bytea columns are declared with customType because 0.45.4 has no helper [research], carry a CHECK of octet_length at most 4,194,304, and are set to STORAGE EXTERNAL by a custom migration because PDFs are already compressed [research]. List queries select explicit columns so bytes never travel, and no bytea column is ever read through a relational-query JSON select [research]. Every per-user table references user.id with ON DELETE CASCADE except sync_event, deletion, deletion_log and access_log, which keep user_id as plain text. Deletion still reaches them: WS9 purges the user's sync_event rows, hashes access_log.subject_user_id and nulls its detail_json.

### 5.2 Tables

Auth tables, generated by pnpm dlx auth@1.7.12 generate and never hand-edited, because the proof showed hand-written copies drift on index names and updated_at defaults [proof]: user with id, name, email unique, email_verified, image, created_at, updated_at, role, banned, ban_reason, ban_expires; session with id, token unique, expires_at, ip_address, user_agent, user_id cascade, impersonated_by, created_at, updated_at; account with id, account_id, provider_id, user_id cascade, password, the token columns, created_at, updated_at; verification with id, identifier, value, expires_at, created_at, updated_at; rate_limit with key, count, last_request, because the core limiter is otherwise in memory [research].

| Table | Columns |
|---|---|
| participant | user_id PK, state enum, vault_slug, timezone, invited_at, invited_by, password_set_at, intake_started_at, intake_submitted_at, approved_at, vault_created_at, activated_at, paused_at, last_activity_at, deletion_requested_at, digest_optout_at, unsubscribe_token unique, resume_changed_since_master bool, notes |
| profile | id PK, name, description, node, ruling_status, status text, version, lookup_version, example_titles jsonb, form_json, pay_range_json, sha256, listed bool, sort_order, pushed_at |
| user_profile | user_id, profile_id, is_primary; unique on user_id and profile_id; partial unique on user_id where is_primary; at most two rows per user, enforced in the batch helper and a trigger |
| invite | id, user_id, token_sha256, expires_at seven days out, used_at, created_by |
| overlay | user_id PK, sections_json keyed by form, form_progress_json with started_at and completed_at per form, status enum, submitted_at, returned_note, updated_at |
| overlay_version | id, user_id, version, json, sha256, approved_at, approved_by; unique on user_id and version |
| resume_file | id, user_id, bytes bytea, byte_length, mime, original_filename, sha256, uploaded_at, superseded_at, storage_key nullable |
| record_draft, only with decision 16 option b | id, user_id, resume_sha256, json, sha256, pushed_at, confirmed_at |
| master | id, user_id, profile_id, version, markdown, sha256, status enum, source_resume_sha256, honest_gap_prompt, honest_gap_answer, drafted_at, approved_at; unique on user_id, profile_id, version |
| claim | id, master_id, position, text, basis, status enum, user_note, resolved_at |
| posting | id, user_id, profile_id, external_id, company, role, url, location, comp_min, comp_max, fit text, fit_why, pick_reason, facets_json, card_json, excerpt, engine_status text, status_date, source_board text, tier_hint text, proposed bool, rank, posting_date, week_key, first_seen_week, last_seen_week, run_id, sha256, pushed_at; unique on user_id and external_id |
| decision | id, user_id, posting_id, decision enum, reason_code text, text, disputed bool, week_key, at; append-only |
| proposal_week | user_id, week_key, run_id, count, finalized_at; unique on user_id and week_key |
| coverage | profile_id, week_key, seen, passed, written, qualified, proposed, serp_searches, run_id; unique on profile_id and week_key |
| build | id, user_id, posting_id, revision, status enum, needs_draft_review bool, draft_json, master_id, master_sha256, keywords jsonb, tailored bool, gate_transcript, pdf_bytes bytea, expected_sha256, pdf_sha256, pdf_byte_length, filename, storage_key nullable, tier text, requested_at, built_at, downloaded_at, cancelled_at, failed_at, error, run_id |
| application | id, user_id, posting_id, build_id nullable and unique, so an application sent with the user's own resume is still recorded, applied_on date, applied_tz, via enum, referral_name, tier text, confirmed_sha256, master_sha256, follow_up_due_on, follow_up_second_on, stale_on, written_off_at, created_at |
| reply | id, user_id, application_id, posting_id, kind enum, on date, note, created_at |
| run | id, actor enum engine or portal or cron, kind text, user_id, week_key, status enum, started_at, finished_at, counts_json, log_tail, host, engine_version, idempotency_key unique |
| sync_event | id bigserial, kind text, user_id text no FK, payload jsonb, created_at |
| sync_receipt | idempotency_key PK, endpoint, status, response_json, created_at |
| access_log | id, at, actor_kind enum, actor_id, subject_user_id text no FK, action, endpoint, run_id, detail_json |
| consent_text | id, kind enum, version, body_md, published_at; unique on kind and version |
| consent | id, user_id, kind enum pilot or retention, text_id FK, granted_at, revoked_at, retention_days nullable |
| placement.staffing_optin, in Postgres schema placement | user_id, text_id, opted_in_at, revoked_at |
| deletion | id, user_id text with no FK, vault_slug, reason enum user or retention or consent_revoked, requested_at, portal_purged_at, vault_acked_at, completed_at, status enum |
| deletion_log | id, email_sha256, requested_at, portal_purged_at, vault_acked_at, counts_json; no user id |
| digest_run | id, kind enum digest or skip_notice or followup or retention or survey4, key, status enum, claimed_at, lease_expires_at, finished_at, sent_count, error, counts_json with the Resend daily-quota header; unique on kind and key |
| time_log | id, operator_id, at, minutes, kind text, user_id nullable, note |
| survey | id, user_id, kind weekly or process, week_key, question_id, question, answer, token unique, digest_run_id, asked_at, answered_at |
| email_send | id, kind, to_email_sha256, idempotency_key unique, sent_at, provider_id, daily_quota_remaining |

### 5.3 Enums

Portal-owned: participant_state, overlay_status, master_status, claim_status with safe, safe_as_written, retired, decision_kind with apply, stretch, pass, build_status, application_via with portal, email, referral, reply_kind with screen, interview, offer, rejected, no_response, withdrawn, consent_kind, run_status, run_actor, actor_kind, deletion_reason, deletion_status, digest_kind, digest_status. Engine-owned, as text with zod: posting.status, fit, tier_hint, source_board, the six facet keys, profile.status, reason_code. The reason codes are the scope's ten, too_senior, too_junior, wrong_field, location, pay, not_interesting, outshone, duplicate, posting_gone, other [scope], plus verdict_wrong for a dispute, in contracts/reason-codes.json shared with the engine.

### 5.4 Indexes and constraints

posting on user_id plus week_key plus proposed; decision on posting_id plus at descending; build on user_id plus status; application on user_id plus stale_on; sync_event on id, which bigserial gives; access_log on subject_user_id plus at; run on week_key plus kind. The CHECKs: byte lengths and the narrower path-scrub backstop on posting text columns. applied_on not in the future is checked in app code in the user's timezone, because a CHECK evaluates in the database's zone, UTC on Neon.

### 5.5 Entity states

participant: invited, password_set, intake_in_progress, intake_submitted, changes_requested, intake_approved, vault_created, master_in_review, master_approved, active, paused, deletion_requested, vault_pending, deleted. overlay: draft, submitted, changes_requested, approved, superseded. master: in_review, approved, superseded. build: requested, drafting, draft_review, approved_draft, building, uploading, ready, downloaded, sent, cancelled, failed; stalled is derived when ready has no application after 7 days [scope]. application: sent, follow_up_due at the overlay's follow_up_days, default 7 [plan], second follow-up at twice that [plan], stale at 21 days [scope], written_off or replied. deletion: requested, portal_purged, vault_pending, done. docs/states.md is kept in sync with src/lib/contracts/states.ts by a test.

### 5.6 What differs from the scope and why

1. The scope says user, session, account, verification as in gallery-os with invite codes; this plan generates the auth tables with the CLI and adds the admin plugin's columns, plus one small invite table with a hashed 7-day token, because invites are operator-created users, decision 4, and the global reset token keeps its 1-hour default.
2. The scope has one overlay row with json, version and approved_by_kem_at; this plan splits a working draft from immutable overlay_version rows because the engine's copy must be reproducible, re-pulls must be no-ops, and the engine must keep the last approved version while the user edits.
3. The scope's profile carries display fields only; this plan adds form_json because forms 3 and 5 tick kinds, tools and employer types from the profile [scope].
4. The scope's resume_file and build store bytes with no cap; this plan caps at 4,194,304 bytes because Vercel's function payload limit, not Postgres, is the ceiling [research], adds filename, byte length and a nullable storage_key so a later move to object storage needs no row migration.
5. The scope's posting has week; this plan adds external_id, week_key, first_seen_week, last_seen_week, proposed, rank, facets_json and run_id so pushes are idempotent and week membership survives a skipped week [scope engine housekeeping row].
6. The scope's decision is a plain row; this plan makes it append-only with disputed and week_key, because reason codes are the answer key the eval loop needs [scope].
7. The scope's build has no state; this plan adds the state machine including draft_review and approved_draft, because the operating model says heavy-portal tailored copy and a cover letter are approved by the user first [scope].
8. The scope's application has applied_at; this plan stores applied_on plus applied_tz and derives the follow-up dates, and adds master_sha256, because the feedback schema lists the master hash [scope].
9. The scope's consent holds pilot, retention and staffing_optin; this plan adds consent_text so each grant cites the exact wording, including the statement that resumes and postings go to the Claude API [scope], and moves the staffing opt-in into a separate Postgres schema that the job-search code cannot import, which is stronger than role-gated reads.
10. The scope's run is per engine stage; this plan adds portal and cron actors and an idempotency key, plus sync_event, sync_receipt, access_log, digest_run, time_log, deletion, deletion_log and email_send, each for one verified platform fact: best-effort cron, the shared mail quota and two-sided deletion. proposal_week and coverage exist for the finalize call and the four-week profile review, and posting gains pick_reason for the scope's "reason it was picked" [scope].

### 5.7 The overlay, field by field

The scope lists what the person supplies and where each item lives in the engine today [scope]. This is the field list contracts/overlay.ts encodes. "Report only" means the engine stores and shows it and never scores on it.

| Form | Field | Required | Use | Engine consumer [scope] |
|---|---|---|---|---|
| 1 | primary_profile_id; secondary_profile_id; not_sure, which the operator resolves with Assign profile | primary, or not_sure | scored | source.py, week.py, apply.py, stamp.py |
| 2 | name_printed, email, phone, linkedin_url, site_url, resume_filename | name, email, resume_filename | identity for the PDF | stamp.py, apply.py, master frontmatter |
| 2 | metro, remote_ok, relocation, country | metro or remote_ok | scored | source.py, serp.py, triage.py |
| 2 | pay_floor_annual, pay_floor_hourly | one of the two | scored | fit.py, source.py, week.py |
| 2 | max_travel_pct, max_onsite_days, other_limits | no | scored | profile.json limits |
| 2 | work_authorization, clearance | no | report only, never scored [scope] | none |
| 2 | timezone | yes | portal clocks only | none |
| 3 | roles: title, employer, employment_type, start_month, end_month or current, kinds each with one evidence line from the resume | at least one role | scored | record.py, fit.py |
| 3 | tools from the profile's list, plus free text | no | scored | profile.json tools |
| 3 | highest_degree, phd, certifications from CISA, CIA, CPA, AIGP, ISO 42001 LA and CIPP, bar_admission for L1 only | degree | scored | profile.json credentials |
| 3 | rung, manages_people, stretch_years | rung | scored | fit.py ceiling words |
| 5 | screen_domains, interest_ranking over the profile's employer types | no | scored | profile.json screens and interests |
| 5 | projects, up to four with a link; target_employers, up to 50 by name and site | no | scored | profile.json projects; Target Accounts |
| 5 | apps_per_week, heavy_portal_per_week | yes | allocation, tier cap | week.py |
| 5 | already_applied, interviews_in_progress | no | the stop rule's starting state | week.py, status.py |
| operator | follow_up_days, default 7 [plan] | no | follow-up clock | status.py today; the portal under decision 19 |

Form 4 writes resume_file and later the master and claims, not the overlay. Form 6 writes consent rows, and the staffing opt-in writes only to the placement schema.

## 6 Workstreams

Effort is in session-days [plan]. Tests are two tiers throughout: contract-tier vitest with no database, which continuous integration runs on every pull request, and database-tier route tests that a session runs against the staging branch.

### WS0 Foundation, upgrade, interim landing

| | |
|---|---|
| Steps | 1 git apply docs/plan/proof-of-stack.patch, which carries the proof's package additions, .env.example, drizzle.config.ts, drizzle/0000 and meta, src/lib/db.ts, auth.ts, auth-schema.ts, proxy.ts, the auth route, the sync ping route; add !.env.example to .gitignore; set the proxy matcher to /app and /admin with its redirect to /sign-in; add a stub sign-in page; switch the ping route to compare the sha256 of the presented token against SYNC_TOKEN_SHA256; replace the layout's Create Next App metadata. 2 Upgrade next and eslint-config-next to 16.4.2, react to 19.3.1, @types/node to 22; engines node 22 or later; cacheComponents left off; re-run the proof's build and smoke checks. 3 Install react-email, vitest and tsx and rebuild, closing the dependency gap the proof did not cover. 4 Write scripts/make-sync-token.ts, scripts/migrate.ts using the neon-http migrator and scripts/vercel-build.sh, then add the package scripts, all .ts scripts run through tsx: typecheck, test, db:generate, db:migrate via scripts/migrate.ts using the neon-http migrator, db:check, auth:generate, contracts:json, build:vercel. 5 src/lib/env.ts. 6 Portal placeholder at /app and the auth page shells; proxy matcher /app and /admin; root untouched. 7 CI workflow: install frozen, lint, typecheck, contract tests, drizzle-kit check, migration-committed guard, next build with dummy auth secret and URL, and a Python 3.9 job for engine/sync.py. If the session cannot push workflow files, Kem commits ci.yml from the session's draft. 8 docs/setup.md, docs/decisions.md with the defaults from section 9, CLAUDE.md, README. 9 Silence the postcss lint warning. |
| Files | package.json, pnpm-lock.yaml, .gitignore, .env.example, next.config.ts, drizzle.config.ts, drizzle/, src/lib/db.ts, src/lib/auth.ts, src/lib/auth-schema.ts, src/lib/env.ts, src/proxy.ts, src/app/api/auth/[...all]/route.ts, src/app/api/sync/v1/ping/route.ts, src/app/app/page.tsx, scripts/migrate.ts, scripts/vercel-build.sh, .github/workflows/ci.yml, CLAUDE.md, README.md, docs/setup.md, docs/decisions.md |
| Effort | 2 |
| Depends on | nothing for the code; WS13 step 1 reaching main for any Vercel production deployment |
| Exit | the branch builds clean on 16.4.2 with only the two auth variables; CI green on a pull request; next start answers /api/sync/v1/ping with 401 without a token and 200 with one; once WS13 step 1 has retired the paid page and Vercel is connected, the staging host builds a session-authored commit |
| Tested by | the proof's smoke script re-run; CI; one manual preview check |

### WS1 Auth, roles, invites, email sender

| | |
|---|---|
| Steps | 1 src/lib/access.ts: createAccessControl with roles operator, user, placement. 2 src/lib/auth.ts: admin plugin with ac, roles, adminRoles operator, adminUserIds from env, impersonation disabled; emailAndPassword enabled with disableSignUp true, requireEmailVerification true, sendResetPassword, revokeSessionsOnPasswordReset true, the reset token at its 1-hour default; emailVerification.sendVerificationEmail; rateLimit.storage database; cookieCache off; nextCookies last. Regenerate auth-schema.ts; db:generate migration 0001. 3 src/lib/email/send.ts constructing Resend per call and scheduling with after from next/server; src/lib/email/budget.ts with a per-address cap of 3 sends a UTC day for unauthenticated triggers only, password reset and verification resends, recorded in email_send; send.ts awaits the send directly when no request scope exists, so scripts can use it; templates invite, reset, verify, build-ready, master-ready, deletion-confirm, retention-warning as react-email TSX rendered to html and text. 4 src/lib/session.ts: requireSession, requireRole, currentParticipant. 5 Pages sign-in, set-password, forgot-password, verify-email; auth-client.ts with adminClient. 6 Invite action: refuse a participant beyond the pilot cap of 10 in src/lib/limits.ts [scope]; createUser with a random 32-byte password, role user, data emailVerified true, passing the operator's headers; insert participant invited and an invite row with a sha256-hashed token that expires in 7 days; email the /set-password?invite= link, and the page checks the token and sets the password server-side; when RESEND_API_KEY is unset or the domain is unverified, print the set-password URL to the operator instead of failing. scripts/invite.ts does the same from a shell. 7 scripts/bootstrap-operator.ts and the create-admin command documented. 8 Verification on the staging host, recorded in docs/verification.md: proxy plus React Server Component session read plus server-action sign-in sets cookies; better-auth/cookies resolves under Turbopack; the invite token sets a password for an admin-created account; reset works with the 1-hour token; data.emailVerified is honoured; /admin returns 403 for role user. |
| Files | src/lib/access.ts, src/lib/auth.ts, src/lib/auth-schema.ts, src/lib/auth-client.ts, src/lib/session.ts, src/lib/email/send.ts, src/lib/email/budget.ts, src/lib/email/templates/*.tsx, src/app/sign-in, set-password, forgot-password, verify-email, src/app/admin/participants/actions.ts, scripts/invite.ts, scripts/bootstrap-operator.ts, drizzle/0001, docs/verification.md, tests/contract/auth-config.test.ts |
| Effort | 3 |
| Depends on | WS0; decisions 3, 4, 12, 15; the network need for the staging checks |
| Exit | Kem signs in as operator on production; an invited second address receives the set-password mail or the operator sees the printed link, sets a password, lands in /app; sign-up POST is refused; an 11th invite is refused; the verification checks pass on the staging host |
| Tested by | contract tests of the access control and the invite token; the staging verification pass; database-tier test of the invite action |

### WS2 Domain schema, contracts, week logic, placement isolation

| | |
|---|---|
| Steps | 1 src/lib/schema/*.ts per the section 5 tables; index.ts excludes placement.ts; drizzle.config.ts lists auth-schema, schema/index and schema/placement; src/lib/db.ts merges auth and domain schema objects, keeping the lazy proxy. 2 src/lib/db/columns.ts bytea customType; src/lib/db/batch.ts typed helpers for intake submit, approve, decide, request build, draft approve, applied, reply, delete; every helper mints ids in app code, uses INSERT then SELECT for version numbers, and writes the sync_event row in the same batch; an eslint no-restricted-syntax rule forbids db.transaction. 3 src/lib/contracts: overlay, posting-export with the facet keys and card_json allowlist, build-push, master-push, profile-mirror, events, reason-codes, states; contracts:json writes contracts/*.schema.json. 4 src/lib/week.ts with weekKey and previousWeekKey in the operator's timezone, tested around Sunday night and year boundaries. 5 Declare the placement pgSchema and the CHECKs in TypeScript, which drizzle-kit 0.31.11 already emits; the custom migration holds only ALTER COLUMN SET STORAGE EXTERNAL. 6 eslint no-restricted-imports for src/lib/placement and src/lib/schema/placement, with the five named importers from section 3.4 as the only exceptions. 7 scripts/seed.ts for profiles from contracts/profiles, consent_text from content/consent, and the persona fixture; scripts/reset-staging.ts drops and re-migrates and reseeds the staging branch. 8 Migrations applied to the staging branch. |
| Files | src/lib/schema/*.ts, src/lib/schema/placement.ts, src/lib/placement/db.ts, src/lib/db.ts, src/lib/db/batch.ts, src/lib/db/columns.ts, src/lib/contracts/*.ts, contracts/*.schema.json, src/lib/week.ts, drizzle/0002 and 0003, eslint.config.mjs, scripts/seed.ts, scripts/reset-staging.ts, fixtures/persona/*, tests/contract/*, tests/db/schema.test.ts |
| Effort | 3 |
| Depends on | WS0; decisions 6, 10, 14; the engine vocabulary need; the network need for migrations |
| Exit | migrations apply to the staging branch through the HTTP migrator, from a session once Neon is allowed, otherwise from GitHub Actions; contract tests green; schema files committed; a deliberate placement import fails lint; a test with a failing second statement proves the batch rolls back |
| Tested by | contract tier for zod and week logic; database tier for constraints, append-only decisions, one primary per user, batch rollback |

### WS3 Operator console

| | |
|---|---|
| Steps | 1 /admin layout with requireRole operator and the nav; Placement item visible only to role placement. 2 Week view: week_key, per participant last pull and push and proposed count, digest_run state, backlog counts from the same query as ping, a banner when the last push is older than 7 days, and the Sunday sweep's duration against the scope's 90-minute trigger for fetch-once [scope]. 3 Participants: list by state with age, invite form, detail with pause, resume, resend invite, state history. 4 Runs and Time: run rows filterable by week and kind; time_log quick-add buttons prefilled from run durations; rollup per user per week against 75 minutes and 10 hours a week [scope]. 5 Intake review: the six forms read-only beside the exact overlay JSON the pull will export, validated against the contract; Approve inserts overlay_version via INSERT then SELECT, sets participant intake_approved and emits overlay.approved; Request changes with a note; Assign profile, for a user who chose "not sure" on form 1. 6 Builds queue with ages and a 48-hour colour; cancel. 7 Profiles mirror; Review page for reason codes and surveys, filled in WS10. 8 Deletions page with vault-ack ages. 9 Placement page at /placement with its own layout, listing opted-in users from the placement store only, CSV export; users whose only profile is V4 are withheld until the Eval Ops ruling, scope decision 1; scripts/bootstrap-operator.ts gives Kem both the operator and placement roles. 10 access_log rows on every intake, resume, PDF or placement read. |
| Files | src/app/admin/**, src/lib/queries/admin.ts, src/lib/participant-state.ts, tests/db/admin.test.ts |
| Effort | 5 |
| Depends on | WS1, WS2 |
| Exit | with fixtures on a preview, Kem performs the Sunday and Friday operator runbook end to end without the engine; the placement page is unreachable without the placement role and shows nothing but name, email, date and text version |
| Tested by | database-tier tests of approve and invite; a manual runbook walk recorded in docs/verification.md |

### WS4 Sync API and the reference client

| | |
|---|---|
| Steps | 1 Week 1, before the console: docs/sync-contract.md, the contracts, engine/sync.py with ping, runs and the pull commands working against the ping and participants stubs, scripts/make-sync-token.ts. 2 src/lib/sync/auth.ts with current and previous hashes, the X-Sync-Version check, the env echo, and an access_log row per call. 3 src/lib/sync/events.ts, receipt.ts, scrub.ts. 4 Route handlers for every endpoint in section 4.2, the finalize-proposals and coverage endpoints included; maxDuration 60; 413 before parsing when Content-Length exceeds the cap. 5 Postings upsert as one multi-row INSERT ON CONFLICT per request. 6 Build endpoints: 404 on unknown id; state machine; the PDF route recomputes the sha, compares it with the header and expected_sha256, and only then moves the build to ready. 7 engine/sync.py completed: push-postings with chunking, push-build in two calls, push-master, push-profiles, vault-created, ack-deletion, digest-send, run wrapper; the inbox layout vaults/slug/overlay.json, resume file, inbox/events.jsonl, state/cursor. 8 scripts/sync-smoke.sh: start next start against the staging branch, push fixtures, insert a decision through the app action, pull events, assert the cursor advances, repeat the push and assert zero changes; kill a run between build metadata and PDF and assert the build stays in uploading; insert two events out of sequence order and assert neither is skipped. 9 docs/engine-handoff.md listing every field the contract expects and every engine invariant the portal relies on: event application is idempotent by event id; the claims diff is re-run on an approved draft before building; postings are deduped across Kem's own vault and the user-zero vault by external_id; the vault layout in step 7 is a proposal Kem confirms in week 2. |
| Files | src/lib/sync/*.ts, src/app/api/sync/v1/**/route.ts, engine/sync.py, engine/README.md, docs/sync-contract.md, docs/engine-handoff.md, scripts/make-sync-token.ts, scripts/sync-smoke.sh, fixtures/sample-export.json, tests/contract/sync-schemas.test.ts, tests/db/sync-routes.test.ts |
| Effort | 4.5 |
| Depends on | WS2 for steps 2 to 9; nothing for step 1; decision 5 |
| Exit | from a Mac shell, sync.py pull writes the inbox and overlay.json; push-postings with fixtures/sample-export.json shows roles in /app/week; every push replays as a no-op; a wrong token is 401; a mismatched env is refused by the client; a 5 MB body is 413 with a clear message; Kem signs off docs/sync-contract.md |
| Tested by | contract tier for schemas and scrub; database tier for upsert replay and state transitions; sync-smoke.sh in CI against a local next start when the staging secret is available, otherwise run by a session |

### WS5 Intake: six forms, resume upload, consent

| | |
|---|---|
| Steps | 1 /app layout with the participant-state gate. 2 Forms as /app/intake/[step] with server actions on plain form elements for progressive enhancement; zod per section, field by field as in section 5.7; each save patches sections_json and form_progress for the intake-completion metric [scope]; progress bar. Form order: 1 which work, 2 you and your logistics including timezone, 4a resume upload, 3 your record, 5 preferences, 6 consent, so that pre-fill under decision 16 can precede the record form. 3 Form 1 reads listed profiles with description and three example titles plus "not sure, let Kem suggest" [scope]. 4 Form 3 job cards tick kinds and tools from the chosen profile's form_json; the bar-admission field appears only when a held profile's form_json lists it, which is L1 only, scope decision 5; if decision 16 chooses option b, the record_draft pre-populates the cards for confirmation. 5 Upload via Route Handler: PDF or Word MIME and magic bytes, cap 4,194,304 bytes with the cap stated on the page, sha256, one current row per user, previous row superseded, and its bytes deleted on the first sync resume download that serves the new sha256; emits resume.uploaded; sets resume_changed_since_master when a master exists. 6 Form 6: pilot consent required, retention as a required radio with no preselected option, both referencing consent_text ids; the staffing opt-in on its own screen at /app/staffing, unchecked, writing only to the placement store, revocable from /app/profile. A current-version gate in /app/layout forces re-consent when a consent text changes, and the sync lists a participant with stale pilot consent as consent_stale with no overlay. 7 Submit: one batch sets overlay submitted, participant intake_submitted; emails the operator. 8 /app/profile lets an approved user edit, creating a new submitted draft while the approved version stays what the engine reads. |
| Files | src/app/app/layout.tsx, src/app/app/intake/**, src/app/app/staffing/page.tsx, src/app/app/profile/**, src/app/api/app/resume/route.ts, src/components/forms/*, src/lib/contracts/overlay.ts, content/consent/*.md, tests/contract/overlay.test.ts, tests/db/intake.test.ts |
| Effort | 5 |
| Depends on | WS1, WS2; decisions 16, 20; profile JSON need |
| Exit | Kem completes intake as user zero in under 45 minutes by section timestamps [scope]; the overlay JSON validates against contracts/overlay.schema.json; a 5 MB upload is refused with a message; the staffing screen writes nothing outside the placement schema, proven by a test that greps the sync and export payloads |
| Tested by | contract tier for every section schema; database tier for submit and supersede; the manual timed run |

### WS6 Results loop, user side

| | |
|---|---|
| Steps | 1 /app home by state. 2 /app/week: proposed postings for the current week_key first, undecided proposals from earlier weeks labelled by week, then everything judged this week, grouped by profile when a user holds two; each card shows the six facets, fit_why and pick_reason; a week appears only after its proposals are finalized. 3 Decide: apply, stretch or pass; pass requires a reason code; dispute text on any posting; one batch writes decision plus event. 4 Ask for the resume: build requested with needs_draft_review from tier_hint; queue position and expected turnaround; cancel while requested. 5 /app/ready: draft_review builds show keywords, tailored copy and cover letter for approve or edit; an edited draft is checked against the approved claims, and any figure without a claim row is flagged before approval; ready builds show the posting link and the keywords the gate checked, and offer the PDF via the download route, which streams pdf_bytes with the upload filename, sets downloaded_at and writes access_log; "still waiting on you" for ready builds with no application after 7 days. 6 I applied, from /app/ready or from any posting on /app/week, so an application sent with the user's own resume is still recorded with build_id null: date defaulting to today in the user's timezone and never in the future, route, referral name, tier shown; one batch writes application with confirmed_sha256 and master_sha256, posting status applied in the portal's view, build sent, and the event. 7 /app/sent: follow-up state from applied_on in the user's timezone; record a reply; write-off past 21 days as a reply of kind no_response. 8 /app/data: the export streamed as NDJSON, because one JSON body can pass the 4.5 MB response cap and streaming lifts it [research], plus per-file links, the access log, and the delete entry point. Every file route sends Content-Disposition attachment with an RFC 6266 UTF-8 filename and X-Content-Type-Options nosniff. |
| Files | src/app/app/page.tsx, week/**, ready/**, sent/**, data/**, src/app/api/app/builds/[buildId]/pdf/route.ts, src/app/api/app/export/route.ts, src/lib/queries/user.ts, src/lib/followups.ts, src/components/fit-card.tsx, src/components/reason-code-picker.tsx, tests/db/results.test.ts |
| Effort | 5 |
| Depends on | WS4, WS5; decision 5, decision 19 |
| Exit | on a real push, Kem decides every proposal with codes, requests a build, approves a draft, downloads a sha-identical PDF, records I applied and a reply; the application carries route, tier and referral by construction [scope]; no applied date exists before the click |
| Tested by | database tier for each batch helper and ownership checks; the end-to-end sync-smoke run |

### WS7 Master review and claims register

| | |
|---|---|
| Steps | 1 /app/master renders the pushed markdown, the roles' dates to confirm, the claims table with basis and status, the honest-gap prompt and one-sentence answer; approve requires every claim resolved, writes approved_at and sha256 in one batch, emits master.approved, moves the participant to master_approved. 2 A re-push supersedes only an unapproved version. 3 Operator view of claims completeness; the engine-side rule that no tailored bullet introduces a figure without a row is displayed as a failed-build reason when reported. |
| Files | src/app/app/master/**, src/app/admin/participants/[userId]/claims.tsx, src/lib/contracts/master-push.ts, tests/db/master.test.ts |
| Effort | 2 |
| Depends on | WS4, WS6 |
| Exit | user zero approves a master pushed from the Mac with every claim resolved; a second push supersedes correctly |
| Tested by | database tier |

### WS8 Email and scheduling

| | |
|---|---|
| Steps | 1 src/lib/digest.ts: per user, new proposals once that user's push run has finished and the week's proposals are finalized, else "No new roles this week"; a skip notice and a roles digest use different keys, so a push that lands after Monday's skip notice still sends a roles digest; follow-ups due; one rotating question creating a survey row with a signed link; visible unsubscribe link plus List-Unsubscribe and List-Unsubscribe-Post headers; skips digest_optout. 2 Sends are one resend.emails.send per user with Idempotency-Key digest, week_key and user_id, because per-email headers inside a batch are unverified [research]; under 100 recipients this is well inside 10 requests a second; the daily-quota header is logged to digest_run.counts_json. 3 /api/cron/digest: CRON_SECRET check; claim digest_run with a 10-minute lease; write an email_send row per recipient; a re-run after an expired lease or a failure sends only to recipients with no row, so a send killed at the 300-second ceiling resumes instead of going silent; maxDuration 300. Admin "send now" and the sync digest-send call the same module. 4 /api/cron/followups Friday: user prompts at follow_up_days, twice that, and 21 or more days, with write-off links that open a confirm page; the operator summary to OPERATOR_EMAIL with build backlog ages, undecided proposals, intake awaiting approval, deletion acks pending more than 7 days, retention deletions pending, and the week's time against the ceiling. 5 Transactional sends: build ready and master ready to the user, at most one of each per user a day with later ones folded in; build requested and intake submitted reach Kem through the /admin queue and the daily summary, not one mail each. 6 vercel.json crons: digest Monday 13:00 UTC, followups Friday 13:00 UTC, retention daily 04:00 UTC, numeric day-of-week, pending decision 9; the four-weekly process survey from the scope's operating model [scope] goes to each user every fourth week from activated_at, claimed as digest_run kind survey4. 7 /s/[token] and /u/[token] render a confirm page on GET and write only on a button POST, because mail scanners prefetch links; only the RFC 8058 List-Unsubscribe-Post POST acts directly. 8 Any cron failure after a claim emails the operator from the catch block and marks digest_run failed. |
| Files | src/lib/digest.ts, src/lib/email/templates/digest.tsx and friday.tsx, src/app/api/cron/*, src/app/s/[token]/page.tsx, src/app/u/[token]/route.ts, vercel.json, tests/contract/digest.test.ts, tests/db/cron.test.ts |
| Effort | 3 |
| Depends on | WS2, WS6; decision 9; Resend domain verified; CRON_SECRET |
| Exit | invoking the digest route twice in a week sends once; a digest killed after N sends resumes with the rest; a GET on any email link changes nothing; a week with no push yields the skip-week digest; a day-7 application triggers a Friday prompt; Kem receives the Friday summary; unsubscribe works with one click |
| Tested by | contract tier for content assembly; database tier for the claim; a manual preview trigger with CRON_SECRET |

### WS9 Deletion, retention, export

| | |
|---|---|
| Steps | 1 Delete action: ban the user and revoke sessions; in one batch purge every job-search row and the user's event rows, keeping a deletion stub with user_id as text and vault_slug plus the deletion.requested event; participant deletion_requested; the user is signed out and told the vault copy is removed on the next Sunday run and that a confirmation follows. 2 The deletion stays visible to the sync until the ack; the ack hard-deletes the user and the stub, removes the placement row and the remaining event, hashes access_log.subject_user_id and nulls its detail_json, writes deletion_log with the email and user-id hashes and counts, and only then sends the confirmation email. That email says when Neon's 6-hour history, the latest manual snapshot and Resend's 30-day log age out [research]; the privacy text says the same. A retried ack returns already_done. 3 Retention cron: users with retention_days 90 [scope] and no activity for 83 days get a warning with a one-click keep link; at 90 days the deletion flow starts; claims digest_run kind retention by date. 4 scripts/check-deleted.ts searches every table, jsonb payloads and run.log_tail included, for the user id, the email and the vault_slug. 5 Revoking pilot consent follows decision 23. |
| Files | src/app/app/data/actions.ts, src/lib/deletion.ts, src/lib/retention.ts, src/app/api/cron/retention/route.ts, src/app/api/sync/v1/deletions/[userId]/ack/route.ts, scripts/check-deleted.ts, tests/db/deletion.test.ts |
| Effort | 2 |
| Depends on | WS4, WS6; decisions 13, 21, 23 |
| Exit | a deleted test user leaves no trace in any table after the ack, as check-deleted shows; before the ack, bytes are gone and the deletion is visible to pull; the confirmation mail goes only on ack |
| Tested by | database tier plus check-deleted |

### WS10 Pilot metrics and the four-week review

| | |
|---|---|
| Steps | 1 src/lib/metrics.ts: intake completion and drop-off per form; profile precision as one minus wrong_field passes over decided proposals, with seniority and the other codes reported beside it, a proxy for the scope's on-profile label that decision 24 puts to Kem; regex-versus-user agreement from posting.fit against decisions, the 70 percent gate of the scope's add-a-profile step 9 [scope]; titles seen, passed and written from the coverage push; yield per profile per month; apply rate and dominant pass codes; applications a week against capacity and tailored share by tier; response rate with the 21-day rule; screens per 15 applications; record completeness; follow-up compliance; Kem's hours from time_log [scope]. Aggregates carry no user ids. 2 /admin/review weekly strip with the process-survey answers; /admin/profiles/[id] four-week view against 80 percent precision, 10 qualified a month and one screen per 15 [scope], with a keep or demote note. 3 docs/pilot-review.md. |
| Files | src/lib/metrics.ts, src/app/admin/review/page.tsx, src/app/admin/profiles/[id]/page.tsx, docs/pilot-review.md, tests/contract/metrics.test.ts |
| Effort | 2 |
| Depends on | WS6, WS9 |
| Exit | every row of the scope's pilot-metrics table has a number or "no data yet" from live rows by week 6 |
| Tested by | contract tier against fixture rows with hand-computed values |

### WS11 Engine handoff, Kem on the Mac, not this repo

| | |
|---|---|
| Steps | 1 Phase 1 as scoped: vault root from the environment, profile loader with string ids, the three-way exclusion split, identity from data, the overlay-borne record, a vault template, a test persona in V3 [scope]. 2 Install engine/sync.py in the vault with Makefile targets sync-ping, sync-pull, sync-push, sync-build; the key file holds separate production and staging tokens. 3 board.py export with user_id, profile_id, external_id, the six facets, proposed, rank and pick_reason, plus the finalize call and the coverage push, matching contracts/posting-export.schema.json; a path scrub. 4 The overlay reader per contracts/overlay.schema.json. 5 Event application in the vault keyed by event id, idempotent. 6 Kem's own sweep through the new path as tenant zero, then the first real push for user zero's V3 and V4 vault. 7 Later, as scoped for phase 2: validate_master.py, fit_pages.py, claims.py and the drafting prompts. 8 Seed user zero's form 5 from the vault ledger, and dedupe postings across Kem's own vault and the user-zero vault by external_id, so Kem never applies twice. |
| Files | engine/sync.py copied to the vault; contracts/*.schema.json; docs/sync-contract.md; docs/runbook.md; fixtures/sample-export.json |
| Effort | 20 to 25 Kem-hours for phase 1 [scope], plus 8 to 12 for sync.py, the export adapter, event application and the coverage push [plan] |
| Depends on | WS4 step 1 for a fixed target; decisions 17, 18; scope decision 7 |
| Exit | the scope's phase 1 exit: a second vault with a test persona sources, judges and builds a gated PDF with no code edits [scope]; sync.py pull populates the user-zero vault and push-postings publishes a real week |
| Tested by | the engine's offline suites [scope]; the first real Sunday |

### WS12 Ops hardening, runbook, skip-week drill

| | |
|---|---|
| Steps | 1 docs/runbook.md with the exact commands from section 4.4 and docs/states.md tied to the states contract by a test. 2 Migration policy in CLAUDE.md: additive migrations only during the pilot, expand then contract, one schema pull request open at a time, regenerate on rebase; a Neon manual snapshot before any production deploy that migrates; scripts/reset-staging.ts when the staging branch diverges. 3 Preview policy: the Preview environment's database is the fixed staging branch; no per-PR branching and no Neon API key anywhere. 4 /api/health as a liveness check with no database call, because a monitor that wakes Neon every few minutes keeps a 0.25 CU compute on all month, about 180 CU-hours against Free's 100 [research]; the database round trip and backlog counts stay behind the sync token in ping. 5 Skip-week drill on a preview before the first invite, then a deliberate production skip in week 8 with Kem informed; results in docs/verification.md. 6 Weekly manual Neon snapshot reminder in the Friday summary, retaken after any deletion completes; Free keeps 1 manual snapshot and 6 hours of history [research]. 7 Security review pass over upload, download, sync token handling, email links and placement isolation. |
| Files | docs/runbook.md, docs/states.md, docs/verification.md, CLAUDE.md, src/app/api/health/route.ts |
| Effort | 1.5 |
| Depends on | WS3, WS4, WS8 |
| Exit | the documented skip week produces the correct digest and no stalled state on production, the scope's phase-4 criterion met early [scope]; docs match what the pages and sync.py do; no open high findings |
| Tested by | the drill; the security review |

### WS13 Landing, privacy, terms and consent pages

| | |
|---|---|
| Steps | 1 Done 23 Oct in commit 2d83e2a: the page's last version stays at commit 683ae5a on main, the Typeform widget and @typeform/embed-react are removed, and the root shows a neutral holding page with no copy from the retired era [scope]. No redirect, because the offer is hidden for now rather than moved. 2 The root landing from content/landing.md with the scope's four statements: the tool is free, a person runs it weekly, nothing is auto-submitted, and a separate placement business exists [scope]; no copy from the retired era [scope]. 3 /privacy, /terms and /consent from counsel's text, each carrying its version, with the Neon history, snapshot and Resend retention windows stated. 4 A test that each rendered consent page matches its consent_text row by sha256. |
| Files | src/app/page.tsx, src/app/privacy, terms, consent, content/*.md, package.json, tests/contract/consent-text.test.ts |
| Effort | 1 |
| Depends on | steps 2 to 4: the counsel need |
| Exit | the root says the four statements; no paid offer is served by this deployment; every consent row cites a text a user can read at its version |
| Tested by | the sha256 test; a manual read by Kem |

Total in this repo: about 41 session-days [plan], after the critique's additions: WS13, the finalize and coverage endpoints, the invite table, the digest lease and the purge-at-request deletion. Engine side: 7 Kem-days for phase 1 and the adapters, more for phase 2 [plan].

## 7 Milestones

| Milestone | Weeks | Workstreams | What is demoable | Who tests | Kem hours |
|---|---|---|---|---|---|
| M0 Base and contract published | 1 | WS0; WS4 step 1; WS13 step 1 | CI is green on a pull request; next start answers ping 200 with the token and 401 without; docs/sync-contract.md, contracts/*.schema.json and engine/sync.py ping are on the branch; the paid page is retired behind its tag; once Vercel is connected, the staging host builds the same commit | Kem runs python3 engine/sync.py ping from the Mac | about 4: accounts, DNS, secrets, decisions, the operator sign-in [plan] |
| M1 The operator's week before any user | 2 | WS1; WS2 schema and migrations; WS3 Week, Participants, Runs, Time; WS4 runs and events | Kem signs in as operator on the staging host and sees an empty /admin; migrations are applied to the staging branch. On Sunday Kem wraps the existing sweep with sync.py run and sees it in /admin/runs with duration; logs the Sunday time from the prefilled button; invites a second address and lands in /app after set-password; the skip-week banner shows because no push exists | Kem on the staging host, then production; a session or CI on the staging branch | about 3 plus the sweep they already run [plan] |
| M2 Intake to vault with Kem as user zero | 3 to 4 | WS5; WS3 intake approval and profiles; WS4 pull complete, resume download, vault-created, profiles push; contracts/profiles V3 and V4 | Kem completes the six forms as user zero in under 45 minutes, uploads a resume, approves the intake in /admin, and sync.py pull writes the overlay and resume on the Mac; the overlay validates; vault-created moves the participant | Kem as user and as operator; the second test address through intake | about 6 plus engine phase 1 work starting now [plan] |
| M3 The loop, first real Sunday to Friday | 5 | WS4 postings, builds, masters; WS6; WS8 digest and transactional mail; WS11 export through the new path | A real week's export for the user-zero vault lands in /app/week; the digest arrives once; Kem decides every proposal with codes, requests a resume, pushes the gated PDF, downloads it, records I applied and a reply; the Friday prompt and operator summary arrive; the time log is under the ceiling. M3's metrics count the user-zero vault only; Kem's own vault stays outside the portal under decision 18. If the engine slips, M3 runs on the synthetic fixtures/sample-export.json and the real loop moves to the week the engine lands | Kem end to end | about 6 plus the rest of engine phase 1 [plan] |
| M4 Ready for invites | 6 | WS7; WS8 Friday prompts, retention; WS9; WS10 first pass; WS12 drill on preview | Skip-week drill passes on a preview; a test user is deleted end to end and leaves no rows; counsel-reviewed wording and the pilot landing are live; the first three invited users, in V3 and V4, finish intake in under 45 minutes and receive their first weekly list, the scope's phase-2 exit [scope] | Kem, the three invitees | 9 to 15: onboarding is 3 to 5 hours per user [scope], three users, spread over weeks 6 and 7 |
| M5 Pilot operations and the four-week review | 7 to 12 | WS10; WS12; fixes; WS11 phase 2 items | Week 8: a deliberate production skip week yields a correct digest and no stalled state; week 10: /admin/profiles shows precision, yield and screens against thresholds; six weeks of outcomes for every user by week 12 [scope] | Kem weekly; users on their own screens | 8 to 12 a week, the scope's ceiling [scope] |

Reconciliation with Kem's time. The scope budgets 65 to 85 hours across phases 0 to 2 over about six weeks [scope]. Counting everything this plan asks of Kem, the total runs over that budget.

| Kem's work, weeks 1 to 7 | Hours | Source |
|---|---|---|
| Phase 0: profiles V3, V4, V1 and V2 through the dry sweep, consent drafts, naming the first users | 12 to 16 | [scope] |
| Portal-side tasks in M0 to M3: accounts, DNS, access, secrets, decisions, being user zero, testing | about 19 | [plan], the M0 to M3 cells |
| Engine phase 1 | 20 to 25 | [scope] |
| sync.py, the export adapter, event application, the coverage push | 8 to 12 | [plan] |
| Onboarding three users at M4 | 9 to 15 | [scope] |
| Reviewing and merging about 30 pull requests at 20 minutes each | about 10 | [plan] |
| Total | 78 to 97 | against 65 to 85 [scope] |

Decision 25 closed the gap on 23 Oct. Sessions now merge pull requests that change neither the schema nor the contract once CI is green, so Kem's review falls to about 3 hours. V1 and V2 are drafted after M4, so phase 0 falls to about 6 to 8 hours. That brings the total to about 65 to 82 hours, inside the scope's budget [plan]. Moving M4 by one or two weeks stays in reserve for an engine slip. M3 sits in week 5, not week 4, so engine phase 1 can spread across weeks 2 to 5. If the engine slips by two weeks, M3 and the first real push move to week 7; WS6, WS7, WS8, WS9, WS10 and the drill keep moving on fixtures; the first invites move with M3 because the scope's phase-2 exit needs a real weekly list.

## 8 Needs from Kem

### Must have before week 1

| Item | Why | Needed before | Workaround |
|---|---|---|---|
| Answers to decisions 1, 2, 3, 4, 6, 8, 10, 12, 14, 15 and 25 | they fix the deployment, hosting, auth shape, storage, merge policy, profile mirror, preview data, operator identity, verification semantics and the time budget that WS0 to WS2 encode | done 23 Oct, recorded in docs/decisions.md | reversing 6 after WS5 costs about a day [plan] |
| Network access for this cloud environment: add *.neon.tech, *.vercel.app and the staging host under Allowed domains, keeping package managers allowed. The setting is in the environment menu in the session's title bar, then Edit, then Network access; steps at https://code.claude.com/docs/en/cloud-environments#network-access | on 23 Oct the proxy refused Neon, Vercel and Resend hosts [verified]; without them no session can migrate, run database tests or exercise a deployment | day 1 | database-tier tests run in GitHub Actions with secrets Kem sets; nothing is reported as passed without a real connection |
| A Vercel project for kemtuba/pathtoimpact with the GitHub app, connected only after decision 1, with pathtoimpact.us on Production only once the root no longer serves the paid offer, Fluid compute on, Node 24, region iad1, build command pnpm run build:vercel, and a staging host assigned to a staging branch | sessions cannot create or configure Vercel projects; deploys happen on push; a stable preview host keeps auth cookies and mail links working | day 1 | local builds and CI still run; no preview demos |
| Confirmation that Vercel builds commits authored by the session's git identity, by pushing one trivial commit | Vercel can skip deployments whose author is not a project member; this is outside the verified research | day 1 | for production, Kem merges so the merge commit is theirs; for previews, Kem fast-forwards the staging branch, or CI deploys with a VERCEL_TOKEN held only in GitHub secrets |
| A Neon project pathtoimpact in aws-us-east-1, a staging branch, and both connection strings for staging placed in the Claude Code environment secrets and in GitHub Actions secrets; no Neon API key anywhere | migrations and database-tier tests run from sessions once the network need is met, or from CI; the HTTP driver cannot talk to a local Postgres [proof] | day 1 | schema generation works offline [proof]; migrations wait |
| Vercel environment variables per section 3.3, with different BETTER_AUTH_SECRET and SYNC_TOKEN_SHA256 values for Production and Preview, and SYNC_ENV set | the build itself needs the auth secret [proof]; distinct tokens stop a wrong SYNC_URL from pushing a real week into staging or pulling fixtures into a real vault | day 1 for the auth pair, week 2 for the rest | scripts/make-sync-token.ts prints a token and its hash; only Kem can set them |
| The staging raw sync token in the Claude Code environment, and confirmation whether Vercel deployment protection is on for previews | sessions must run sync-smoke against the staging host; protection may block bearer calls to preview URLs, which is unverified | week 1 | sessions test against next start with the staging database |
| Branch protection on main, GitHub Actions secrets for the staging database and the staging sync token, and confirmation that a session may push workflow files | decision 8's review rule needs branch protection; CI's database tests and sync-smoke need secrets; whether a session token can push ci.yml is unverified | week 1 | Kem commits ci.yml from the session's draft |
| Draft consent, retention, staffing and Claude-processing text, plus a privacy policy and terms, sent to counsel, with a return date by week 5 | the scope puts this in week 1 [scope]; counsel's lead time is unknown and any delay blocks the invites | week 1 to send | DRAFT text for Kem as user zero only |
| Where the Capital Clarity page is live today, if anywhere, so the hide reaches that host too; the Typeform form may still accept responses at its own link until it is closed in Typeform | Kem chose on 23 Oct to hide the offer for now; this repository's root already shows a holding page on the working branch; the session could not reach pathtoimpact.us to check [verified] | week 1 | none |
| A Resend account and API key; DNS access for the sending subdomain, recommended mail.pathtoimpact.us; where pathtoimpact.us DNS is hosted and whether root-domain mail exists; a reply-to mailbox | verification takes 15 minutes to 72 hours [research]; nothing delivers to anyone but Kem until then | DNS records in week 1 | onboarding@resend.dev to Kem's own address covers M0 to M2; invite links print to the operator |
| Kem's operator email and display name, plus a second address for testing invites | create-admin and adminUserIds need the identity; the invite path can only be tested on a non-operator address | week 1 | a plus-address alias |
| Kem's timezone, the Mac's python3 version, and when the Sunday push usually finishes | week keys, the applied date default and the 7, 14 and 21-day clocks depend on the zone; the client's floor is 3.9; the finish time fixes digest timing, decision 9 | week 1 | America/New_York and 3.9 are assumed; the Monday backstop covers any finish time |
| The engine's posting identity and vocabularies: the stable note id, the six facet names, fit verdict values, status values and transitions, tier values, source_board values, the exact board.py field list, and in week 2 a confirmation of the vault layout proposed in docs/engine-handoff.md | external_id, facets_json and the contract are written against these; guessing means a contract revision after Kem starts sync.py | week 1 for the contract, week 4 for the sample | text columns with zod absorb vocabulary changes; a placeholder facet file costs half a day to swap [plan] |

### Later

| Item | Why | Needed before | Workaround |
|---|---|---|---|
| Sign-off on docs/sync-contract.md and a slot to run engine/sync.py against the staging host | the contract is the only interface between the two sides | end of week 2 | none; this is the M1 exit |
| profiles V3 and V4 in contracts/profiles with kinds, tools, employer types, default screens, example titles, pay range, node and ruling status; V1 and V2 after M4 under decision 25 | form 1 lists them, form 3 ticks from them, form 5 ranks them | V3 and V4 by week 3 | seeds from the scope's archetype table with empty lists let the forms render |
| One sample export from board.py with names, employers and dates replaced, so the committed fixture holds no personal data; the real export stays in the vault | the postings contract, the fit card and the M3 fallback rest on real shapes | week 4 | a fully synthetic fixture |
| Engine phase 1 complete enough to export through the new path for the user-zero vault, and Kem's resume uploaded as user zero | M3 is the first real loop | week 5 | M3 on fixtures; M4 cannot |
| Counsel's returned wording for the texts sent in week 1, each with a version string | consent rows cite a consent_text version; no non-Kem user may consent to placeholder text; the landing page names a placement business and the portal holds employment records | week 5, before the invites in week 6 | DRAFT placeholders for Kem as user zero only |
| The first six users named, at least two per shipping profile | the scope names them in week 1 [scope]; they decide which of V1 and V2 matter and how SerpApi is spent; which profiles are listed follows scope decisions 1 to 5 in the table in section 9 | week 2 | none |
| CRON_SECRET for Production and Preview with different values, and OPERATOR_EMAIL | cron handlers refuse requests without the secret; digest timing itself is decision 9 | week 5 | admin send-now |
| Kem-hours confirmation for each milestone in section 7 | the engine handoff and onboarding are Kem's hours against the scope's ceiling | week 1 | the dates slip with the hours |
| Inter and DM Sans licence confirmation | fonts in built PDFs are redistributed [scope] | first non-Kem PDF | none here |
| An external uptime check pointed at /api/health, which never touches the database | nobody watches a probe otherwise | week 6 | the Friday summary doubles as a heartbeat |
| Confirmation of the vendor pages the research could only read from search snippets: Vercel fair use, function limits, cron pricing, Blob pricing; Resend pricing | two of those numbers are written into code as constants in src/lib/limits.ts | week 2 | one-line constant changes |

## 9 Decisions for Kem

Decisions marked week 1 block the first session or the first week; the stated recommendation applies by day 2 if no answer arrives, and is recorded in docs/decisions.md as a default, not as Kem's choice. On 23 Oct Kem accepted the recommendations on all eleven week-1 decisions, so each now carries a "Decided" line. Each decision is tagged. "Kem's call" is a real fork only Kem can choose. "Engineering default" means this plan will act on its recommendation, so answer only to object.

### The scope's thirteen decisions, and where each one lands

The scope ends with thirteen decisions for Kem [scope]. Most of them are about the engine and the profile files, not the portal, so this plan does not repeat them as its own. It does need to know which portal step each one gates. The numbering below is the scope's, not this plan's.

| Scope decision | Where it lands | What it gates in this repo | Needed by |
|---|---|---|---|
| 1 Eval Ops ruling for V4 | Profile file: node and ruling_status | The ruling note on form 1 and in the profile mirror, and the placement list: until the ruling, users whose only profile is V4 are withheld from it, so the bench cannot count them [scope] | the V4 profile file, week 3 |
| 2 Builder scope, B1 or none | Profile files | Nothing until a B1 file is pushed; the profiles endpoint takes it with no code change | none for M0 to M4 |
| 3 V1 scope: clinical, actuarial, TPRM | V1 profile file | When V1 is listed. Under decision 25 it is drafted after M4 | after week 6 |
| 4 V2 hybrid gate | V2 profile file and its posting-text gate | When V2 is listed. Under decision 25 it is drafted after M4 | after week 6 |
| 5 L1 counsel profile | Profile file plus the person form | If L1 is in the pilot, form 3 gains a bar-admission field [scope]. This plan builds the credentials list from the profile's form_json, so the field appears only for L1 holders. Default: L1 out | before WS5, week 3 |
| 6 First users, and is Kem user zero of V3 and V4 | Section 8 need for the users; user zero answered yes on 23 Oct through decision 12 | Invites at M4. M2 and M3 are defined around Kem being user zero, so a no moves both to the first invitee | week 1 |
| 7 May the live engine's exclusions be split now | Engine, WS11 | When the user-zero vault can export. M3's real loop and decision 18 assume yes; a no or a later yes moves M3, as section 7 describes | week 2 |
| 8 SerpApi policy | Engine | Which profiles get a weekly list at M3 and M4: four lanes of 10 queries weekly are 160 of a self-capped 200 searches a month [scope]. The coverage push carries serp_searches, and /admin/runs shows the month to date | week 2 |
| 9 The staffing statement and who reviews it | Counsel need in section 8; isolation and the dual-role fact are decision 11 below | Landing copy, consent_text staffing.v1, the placement page. This plan drafts the statement as the scope words it and does not treat it as settled | week 1 to send to counsel |
| 10 Where profiles live | Decision 10 below, decided 23 Oct: files mirrored to the portal | The profile table and the profiles endpoint | week 1 |
| 11 Kem's own tracks as profiles | Decision 18 below | What M3 demonstrates | week 4 |
| 12 Confirm "backend" and what else users see | Kem's call. Assumption 1 holds the reading; decision 5 covers every judged posting | Near misses need an engine flag on the posting; the profile coverage report is one read-only page over the coverage table. Default: neither in the pilot. The scope's Sanity-editable landing page stays open; the default is code in this repo | week 5 |
| 13 Hosting posture | Decision 2 below, decided 23 Oct: Hobby, then Pro before the first invite | Production launch to user zero | week 3 |

### 1 What happens to the Capital Clarity page. Week 1, Kem's call, decided 23 Oct

Options: a, retire it from this repository and domain, tag archive/capital-clarity, remove the widget and dependency, re-home the offer in kem.design or a new repository, with a redirect if a URL exists; b, keep it at /capital-clarity with no link from the portal, which forces Pro; c, keep it at the root permanently and leave the portal under /app with its own landing. Recommendation: a. Why: the page sells a 175 dollar session [facts], which is commercial under Vercel's written definition [research]; the scope's landing page must name the free tool and the placement business [scope] and forbids copy from the retired era [scope]; git keeps the page recoverable. What it blocks: connecting Vercel, every deployed demo from M0 on, and WS13. No Vercel deployment exists until the page is gone, because deploying the repository as it stands serves the paid offer from the new project. Kem also says what happens to Typeform respondents while the page moves.

**Decided 23 Oct.** Option a, as a hide for now. Kem chose not to move the offer anywhere yet, so there is no new home and no redirect. WS13 step 1 is done on the working branch in commit 2d83e2a: the root shows a holding page, the Typeform widget and its dependency are gone, and the page's last version stays at commit 683ae5a on main. To bring it back, run git checkout 683ae5a -- src/app/page.tsx src/components/TypeformWidget.tsx, then pnpm add @typeform/embed-react@4.7.0. The tag archive/capital-clarity was meant to mark that commit, but sessions can push only to their working branch, so Kem adds it if wanted with git tag archive/capital-clarity 683ae5a and git push origin archive/capital-clarity. The hide reaches the live site when the branch merges into main.

### 2 Hosting plan. Week 1, Kem's call, decided 23 Oct

Options: Hobby at 0 a month, conditional on decision 1 being a or b-with-Pro, no payments, no ads, a placement disclosure with no link or call to action, and unpaid operation; or Pro at 20 dollars a month per seat from day one [research], [scope]. Two readings, both put to Kem. Reading one: Hobby's limits fit the pilot, enforcement is a feature pause rather than a bill, and the switch is a billing change with no code change [research]. Reading two: the staffing opt-in is a funnel to a paid placement business, and Vercel's definition is financial gain of anyone involved in producing the deployment [research], so Hobby is shaky even with the paid page gone; a pause during a pilot with real users would cost more than 20 dollars. Recommendation, added 23 Oct: Hobby until the first invite, then Pro before week 6. Why: with the paid page retired under decision 1, reading one holds while only Kem uses the portal. Reading two matters once real users depend on it, and a pause then costs more than the 20 dollars a month. The code is identical either way, and the 300 s function ceiling and the hour-jittered daily cron on Hobby are already designed around [research]. Blocks: connecting Vercel in week 1, together with decision 1.

**Decided 23 Oct.** Hobby until the first invite, then Pro before week 6. Draft 1 offered no recommendation here; this one was added on 23 Oct when Kem accepted the week-1 recommendations, and Kem can change it with no code change.

### 3 Auth built fresh or lifted from gallery-os. Week 1, engineering default, decided 23 Oct

Options: build fresh from the better-auth 1.7 docs on the proof's wiring; or Kem pastes gallery-os auth.ts, schema and email code. Recommendation: build fresh. Why: gallery-os is unreachable [facts]; its better-auth version is unknown and may predate the 1.7 account index and the CLI rename [research]; its organization invitations do not close sign-up [research]; the proof's stack built and smoke-tested today with zero peer warnings [proof]. Blocks: WS1.

**Decided 23 Oct.** Build fresh on better-auth 1.7.12, from the proof's wiring.

### 4 Invite-only mechanism. Week 1, engineering default, decided 23 Oct

Options: a, operator-created accounts: disableSignUp plus admin createUser plus a set-your-password email carried by one small invite table with a 7-day hashed token, so the global reset token keeps its 1-hour default; b, open sign-up gated by an invite code checked in a before-hook with an invite table; c, organization-plugin invitations, which add three tables and leave sign-up open [research]. Recommendation: a. Why: Kem names every pilot user anyway; there is no public sign-up surface; the scope's "invite codes" intent is a closed pilot [scope]; b is the fallback if users should self-register. Blocks: WS1 step 6, M1.

**Decided 23 Oct.** Option a: operator-created accounts with sign-up disabled and a 7-day hashed invite token.

### 5 Which postings users see. Kem's call

Options: every judged posting with its verdict, proposed first and the rest under "everything judged this week"; or proposed roles only. Recommendation: every judged posting. Why: the scope says users can see every verdict and dispute it [scope], weekly volume is 32 to 52 notes [scope], and it answers the scope's open question on what else users should see without a new screen. Blocks: the postings payload's proposed flag in WS4 and /app/week in WS6.

### 6 Where resumes and built PDFs live. Week 1, engineering default, decided 23 Oct

Options: bytea in Postgres with the 4,194,304-byte cap and a nullable storage_key; or Vercel Blob with client-direct uploads. Recommendation: bytea with the cap. Why, on its own merits: files are a few hundred kilobytes [scope], one store to delete from [scope], no third service, and personal data stays behind the session check. The cap exists because Vercel's 4.5 MB payload limit binds both upload and download routes [research]. Blob's access model is not verified; the research could not confirm whether Blob offers private reads, so that argument is not used here. Blocks: WS2 columns, WS5 upload, WS4 PDF push.

**Decided 23 Oct.** bytea in Postgres with the 4,194,304-byte cap and a nullable storage_key.

### 7 Digest classification. Engineering default

Options: personalised sends through the transactional API with unsubscribe headers and a signed route; or Resend Broadcasts with Audiences. Recommendation: personalised. Why: the digest lists the user's own roles and follow-ups; Broadcasts cannot personalise per recipient [research]. Blocks: WS8.

### 8 Merge and deploy policy. Week 1, Kem's call, decided 23 Oct

Options: sessions push to main, which deploys production, until the first invite, then pull requests Kem merges; or pull requests from day one. Recommendation: pull requests from day one with Kem merging, because it also settles the commit-author question in section 8 and because the migration policy needs one schema change in flight at a time. Blocks: branch protection in WS0.

**Decided 23 Oct.** Pull requests from day one. Under decision 25, Kem reviews and merges changes to the schema or the sync contract, and sessions merge the rest once CI is green. The commit-author check in section 8 now covers session merges as well as session commits.

### 9 Digest timing. Kem's call

Options: a, send-now at the end of Kem's push plus a Monday 13:00 UTC cron backstop; b, only on push, so a skipped week sends nothing; c, a Sunday evening cron. Recommendation: a, with the exact backstop hour set after Kem says when the push usually finishes. Why: Hobby cron fires anywhere in the hour and may skip or double-fire [research], so the leased claim makes it safe; a skip notice and a roles digest have separate keys, so a late push still announces its roles; sending at push time gives Sunday-night mail when Kem is on time; the cron guarantees the skip-week message; Sunday 14:00 UTC, as one candidate plan proposed, is before an ordinary push. Blocks: WS8.

### 10 Where profiles live. Week 1, Kem's call, decided 23 Oct

Options: files in the engine repository mirrored by the profiles push; or records edited in a portal form and exported to the engine. The scope lists this as Kem's [scope]. Recommendation: files mirrored. Why: the add-a-profile procedure is run from the Mac with dry sweeps and tests [scope]; the portal only needs display and form lists. Blocks: the profile table and the profiles endpoint.

**Decided 23 Oct.** Files in the engine repository, mirrored to the portal by the profiles push.

### 11 Isolation level for the staffing opt-in. Kem's call, with counsel

Options: a, separate Postgres schema plus a separate Drizzle module, an import lint rule and a placement-only page; b, a plus a dedicated Postgres role with USAGE only on the placement schema and a second connection string; c, a separate Neon project. Recommendation: a now, b when anyone other than Kem reads the list. Why: the scope's requirement is that the job-search side never reads it [scope]; a makes that a build-time property with one database to delete from. The dual-role fact goes with it: Kem is both the operator, who reads every overlay and verdict, and today's placement reader. The schema guards the code, not the person, so the consent and landing copy must not claim separation until someone other than Kem reads the list; that wording is part of scope decision 9 for counsel. Separately, users whose only profile is V4 are withheld from the list until the Eval Ops ruling, scope decision 1. Blocks: WS2 and WS5's consent screen in week 1 only in the sense that a is the default.

### 12 Is Kem's operator account also user zero. Week 1, Kem's call, decided 23 Oct

Options: one account with role operator and a participant row; or a separate user-zero account on a second email. Recommendation: one account, with the second email still used to test the invite path. Why: simplest end-to-end test of the operator's loop; the admin plugin allows it. This also takes scope decision 6 as yes, Kem as user zero of V3 and V4; M2 and M3 are built around that. Blocks: WS1 bootstrap, WS5 testing.

**Decided 23 Oct.** One account with the operator role and a participant row, plus a second address for testing invites. Scope decision 6 is therefore yes: Kem is user zero of V3 and V4.

### 13 What deletion leaves behind. Kem's call

Options: hard delete plus deletion_log with the email hash, timestamps and counts only; hard delete with nothing kept; anonymise and keep rows. Recommendation: the first. Why: meets "deletion reaches the database" [scope] literally, keeps aggregate metrics honest, and the hash stops an accidental re-invite. Blocks: WS9.

### 14 Preview deployments and personal data. Week 1, engineering default, decided 23 Oct

Options: one fixed staging Neon branch seeded with fixtures, never forked from production; or per-branch Neon forks of production for every preview. Recommendation: the fixed branch. Why: Free allows 10 branches with no extras [research], and forks copy every user's employment record. Blocks: the Neon and Vercel setup.

**Decided 23 Oct.** One fixed staging branch seeded with fixtures, never forked from production.

### 15 Email verification semantics. Week 1, engineering default, decided 23 Oct

Options: accept the set-password link as verification, creating users with emailVerified true; or also require a separate verification click before first sign-in. Recommendation: accept the link. Why: the link proves possession of the mailbox; a second click adds a step and a second email against the shared daily quota [research]. This is a reinterpretation of the scope's "with verification" [scope], stated here so Kem can object. Blocks: WS1 config.

**Decided 23 Oct.** The invite link counts as email verification.

### 16 Form 3 pre-fill from the resume. Kem's call

The scope says Claude pre-fills what a resume can show and the user confirms, and budgets form 3 at 12 minutes on that basis [scope]. Options: a, hand-typed for the pilot, which raises the intake time; b, Kem drafts the record from the uploaded resume on the Mac with Claude and pushes it through a record-drafts endpoint for the user to confirm in form 3, which keeps the Claude key on the Mac [scope] and is why the upload precedes form 3 in this plan; c, an in-portal Claude call, which puts an Anthropic key in the portal, against the scope's secrets rule. Recommendation: a for user zero at M2, b before the first invite. Blocks: WS5 form order in week 3 and a contract v1.1 endpoint.

### 17 User zero's existing history. Kem's call

Kem's vault already holds their own application history and response-rate baseline [scope]. The contract forbids the engine from creating application rows, so that ledger cannot enter the portal. Options: a, start the portal empty for Kem and keep the vault ledger authoritative for Kem's own stop rule and baseline; b, a one-time, operator-enabled import endpoint that writes historical applications flagged imported, excluded from the response-rate metric. Recommendation: a. Why: the baseline is already recorded in the scope [scope], and an import endpoint weakens the one invariant that protects the record. Under a, user zero's form 5 is seeded from the vault ledger so the stop rule starts from the truth. Blocks: M3's definition and whether contract v1 gains the endpoint.

### 18 Do Kem's own tracks become profiles. Kem's call

The scope asks this as decision 11 [scope]. It affects the portal: Kem's real search runs on Kem's AI-enablement and workforce tracks, and user zero's V3 and V4 vault is a different data flow, so "Kem's real Sunday sweep" and "Kem as user zero" are two vaults. Options: a, Kem's tracks stay engine-only tenants outside the portal, and M3's demo is the user-zero V3 and V4 vault fed by the shared sweep; b, Kem's tracks become unlisted profiles so Kem's own vault is also a portal participant. Recommendation: a for the pilot, with postings deduped across the two vaults by external_id so Kem never applies twice, and M3's metrics counting the user-zero vault only. It assumes scope decision 7 is yes. Blocks: what M3 demonstrates and whether two unlisted profiles enter the mirror.

### 19 Follow-up clock authority. Engineering default

The scope's operating model has the engine start the follow-up clock on the confirmed send [scope]. This plan has the portal compute follow-up and stale dates from applied_on and send the prompts, because the prompts must fire in a skipped week [scope] and the portal database is the system of record for outcomes [scope]. Options: a, portal authoritative, engine mirrors via application.confirmed events; b, engine authoritative, portal displays what the engine pushes. Recommendation: a, with follow_up_days read from the overlay and defaulting to 7 [plan], because the scope's engine table reads follow-up days from the overlay [scope]. Blocks: WS6 and WS8.

### 20 Resume re-upload after the master is approved. Engineering default

Options: a, the new upload supersedes the file, flags resume_changed_since_master, notifies Kem, and the approved master stays until Kem redrafts; b, a re-upload is blocked once a master is approved. Recommendation: a. Blocks: WS5 step 5, week 3. Related default, stated so Kem can object: a posting the engine marks gone after the user applied keeps its application and follow-up clock, shows "posting removed", and is never auto-written-off.

### 21 Retention clock. Kem's call

Options: 90 days from the user's last activity, counting sign-in, decisions, applications and replies, with a warning at day 83; from intake completion; from a pilot end date. Recommendation: last activity. Why: a user mid-search should not be purged; the warning gives a one-click keep. Blocks: WS9 and the consent wording, week 6.

### 22 Retention default on form 6. Kem's call

Options: a required radio with no preselected choice; default delete after 90 days; default keep. Recommendation: no preselection. Why: a default is a decision made for the user that surprises at day 90 either way. Blocks: WS5 step 6, week 3.

### 23 What revoking pilot consent does. Kem's call

The consent table carries revoked_at, but the scope does not say what revocation means. Options: a, revocation starts the WS9 deletion flow with reason consent_revoked; b, revocation pauses the participant, stops pulls, and keeps the record until the retention clock or a delete request. Recommendation: b, with a plain choice offered to delete now. Why: a user may revoke to stop the weekly work without wanting their outcomes erased. Blocks: WS9 step 5, week 6.

### 24 How profile precision is computed. Kem's call

The scope defines precision as the on-profile share of proposed roles by user label and accepts a profile at 80 percent [scope]. Users never give an on-profile label in the scope's forms. Options: a, a proxy: one minus wrong_field passes over decided proposals, with seniority codes reported separately because the scope maps them to the person's ceiling words, not the profile [scope]; b, a one-tap on-profile yes or no on every decision. Recommendation: a for the pilot, stated in docs/pilot-review.md, with the code-to-facet mapping from the scope's feedback schema written into contracts/reason-codes.json. Why: b adds a tap to every decision. Blocks: WS10, week 6.

### 25 Kem's time budget. Week 1, Kem's call, decided 23 Oct

Section 7's table puts Kem's work in weeks 1 to 7 at 78 to 97 hours against the scope's 65 to 85 [scope]. Options: a, sessions merge non-schema pull requests once CI is green, and Kem reviews only schema and contract changes, saving about 10 hours; b, draft V1 and V2 after M4, saving about half of phase 0; c, move M4 one or two weeks. Recommendation: a and b, with c only if engine phase 1 slips. Blocks: decision 8's review rule and the M4 date.

**Decided 23 Oct.** Levers a and b. Sessions merge pull requests that change neither the schema nor the contract once CI is green, and V1 and V2 are drafted after M4, so M4 invites V3 and V4 users only. Lever c, moving M4, is kept for an engine slip. The estimate falls to about 65 to 82 hours [plan].

## 10 Assumptions this plan makes without asking

1. "Backend" means the logged-in area as the scope reads it; no Sanity for any pilot data; the landing page is code in this repo [scope].
2. Database driver: drizzle-orm neon-http over the HTTP driver with the lazy proxy, as proven [proof]; every multi-table write is a fixed statement list through src/lib/db/batch.ts, which is one Neon transaction [research]; switching to a TCP pool later is contained to two files. No pg package; the proof's HTTP driver is kept on its merits, and the session's network block applies to both drivers [verified].
3. Migrations: generated SQL committed and reviewed; applied by scripts/migrate.ts through tsx and the neon-http migrator, which Vercel builds, CI, Kem's Mac and, once Neon is allowed, sessions can all run; the Vercel build script migrates only for production deployments, with the environment detection variable confirmed on day 1 because it is outside the verified research; additive-only migrations during the pilot so Vercel rollback stays safe; a Neon snapshot before any migrating production deploy; staging is migrated by the session when a schema pull request opens and reset from scratch if it diverges.
4. The pull side is one append-only event stream with a bigserial cursor, not per-entity since-queries, and the engine applies events idempotently.
5. Next 16.4.2 with Cache Components off, Turbopack default, no webpack config, async request APIs everywhere [research].
6. Sync auth is one static service token hashed in env with a previous-hash slot, as the scope's wording says [scope]; the api-key plugin is adopted only if a second client appears.
7. Engine vocabularies are text plus zod; portal states are enums.
8. Digests are sent one request per user with an idempotency key, not through the batch endpoint, until per-email headers in batch are verified [research].
9. Kem operates in America/New_York and the Mac's python3 is 3.9 or later, both pending the section 8 answers.
10. Pilot volumes: at most 10 users [scope], at most 60 judged postings per user per week, resumes and PDFs under 1 MB, digest recipients under 100 a week, inside Resend's 100 a day [research], Neon Free's 1 GB and 5 GB egress [research] and Vercel's included usage [research].
11. Vercel Fluid compute is on, as it is by default for new projects [research], so 300 s applies to the cron and PDF routes.
12. Two or three sessions may run in parallel on independent workstreams, with schema changes serialised; without parallel sessions M0 to M4 take about eight calendar weeks instead of six [plan].
13. Vitest is added for logic, contracts and route tests; no browser test suite in the pilot.
14. Vendor numbers the research could only confirm from search snippets are treated as true until Kem spot-checks the pages; every cap is a constant in src/lib/limits.ts.
15. The resume master, keywords, tailored copy and cover letter are drafted on the Mac with Kem's Claude plan [scope]; the portal stores and shows them for approval.
16. Previews use the staging host and staging secrets; sessions never hold production credentials.
17. A posting carries exactly one profile_id, the profile that judged it; the engine pushes one row per posting per user; precision is attributed to that profile.
18. Operator impersonation is off for the pilot.
19. Committed fixtures are synthetic. No real posting, employer or application record enters the repository.
20. Links in email never change state on a GET.

## 11 Risks specific to this plan

| Risk | Mitigation |
|---|---|
| Vercel judges the deployment commercial and pauses it on Hobby | decision 1 and 2 put both readings to Kem; the disclosure has no link; Pro is a billing change with no code change |
| better-auth on Next 16: the RSC cookie issue, the cookies module under Turbopack, or reset failing for admin-created users | the week-1 verification pass on a preview before anything is built on auth; cookieCache off; fallback to setUserPassword and a direct email_verified update |
| Engine phase 1 slips so M3 has no real export | M0 to M2 need no engine; M3 runs on fixtures; the contract and client are delivered in week 1 so Kem's work has a fixed target; section 7 states what moves |
| Kem's hours exceed the scope's budget in weeks 2 to 5 | the reconciliation in section 7; the engine work is spread to week 5; M3 is not pinned to week 4 |
| A skipped week stalls something silently | every entity has an aged state; two independent crons; the Friday summary lists backlog ages; drills before invites and in week 8 |
| Hobby cron skips, double-fires or lands late, or a send dies at the 300-second ceiling | digest_run claims with a lease; per-recipient email_send rows so a re-run sends only what is missing; idempotency keys per send; send-now from the push is the primary path |
| Sessions cannot reach Neon or Vercel | the day-1 network need; database tests in GitHub Actions meanwhile; nothing reported as passed without a real connection |
| Kem reads both the job-search store and the placement list | decision 11 and scope decision 9 go to counsel together; the copy claims no separation the setup does not have |
| A resume or PDF exceeds the cap | enforced in the schema, the handlers and the client with a plain message; storage_key pre-wired |
| Public reset requests drain the shared daily mail quota before the digest | per-address budget on unauthenticated triggers in email_send; better-auth's core limiter in the database; the digest sent early in the UTC day; Pro removes the daily cap [research] |
| Resend domain verification is delayed | DNS in week 1; invite links print to the operator; one send module so a provider swap is local |
| Neon cold starts make the first Sunday call fail | 30 s timeout and three retries; ping first; same region as Vercel |
| The staging branch diverges or the branch cap is hit | one fixed staging branch, reset script, cleanup action on pull-request close |
| A migrating deploy breaks production or rollback | additive-only policy, snapshot before migrating deploys, one schema pull request at a time |
| A wrong SYNC_URL pushes real data into staging or pulls fixtures into a real vault | per-environment tokens and SYNC_ENV echoed by ping; the client refuses a mismatch |
| Reason-code, facet or status vocabularies drift between portal and engine | single source in contracts with JSON Schema exports; text columns with zod; CI fails if contracts change without a regeneration |
| The Next 16.4 upgrade breaks something the proof verified on 16.0.8 | upgrade is WS0 step 2 with the proof's checks re-run; exact pins; one-commit revert |
| Drizzle 1.0 release-candidate syntax gets copied into the 0.45 codebase | pins and a CLAUDE.md warning; drizzle-kit check in CI |
| The staffing opt-in leaks through a join or an export | separate schema and module, the lint boundary, a test that greps sync and export payloads |
| Deletion is told to the user before the vault copy is gone | confirmation only on the vault ack; the Friday summary nags on acks pending more than 7 days |
| Kem approving their own intake hides approval bugs | the second test address at M1 and the three invitees at M4 exercise the path |
| Users judge the tool on interviews against the scope's low baseline [scope] | say it is a pilot; publish the response rate per profile on the landing page when available; make tailoring real through the draft-approval step |

## 12 The first session's checklist

1. Check out a feature branch off main, per decision 8. Read CLAUDE.md if present, docs/implementation-plan.md, docs/plan/README.md and docs/decisions.md if present. Read the network need in section 8: if Neon or Vercel is still blocked, say so and skip the steps that need them; do not report them as passed.
2. git apply docs/plan/proof-of-stack.patch, then pnpm install to regenerate the lockfile. Add !.env.example to .gitignore.
3. Move the proof's wiring to its final shape. The sync ping moves to src/app/api/sync/v1/ping/route.ts and compares the sha256 of the presented token against SYNC_TOKEN_SHA256 and SYNC_TOKEN_SHA256_PREVIOUS with timingSafeEqual. src/app/app/page.tsx replaces the proof's dashboard page. The proxy matcher becomes /app/:path* and /admin/:path* and its redirect goes to /sign-in. A stub src/app/sign-in/page.tsx exists. layout.tsx loses the Create Next App metadata.
4. Add tsx, react-email and vitest at exact pins. Write scripts/make-sync-token.ts, scripts/migrate.ts using the neon-http migrator, and scripts/vercel-build.sh. Then add the package scripts: typecheck, test, db:generate, db:migrate, db:check, auth:generate, contracts:json, build:vercel, with every .ts script run through tsx. Add one trivial vitest test. If any addition breaks the build, record it in docs/verification.md and stop that step rather than working around it.
5. Build with dummy BETTER_AUTH_SECRET and BETTER_AUTH_URL. Confirm the root is static and the auth and sync routes are dynamic; the unmoved patch already did this on 23 Oct [verified].
6. Upgrade next and eslint-config-next to 16.4.2, react and react-dom to 19.3.1, @types/node to 22; set engines.node; confirm next.config.ts has no cacheComponents key. Rebuild, then smoke-test with next start: ping returns 401 with no token, 401 with a wrong token, and 200 with a token from scripts/make-sync-token.ts whose hash is in SYNC_TOKEN_SHA256; anonymous /app redirects to /sign-in; /api/auth/ok returns 200.
7. If Neon is reachable and the staging DATABASE_URL_UNPOOLED is set, run db:migrate against the staging branch and record the result. Otherwise record that migrations wait on the network need or run in CI.
8. Write src/lib/env.ts, src/lib/limits.ts with the 4,194,304-byte cap and the pilot cap of 10, src/lib/week.ts with tests for Sunday night, a Tuesday catch-up and the year boundary, and src/lib/contracts/states.ts.
9. Write the contract skeleton: src/lib/contracts for events, posting-export, profile-mirror and overlay with the section 5.7 fields; contracts:json; docs/sync-contract.md from section 4; engine/sync.py with ping, the pull commands and the retry policy; engine/tests with a first test.
10. Write .github/workflows/ci.yml: install frozen, lint, typecheck, test, drizzle-kit check, the migration-committed guard, next build with dummy auth values, and a Python 3.9 job that byte-compiles engine/sync.py and runs engine/tests. If the push of the workflow file is refused, leave it for Kem to commit and say so.
11. Write CLAUDE.md with the rules: relative imports inside the auth config chain; auth-schema.ts is CLI-owned and regenerated with pnpm dlx auth@1.7.12 generate; scripts run through tsx; the batch helper is the only multi-table write path and db.transaction is forbidden; bytes never in list or relational selects; the 4 MB cap; file uploads and sync bodies live under /api outside the proxy matcher, and server actions stay at the 1 MB default; additive-only migrations and one schema pull request at a time; pinned versions and the Drizzle docs warning; no impersonation; no state change on a GET from an email link; no database call in a public route; fixtures are synthetic.
12. Write docs/setup.md from sections 3.3 and 8, docs/decisions.md kept current as decisions land, and replace README.md.
13. Silence the postcss lint warning. Run pnpm lint, pnpm typecheck, pnpm test and pnpm build. All green.
14. Commit with a message that names the proof patch as the source of the wiring, push the branch, and open a pull request with the M0 exit criteria as its checklist. If Vercel is connected, record in docs/verification.md whether it built the session-authored commit.
