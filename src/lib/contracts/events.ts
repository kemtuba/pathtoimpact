import { z } from "zod";
import { isValidTimeZone } from "../env";
import { EVENTS_PAGE_MAX } from "../limits";
import { mondayOf } from "../week";
import { reasonCode } from "./reason-codes";
import { applicationVia, decisionKind, deletionReason, replyKind } from "./states";

/*
 * Relative imports throughout src/lib/contracts, because scripts/contracts-json.ts
 * runs under tsx, which does not resolve the @/ alias.
 */

// Section 4.1 conventions. They live here because every other contract file can
// import this one without an import cycle.

/** Ids are text, to match better-auth. */
export const textId = z.string().min(1);

/** Python's hexdigest is lowercase, so the contract is too. */
export const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase sha256 hex digest");

/** ISO 8601 with an offset. Z counts as one; a bare local time is refused. */
export const isoTimestamp = z.iso.datetime({ offset: true });

export const isoDate = z.iso.date();

export const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

function isRealWeek(key: string): boolean {
  try {
    mondayOf(key);
    return true;
  } catch {
    return false;
  }
}

/** The portal's week key. The regex is what the JSON Schema carries; the refine also rejects W00 and a W53 that does not exist. */
export const weekKeySchema = z
  .string()
  .regex(/^\d{4}-W\d{2}$/, "must look like 2026-W44")
  .refine(isRealWeek, "no such ISO week");

export const timeZone = z.string().min(1).refine(isValidTimeZone, "must be an IANA timezone");

/** The pattern repeats the protocol rule so the JSON Schema enforces it too. */
export const httpUrl = z
  .url({ protocol: /^https?$/ })
  .regex(/^https?:\/\//, "must be an http or https URL")
  .meta({ format: "uri" });

// The event stream, section 4.3.

/** bigserial ids travel as strings so no client loses precision past 2^53. */
export const eventId = z.string().regex(/^[1-9]\d*$/, "must be a positive integer as a string of digits");
export const eventCursor = z.string().regex(/^(0|[1-9]\d*)$/, "must be a non-negative integer as a string of digits");

const version = z.number().int().positive();

/** deletion_reason from section 5.2. Not in states.ts yet, so it is defined here. */

/** The draft fields of POST /api/sync/v1/builds in section 4.2, as the user approved them. */
export const approvedDraft = z.object({
  keywords: z.array(z.string()),
  tailored_md: z.string(),
  cover_letter_md: z.string().nullable(),
});

const userOnly = z.object({ user_id: textId });

/** Payload per kind, in the order of the section 4.3 table. */
export const eventPayloads = {
  "overlay.approved": z.object({
    user_id: textId,
    version,
    sha256: sha256Hex,
  }),
  "resume.uploaded": z.object({
    user_id: textId,
    resume_id: textId,
    sha256: sha256Hex,
    replaces_sha256: sha256Hex.nullable(),
  }),
  "decision.recorded": z
    .object({
      decision_id: textId,
      posting_id: textId,
      external_id: textId,
      decision: decisionKind,
      reason_code: reasonCode.nullable(),
      text: z.string().nullable(),
      disputed: z.boolean(),
      week_key: weekKeySchema,
      at: isoTimestamp,
    })
    // WS6 step 3: a pass always carries a reason code, because the codes are the eval loop's answer key.
    .refine((d) => d.decision !== "pass" || d.reason_code !== null, {
      message: "a pass needs a reason code",
      path: ["reason_code"],
    }),
  "build.requested": z.object({
    build_id: textId,
    posting_id: textId,
    external_id: textId,
    needs_draft_review: z.boolean(),
    requested_at: isoTimestamp,
  }),
  "build.draft_approved": z.object({
    build_id: textId,
    approved_draft: approvedDraft,
  }),
  "build.cancelled": z.object({
    build_id: textId,
  }),
  "application.confirmed": z.object({
    application_id: textId,
    posting_id: textId,
    external_id: textId,
    // Null when the user applied with their own resume, WS6 step 6.
    build_id: textId.nullable(),
    applied_on: isoDate,
    applied_tz: timeZone,
    via: applicationVia,
    referral_name: z.string().nullable(),
    tier: z.string().nullable(),
    confirmed_sha256: sha256Hex.nullable(),
    master_sha256: sha256Hex.nullable(),
  }),
  "reply.recorded": z.object({
    reply_id: textId,
    application_id: textId,
    external_id: textId,
    kind: replyKind,
    on: isoDate,
    note: z.string().nullable(),
  }),
  "master.approved": z.object({
    master_id: textId,
    user_id: textId,
    profile_id: textId,
    version,
    sha256: sha256Hex,
  }),
  "survey.answered": z.object({
    survey_id: textId,
    user_id: textId,
    week_key: weekKeySchema,
    question_id: textId,
    answer: z.string(),
  }),
  "participant.paused": userOnly,
  "participant.resumed": userOnly,
  "deletion.requested": z.object({
    user_id: textId,
    // Null when the participant is deleted before a vault was made.
    vault_slug: z.string().min(1).nullable(),
    requested_at: isoTimestamp,
    reason: deletionReason,
  }),
};

export type EventKind = keyof typeof eventPayloads;
export type EventPayload<K extends EventKind> = z.output<(typeof eventPayloads)[K]>;

export const EVENT_KINDS = Object.keys(eventPayloads) as EventKind[];

function envelope<K extends EventKind>(kind: K) {
  return z.object({
    id: eventId,
    kind: z.literal(kind),
    user_id: textId,
    at: isoTimestamp,
    payload: eventPayloads[kind],
  });
}

/** One row of the stream. The union is keyed on kind, so a parse narrows the payload. */
export const syncEvent = z.discriminatedUnion("kind", [
  envelope("overlay.approved"),
  envelope("resume.uploaded"),
  envelope("decision.recorded"),
  envelope("build.requested"),
  envelope("build.draft_approved"),
  envelope("build.cancelled"),
  envelope("application.confirmed"),
  envelope("reply.recorded"),
  envelope("master.approved"),
  envelope("survey.answered"),
  envelope("participant.paused"),
  envelope("participant.resumed"),
  envelope("deletion.requested"),
]);

export type SyncEvent = z.output<typeof syncEvent>;

/** GET /api/sync/v1/events query. The engine owns the cursor; 0 reads from the start. */
export const eventsQuery = z.object({
  after: eventCursor.default("0"),
  limit: z.coerce.number().int().min(1).max(EVENTS_PAGE_MAX).default(EVENTS_PAGE_MAX),
});

/**
 * GET /api/sync/v1/events response. next_after is the cursor to send next: the
 * last event's id, or the request's own after when the page is empty, so the
 * client never has to special-case an empty page.
 */
export const eventsResponse = z.object({
  events: z.array(syncEvent).max(EVENTS_PAGE_MAX),
  next_after: eventCursor,
  has_more: z.boolean(),
});

export type EventsResponse = z.output<typeof eventsResponse>;
