# How this plan was made, and what is in this folder

The plan in docs/implementation-plan.md was produced on 22 and 23 October 2026 from the Build Scope artifact, draft 1 of 21 October 2026, and a direct inspection of this repository. It was not written in one pass.

1. Ground truth first. The repository, the reachable GitHub repositories, the published package versions and the container toolchain were inspected and written down as facts. Two facts changed the scope: gallery-os and the engine are not reachable from a Claude Code session, and the repository already serves a different business at its only route.
2. Four research agents read vendor documentation for Vercel, Neon, better-auth and Resend plus the Next.js 16 changes, each citing a source and a confidence per claim. Those claims are in research-notes.md.
3. One agent installed the scope's stack on a scratch copy of this exact scaffold, wired auth, the database client, the Next 16 proxy file and a token-checked sync endpoint, and ran lint, build and a smoke test. The result is proof-of-stack.patch. It was regenerated on 23 Oct after the Capital Clarity offer was hidden, and it applies cleanly to commit 2d83e2a with git apply and builds once BETTER_AUTH_SECRET and BETTER_AUTH_URL are set.
4. Three planners drafted independent plans from different angles: thinnest vertical slice first, data and contract first, the operator's week first. Two judges scored them for fidelity to the scope, feasibility, completeness of needs and decisions, and sequencing. Both picked the operator's week first and named grafts from the other two and blind spots all three shared.
5. A synthesizer wrote the single plan from the winner plus the grafts and blind spots. Two adversarial critics then attacked it, one against the scope section by section and one for platform limits, security and failure recovery. They returned 67 findings. The accepted ones are folded into draft 1.1, and its revision note lists what changed.

## Files

| File | What it is | How to use it |
|---|---|---|
| ../implementation-plan.md | The plan: coverage, ground truth, architecture, the sync contract, the data model, workstreams, milestones, needs, decisions, assumptions, risks, the first session's checklist | Read sections 8 and 9 first; they are the asks |
| research-notes.md | 113 vendor claims with source URL and confidence, grouped by topic | Spot-check the medium and low confidence rows before relying on them; every cap that reaches code lives in one constants file |
| proof-of-stack.patch | The feasibility proof's diff against the scaffold: package additions, .env.example, drizzle.config.ts, the generated auth schema and its first migration, src/lib/db.ts, src/lib/auth.ts, src/proxy.ts, the auth route, a sync ping route and a session-gated page | From a clean checkout: git apply docs/plan/proof-of-stack.patch, then pnpm install, then BETTER_AUTH_SECRET=<32 or more chars> BETTER_AUTH_URL=http://localhost:3000 pnpm build. The lockfile is deliberately not in the patch; pnpm install regenerates it |
| critique-findings.md | The 67 critic findings on draft 1, each with its proposed fix and what draft 1.1 did with it | Trace any change in the revision note back to the finding behind it |

The patch is evidence, not the first commit. The plan's first-session checklist applies it and then moves the proof's routes to their final paths.

The source brief is the Build Scope artifact, draft 1 of 21 Oct 2026, private to Kem's claude.ai account at https://claude.ai/artifact/4UKAgH5zarcefiq5S4u8Ab. This repository is public, so the scope itself is not copied here: it holds Kem's own application record.
