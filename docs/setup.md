# Setup

What has to be set, and where, for the portal to build, deploy and sync. It is written for Kem and follows sections 3.3 and 8 of docs/implementation-plan.md. Sessions cannot change any of these settings, so each step below is Kem's.

## Environment variables

Places, as used in the table:

- **Production** and **Preview** are the environment variable scopes of the existing Vercel project pathtoimpact, in the team kems-projects-c9c438de. Set Preview values for all Preview branches, so every preview builds.
- **Claude Code environment** is this cloud environment's settings: the cloud environment menu in the session's title bar, then Edit. A new session picks up a change.
- **GitHub Actions** is the repository's Actions secrets.
- **The Mac** is the vault on Kem's Mac, where sync.py runs.
- **Local** is .env.local, copied from .env.example. Never commit it.

### The portal

| Variable | Where it is set | Build needs it | Purpose |
|---|---|---|---|
| BETTER_AUTH_SECRET | Production and Preview, with a different value in each; local | No, but set it before the first deploy. See the note below | better-auth reads it on import, to sign sessions and tokens |
| BETTER_AUTH_URL | Production: the production host, https://pathtoimpact.us if that domain is on the project. Preview: https://pathtoimpact-git-staging-kems-projects-c9c438de.vercel.app, for all Preview branches. Local: http://localhost:3000 | No, but set it before the first deploy. See the note below | Base URL for auth callbacks and links. Auth and sync are verified only on the staging alias; other previews are build checks and cannot sign in |
| DATABASE_URL | Production: the pooled string of the Neon production branch. Preview, the Claude Code environment and GitHub Actions: the pooled string of the staging branch | No | Runtime queries |
| DATABASE_URL_UNPOOLED | Production: the direct string of the Neon production branch. Preview, the Claude Code environment and GitHub Actions: the direct string of the staging branch | Only when the build migrates, which is a production build once the build command is `pnpm run build:vercel` | Migrations, through `pnpm db:migrate` |
| RESEND_API_KEY | Production and Preview, one key per environment | No | Resend's client, constructed per send, never at module load |
| EMAIL_FROM | Production and Preview | No | The sending address on the mail subdomain, for example `no-reply@mail.pathtoimpact.us` |
| EMAIL_REPLY_TO | Production and Preview | No | The reply-to mailbox |
| SYNC_TOKEN_SHA256 | Production and Preview, with a different value in each | No | The sha256 of the sync token, from `pnpm sync:token`. The portal stores only the hash |
| SYNC_TOKEN_SHA256_PREVIOUS | Production and Preview, during a rotation only | No | The hash being rotated out, so sync keeps working while the key file changes |
| SYNC_ENV | Production: `production`. Preview: `staging`. Local: leave unset, which reports `development` | No | Echoed by ping, so sync.py refuses a target that is not the environment it expects |
| CRON_SECRET | Production and Preview, with a different value in each. Needed by week 5 | No | Cron handlers answer 401 without it |
| OPERATOR_EMAIL, OPERATOR_USER_ID | Production | No | The Friday summary, and the adminUserIds safety net |
| DEFAULT_TIMEZONE | Every environment | No | The operator's timezone, which defines week keys and the default applied date. Unset, it falls back to America/New_York until Kem confirms the zone |
| VERCEL_ENV | Set by Vercel itself; do not set it | No | scripts/vercel-build.sh migrates only when it is `production` |

**What a build needs.** A build without BETTER_AUTH_SECRET and BETTER_AUTH_URL still exits 0, but it logs better-auth errors, and sign-in fails at run time until both are set. This was verified on 23 Oct 2026 with Next 16.4.2. It corrects the plan's section 3.3, which marks both as needed at build. The project builds every push, so set both in Production and in Preview for all branches before the first deploy anyway. CI and local builds pass dummy values:

```sh
BETTER_AUTH_SECRET=any-32-or-more-characters-for-a-local-build BETTER_AUTH_URL=http://localhost:3000 pnpm build
```

Vercel applies a changed variable on the next deployment, so redeploy after changing one.

### Sync and tests outside Vercel

| Variable | Where it is set | Purpose |
|---|---|---|
| SYNC_URL | The Claude Code environment: the staging alias. The Mac: only if there is no key file | Where sync.py sends requests |
| SYNC_TOKEN | The Claude Code environment: the staging raw token. The Mac: only if there is no key file | The raw sync token sync.py presents. Sessions never hold the production token |
| STAGING_DATABASE_URL, STAGING_DATABASE_URL_UNPOOLED, STAGING_SYNC_TOKEN | GitHub Actions secrets | The staging database strings and the staging raw token, for database-tier tests and the sync smoke test. ci.yml does not read them yet; the jobs that do arrive with WS2 and WS4 |
| SYNC_KEY_FILE, SYNC_ROOT | The Mac, optional | Defaults for sync.py's `--key-file` and `--root` |

On the Mac the raw tokens normally live in the vault's key file, one entry per environment. engine/README.md gives its format.

## Setup steps, in order

### 1 Network access for this cloud environment, day 1

On 23 Oct the session's proxy refused Neon, Vercel and Resend hosts. Until that changes no session can migrate, run database tests or call a deployment, and database-tier tests run in GitHub Actions instead.

1. Open the cloud environment menu in the session's title bar, then Edit, then Network access.
2. Under Allowed domains add `*.neon.tech` and `*.vercel.app`. The second covers the staging alias.
3. Leave Allow package managers ticked.

The steps are at https://code.claude.com/docs/en/cloud-environments#network-access. A new session picks up the change.

### 2 Settings check of the existing Vercel project, day 1

The project pathtoimpact, in the team kems-projects-c9c438de, already deploys this repository and posts preview links on pull requests. Check and, where needed, change:

