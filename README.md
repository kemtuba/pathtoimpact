# pathtoimpact

The portal for the pathtoimpact.us job-search pilot. Invited job seekers complete intake, see the roles Kem's engine proposes each week, ask for tailored resumes and record what they applied to. Kem runs the engine on a Mac, and it talks to the portal only through the sync contract.

Today the site is a holding page at the root, plus the M0 skeleton: invite-only auth wiring with a stub sign-in page, the sync ping endpoint, the zod contracts and their JSON Schemas, and the reference client engine/sync.py.

This repository is public. Nothing personal is committed, and every fixture is synthetic.

## Where things are decided

| File | What it holds |
|---|---|
| docs/implementation-plan.md | The plan: architecture, the sync contract, the data model, workstreams, milestones, needs and decisions |
| docs/decisions.md | The running record of decisions, numbered as in the plan |
| docs/plan/ | The plan's evidence: vendor research notes, the stack proof patch, the critique findings |
| docs/sync-contract.md | The sync contract, version 1.0.0, for the engine side |
| docs/setup.md | Every environment variable and where it is set, and Kem's setup steps |
| docs/verification.md | What was checked, where, and the result |
| CLAUDE.md | The rules for changing code here |
| engine/README.md | How to install and run sync.py on the Mac |

## Stack

Next.js 16.4.2, React 19.3.1, better-auth 1.7.12, Drizzle ORM 0.45.4 over Neon's HTTP driver, Resend, zod 4, Tailwind CSS 4, TypeScript 5. pnpm 10 and Node 22 or later. Hosted on Vercel, in the existing project pathtoimpact.

## Run locally

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open http://localhost:3000. Before `pnpm dev`, edit .env.local:

- Set BETTER_AUTH_SECRET to 32 or more random characters, for example from `openssl rand -base64 32`.
- Set SYNC_ENV to `development`, or remove the line, if you will point `sync.py --env development` at this server.
- To try the ping endpoint, run `pnpm sync:token`, put the printed sha256 in SYNC_TOKEN_SHA256, restart, and call `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/sync/v1/ping`.

Pages that query the database need DATABASE_URL pointing at a Neon branch. The HTTP driver cannot talk to a local Postgres.

## Package scripts

| Script | What it does |
|---|---|
| `pnpm dev` | `next dev`: the development server on port 3000 |
| `pnpm build` | `next build`: a production build. Without BETTER_AUTH_SECRET and BETTER_AUTH_URL it still exits 0 but logs better-auth errors, so pass both, dummy values locally; see docs/setup.md |
| `pnpm start` | `next start`: serves the last build |
| `pnpm lint` | `eslint` over the repository |
| `pnpm typecheck` | `next typegen`, which writes the route types, then `tsc --noEmit` |
| `pnpm test` | `vitest run`: the contract-tier tests in tests/, with no database |
| `pnpm db:generate` | `drizzle-kit generate`: writes a SQL migration into drizzle/ from the schema |
| `pnpm db:migrate` | `tsx scripts/migrate.ts`: applies drizzle/ through Neon's HTTP driver, using DATABASE_URL_UNPOOLED or DATABASE_URL |
| `pnpm db:check` | `drizzle-kit check`: checks that the migration history in drizzle/ is consistent |
| `pnpm auth:generate` | Regenerates src/lib/auth-schema.ts with the better-auth CLI, `pnpm dlx auth@1.7.12 generate`. Set BETTER_AUTH_SECRET first |
| `pnpm contracts:json` | `tsx scripts/contracts-json.ts`: writes contracts/*.schema.json from src/lib/contracts |
| `pnpm sync:token` | `tsx scripts/make-sync-token.ts`: prints a new sync token and its sha256 |
| `pnpm build:vercel` | `bash scripts/vercel-build.sh`: migrates first on a production deploy only, then runs `next build`. The Vercel build command once Kem sets it |

## Tests and checks

```sh
pnpm lint
pnpm typecheck
pnpm test
BETTER_AUTH_SECRET=any-32-or-more-characters-for-a-local-build BETTER_AUTH_URL=http://localhost:3000 pnpm build
python3 -m py_compile engine/sync.py
python3 -m unittest discover -s engine/tests -t .
```

CI in .github/workflows/ci.yml runs all of these on every pull request, with the engine tests on Python 3.9. It also runs `pnpm db:check`, and fails when drizzle/ or contracts/ was not regenerated and committed after a schema or contract change.

Database-tier tests come with the domain schema in WS2. They need a Neon staging branch that sessions can reach; docs/setup.md says how.
