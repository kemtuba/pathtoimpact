# Decisions

The running record of decisions on the portal plan. Numbers are the plan's own, from section 9 of docs/implementation-plan.md. The scope's thirteen decisions are mapped to these in the table at the head of that section.

- **Decided** means Kem chose.
- **Default** means the plan acts on its recommendation unless Kem objects.
- **Open** means the plan waits on Kem.

## Decided 23 Oct 2026

Kem accepted the plan's recommendation on all eleven week-1 decisions.

| # | Decision | Choice | What it sets in motion |
|---|---|---|---|
| 1 | The Capital Clarity page | Hidden for now. The root shows a holding page, and the page's last version stays at commit 683ae5a on main. No new home and no redirect yet | Done in commit 2d83e2a, which reached main in merge commit ab7651f. The existing Vercel project is expected to deploy main to production. Neither its production branch nor the deploy of ab7651f has been observed, and section 8 of the plan asks Kem to confirm both. To restore: git checkout 683ae5a -- src/app/page.tsx src/components/TypeformWidget.tsx, then pnpm add @typeform/embed-react@4.7.0 |
| 2 | Hosting | Vercel Hobby until the first invite, then Pro before week 6 | Draft 1 offered no recommendation. This one was added on 23 Oct when Kem accepted the week-1 recommendations, and it can change with no code change. The existing project is in the team kems-projects-c9c438de, whose current plan sessions cannot see; Kem confirms it in the week-1 settings check |
| 3 | Auth | Built fresh on better-auth 1.7.12, from the proof's wiring | WS1 as written |
| 4 | Invites | Operator-created accounts, sign-up disabled, a 7-day hashed invite token | WS1 step 6 |
| 6 | Resumes and built PDFs | bytea in Postgres, capped at 4,194,304 bytes, with a nullable storage_key | WS2, WS4 and WS5 |
| 8 | Merge policy | Pull requests from day one. Kem merges changes to the schema or the sync contract; sessions merge the rest once CI is green | Branch protection on main. Vercel builds previews of session commits; section 8 of the plan asks Kem to confirm the production deploy of the first session-made merge, ab7651f |
| 10 | Where profiles live | Files in the engine repository, mirrored to the portal by the profiles push | The profile table and the profiles endpoint |
| 12 | Operator and user zero | One account with the operator role and a participant row, plus a second address for testing invites | Scope decision 6 is yes: Kem is user zero of V3 and V4 |
| 14 | Preview data | One fixed staging Neon branch, seeded with fixtures, never forked from production | Neon setup, and a staging Git branch served at the existing Vercel project's alias |
| 15 | Email verification | The invite link counts as verification | WS1 configuration |
| 25 | Kem's time budget | Sessions merge non-schema pull requests, and V1 and V2 are drafted after M4. M4 moves only if engine phase 1 slips | The estimate falls to about 65 to 82 hours, inside the scope's 65 to 85. M4 invites V3 and V4 users only |

## Defaults the plan acts on

| # | Decision | Default |
|---|---|---|
| 7 | Digest classification | Personalised sends through Resend's transactional API with unsubscribe headers |
| 19 | Follow-up clock | The portal is authoritative, with follow_up_days from the overlay, default 7 |
| 20 | Resume re-upload after the master is approved | The new file supersedes the old one, flags the master and notifies Kem. The approved master stays until Kem redrafts |

## Open

| # | Decision | Recommendation | Needed by |
|---|---|---|---|
| 5 | Which postings users see | Every judged posting, proposed first | week 4 |
| 9 | Digest timing | Send at the end of the push, with a Monday 13:00 UTC backstop. The hour is set once Kem says when the push finishes | week 5 |
| 11 | Isolation of the staffing opt-in | A separate Postgres schema now, and a dedicated role once anyone other than Kem reads the list. Goes to counsel with scope decision 9 | week 1, sent to counsel |
| 13 | What deletion leaves behind | Hard delete, plus a deletion log of hashes, timestamps and counts | week 6 |
| 16 | Form 3 pre-fill | Typed by hand for user zero at M2, drafted by Kem on the Mac before the first invite | week 3 |
| 17 | User zero's existing history | Start the portal empty and seed form 5 from the vault ledger | week 5 |
| 18 | Kem's own tracks as profiles | They stay engine-only tenants, with postings deduped across the two vaults | week 4 |
| 21 | Retention clock | 90 days from last activity, with a warning at day 83 | week 6 |
| 22 | Retention choice on form 6 | A required choice with nothing preselected | week 3 |
| 23 | Revoking pilot consent | Pause the participant and offer deletion | week 6 |
| 24 | Profile precision | One minus wrong-field passes over decided proposals, with seniority reported separately | week 6 |

The scope's profile and engine decisions, its numbers 1 to 5, 7, 8, 9, 11 and 12, stay open with Kem. Section 9 of the plan says which portal step each one gates.
