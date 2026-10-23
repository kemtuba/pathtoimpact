# CLAUDE.md

This repository is the pathtoimpact.us job-search pilot portal. docs/implementation-plan.md is the source of truth; read it, and docs/decisions.md, before any structural change. When you deviate from the plan, say so in the pull request.

## Rules

- Use relative imports inside the auth config chain (src/lib/auth.ts, src/lib/db.ts, src/lib/auth-schema.ts): the auth CLI loads these files without resolving the @/ alias.
- Never hand-edit src/lib/auth-schema.ts. It is CLI-owned: regenerate it with `pnpm auth:generate` (`pnpm dlx auth@1.7.12 generate`) with a dummy BETTER_AUTH_SECRET set, because hand-written copies drift on index names and updated_at defaults.
- Run every .ts script through tsx, as package.json does: Node 22's built-in TypeScript runner fails on the auth chain's extensionless imports.
- Make every multi-table write through the batch helper, src/lib/db/batch.ts once WS2 adds it, and never call db.transaction: the neon-http driver has no interactive transactions, and a batch is one Neon transaction.
- Never put bytes in a list query or a relational select: select explicit columns, so resume and PDF bytea never travel by accident.
- Cap every resume, built PDF and sync body at 4,194,304 bytes with MAX_BODY_BYTES from src/lib/limits.ts, because Vercel caps function bodies at 4.5 MB. Import caps from limits.ts; never retype them.
- Put file uploads and sync bodies under /api, outside the proxy matcher (/app and /admin), because proxy.ts silently truncates bodies above 10 MB. Leave server actions at Next's default 1 MB body limit and never raise it to 10 MB or more.
- Keep migrations additive-only during the pilot, so a Vercel rollback stays safe, and keep only one schema pull request open at a time.
- Pin exact versions for anything you add or upgrade, so a build is reproducible.
- Write Drizzle code for drizzle-orm 0.45 and drizzle-kit 0.31: the Drizzle docs site shows 1.0 release-candidate syntax and a different migrations layout, so check any example against 0.45 before copying it.
- Keep operator impersonation off: acting as a user could forge consent and I-applied rows.
- Never change state on a GET from an email link: mail scanners open links. The link opens a page, and the page's POST acts.
- Never call the database from a public route such as /api/health: it is a liveness check, and a public route must not wake or load the database.
- Keep fixtures synthetic and commit nothing personal: the repository is public.
- Change the sync contract only with a CONTRACT_VERSION bump, a regenerated contracts/ (`pnpm contracts:json`), docs/sync-contract.md and engine/sync.py in the same pull request, because the engine copies sync.py and relies on the schemas. Never hand-edit contracts/*.schema.json.
- Never report a database or deployment check as passed without a real connection: sessions cannot reach Neon or Vercel until Kem allows those hosts (docs/setup.md, step 1).

## Merge policy, decision 8

Pull requests from day one; never push to main. Under decision 25, Kem reviews and merges every pull request that changes the schema (src/lib/auth-schema.ts, the domain schema, drizzle/) or the sync contract (src/lib/contracts, contracts/, docs/sync-contract.md, the sync routes). Sessions merge the rest once CI is green.

## Where things are

- docs/implementation-plan.md: the plan.
- docs/decisions.md: the running record of decisions.
- docs/sync-contract.md: the sync contract, version 1.0.0.
- docs/setup.md: environment variables and Kem's setup steps.
- docs/verification.md: what was checked, where, with results.
- contracts/: JSON Schemas generated from src/lib/contracts by `pnpm contracts:json`.
- engine/: sync.py, the reference client Kem copies to the Mac, with its tests and README.

## Before you push

```sh
pnpm lint
pnpm typecheck
pnpm test
BETTER_AUTH_SECRET=any-32-or-more-characters-for-a-local-build BETTER_AUTH_URL=http://localhost:3000 pnpm build
python3 -m unittest discover -s engine/tests -t .
```

After a contract change, also run `pnpm contracts:json`; after a schema change, `pnpm db:generate`. Commit what they write, because CI fails when either is stale.