1. The production branch is main.
2. The domains on Production, pathtoimpact.us among them if wanted.
3. The team's current plan. Decision 2 is Hobby until the first invite, then Pro before week 6.
4. Fluid compute is on. It is the default only for projects created on or after 23 April 2025, and this project's creation date is not known.
5. Node.js version 24.
6. Function region iad1, beside Neon's aws-us-east-1.
7. Whether deployment protection is on for previews. If it is, decide how sync.py and invite links reach the staging alias. sync.py never follows a redirect, so a protected alias shows up as a redirect error.
8. Remove any environment variables left from the Capital Clarity page.
9. Set BETTER_AUTH_SECRET and BETTER_AUTH_URL for Production and for all Preview branches, with different secrets. `openssl rand -base64 32` makes a secret.
10. Leave the build command alone until the pull request that adds `build:vercel` to package.json is merged to main. Then set it to `pnpm run build:vercel`.

Also on day 1:

- On the Deployments tab, confirm that the production deploy of merge commit ab7651f succeeded and shows the holding page on every domain the project serves.
- Say whether the Capital Clarity page lives on any host other than this project. The Typeform form may still take responses at its own link until it is closed in Typeform.

### 3 The staging branch

1. On GitHub, create a branch named `staging` from main.
2. The project serves it at https://pathtoimpact-git-staging-kems-projects-c9c438de.vercel.app. That alias is the only preview that can sign in, and it is the staging target for sync.py.

Sessions can push only to their own branch, so work reaches staging by pull request.

### 4 Neon

1. Create a Neon project named pathtoimpact in aws-us-east-1. Keep the compute pinned small.
2. Create one branch named staging. It is the fixed staging branch of decision 14: seeded with fixtures and never forked from production. The Free plan allows 10 branches and sells no more, so there is no branch per pull request.
3. Copy both connection strings for each branch: the pooled one, whose host contains `-pooler`, and the direct one.
4. Production branch strings go into Vercel Production as DATABASE_URL and DATABASE_URL_UNPOOLED.
5. Staging branch strings go into Vercel Preview under the same names, into the Claude Code environment under the same names, and into GitHub Actions as STAGING_DATABASE_URL and STAGING_DATABASE_URL_UNPOOLED.
6. Do not create a Neon API key. Nothing here uses one.

Once Neon is allowed, a session applies the migrations to staging with `pnpm db:migrate`. Take a Neon snapshot before any production deploy that migrates.

### 5 Resend and DNS, start in week 1

Domain verification takes 15 minutes to 72 hours. Until it completes, Resend sends only from onboarding@resend.dev to the account owner's own address. That covers M0 to M2, and invite links print to the operator when mail cannot be sent.

1. Create a Resend account and one API key per environment.
2. Add the sending subdomain, recommended mail.pathtoimpact.us, and put Resend's DNS records where pathtoimpact.us DNS is hosted.
3. Say where that DNS is hosted and whether mail already runs on the root domain.
4. Pick a reply-to mailbox.
5. Set RESEND_API_KEY, EMAIL_FROM and EMAIL_REPLY_TO in Vercel Production and Preview.

The Free plan sends 100 emails a day, resetting at 00:00 UTC, and 3,000 a month, and fails hard at the cap.

### 6 GitHub branch protection and Actions secrets, week 1

Decision 8: pull requests from day one. Kem reviews and merges any change to the schema or the sync contract, and sessions merge the rest once CI is green.

1. Protect main: require a pull request before merging, and require the two CI checks from .github/workflows/ci.yml, "Lint, typecheck, test, build" and "Engine client on Python 3.9". Do not require an approving review, or sessions cannot merge the pull requests decision 25 lets them merge.
2. Add the Actions secrets STAGING_DATABASE_URL, STAGING_DATABASE_URL_UNPOOLED and STAGING_SYNC_TOKEN, all for staging. No production credential goes into GitHub.
3. Confirm whether a session may push workflow files. If the push of .github/workflows/ci.yml is refused, commit it from the session's draft.

### 7 Sync tokens

Make one token per environment, and never reuse one across environments, so a wrong SYNC_URL cannot push a real week into staging or pull fixtures into a real vault.

1. In this repository run `pnpm sync:token`. It prints a token and its sha256.
2. Production token: put its sha256 in Vercel Production as SYNC_TOKEN_SHA256, set SYNC_ENV to `production` there, and put the token in the vault key file's production entry.
3. Staging token: put its sha256 in Vercel Preview as SYNC_TOKEN_SHA256, set SYNC_ENV to `staging` there, and put the token in the key file's staging entry. Also put it in the Claude Code environment as SYNC_TOKEN, with SYNC_URL set to the staging alias, and in GitHub Actions as STAGING_SYNC_TOKEN.
4. Keep the key file out of git and readable only by Kem: add it to the vault's .gitignore and run `chmod 600` on it.
5. Redeploy. Copy engine/sync.py into the vault, for example as tools/sync.py, and from the vault run `python3 tools/sync.py ping --env staging --key-file .sync-keys.json`, then the same with `--env production` once production has deployed the ping route. That is the M0 check.

To rotate a token: move the current hash to SYNC_TOKEN_SHA256_PREVIOUS, set the new hash as SYNC_TOKEN_SHA256, redeploy, update the key file, then clear SYNC_TOKEN_SHA256_PREVIOUS and redeploy again.

## Facts to send back

These are section 8 needs that are answers, not settings:

- Kem's operator email and display name, and a second address for testing invites. A plus-address alias works.
- Kem's timezone. America/New_York is assumed until then.
- The Mac's `python3 --version`. The client's floor is 3.9.
- When the Sunday push usually finishes, which sets the digest timing of decision 9.
