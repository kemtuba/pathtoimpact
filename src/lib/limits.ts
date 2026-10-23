/**
 * Every cap and constant the portal and the sync contract rely on, in one place,
 * so a correction to a vendor number is a one-line change. Sources are named in
 * docs/implementation-plan.md; the medium-confidence ones are listed in
 * docs/plan/research-notes.md for Kem to spot-check.
 */

/** Sync contract version reported by ping. Changes within a major are additive. */
export const CONTRACT_VERSION = "1.0.0";
export const CONTRACT_MAJOR = 1;

/**
 * Cap on every resume, built PDF and sync body: 4 MiB, under Vercel's 4.5 MB
 * function payload limit, which binds both request and response bodies.
 */
export const MAX_BODY_BYTES = 4_194_304;

/** The scope caps the pilot at 10 users until the shared fetch lands. */
export const PILOT_CAP = 10;

/** Postings per push request; sync.py chunks to this size. */
export const POSTINGS_PER_REQUEST = 200;

export const EXCERPT_MAX_CHARS = 2_000;
export const PICK_REASON_MAX_CHARS = 500;
export const GATE_TRANSCRIPT_MAX_BYTES = 65_536;
export const RUN_LOG_TAIL_MAX_BYTES = 16_384;

/** Events younger than this are not served, so a late commit is never skipped. */
export const EVENT_SETTLE_MS = 10_000;
export const EVENTS_PAGE_MAX = 500;

/** Follow-up clock defaults; the overlay's follow_up_days overrides the first. */
export const FOLLOW_UP_DAYS_DEFAULT = 7;
export const STALE_DAYS = 21;
export const BUILD_STALL_DAYS = 7;

/** Retention: warning at day 83, deletion at day 90 from last activity. */
export const RETENTION_DAYS = 90;
export const RETENTION_WARNING_DAYS = 83;

/** Resend Free: 100 a day per account; 3 a day per address for unauthenticated triggers. */
export const RESEND_DAILY_CAP = 100;
export const UNAUTH_SENDS_PER_ADDRESS_PER_DAY = 3;

/** Invite links stay valid for 7 days; password resets keep better-auth's 1-hour default. */
export const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
