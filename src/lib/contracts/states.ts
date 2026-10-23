import { z } from "zod";

/**
 * Entity states, section 5.5 of the plan. Portal-owned vocabularies are
 * enums here and Postgres enums in the schema. docs/states.md is kept in sync
 * with this file by a test once that document exists.
 */

export const participantState = z.enum([
  "invited",
  "password_set",
  "intake_in_progress",
  "intake_submitted",
  "changes_requested",
  "intake_approved",
  "vault_created",
  "master_in_review",
  "master_approved",
  "active",
  "paused",
  "deletion_requested",
  "vault_pending",
  "deleted",
]);

export const overlayStatus = z.enum(["draft", "submitted", "changes_requested", "approved", "superseded"]);

export const masterStatus = z.enum(["in_review", "approved", "superseded"]);

/** "stalled" is derived, never stored: ready with no application after BUILD_STALL_DAYS. */
export const buildStatus = z.enum([
  "requested",
  "drafting",
  "draft_review",
  "approved_draft",
  "building",
  "uploading",
  "ready",
  "downloaded",
  "sent",
  "cancelled",
  "failed",
]);

/** Legal build transitions. The sync endpoints and the user actions both check against this. */
export const buildTransitions: Record<z.infer<typeof buildStatus>, readonly z.infer<typeof buildStatus>[]> = {
  requested: ["drafting", "building", "cancelled", "failed"],
  drafting: ["draft_review", "failed"],
  draft_review: ["approved_draft", "cancelled", "failed"],
  approved_draft: ["building", "failed"],
  building: ["uploading", "failed"],
  uploading: ["uploading", "ready", "failed"],
  ready: ["uploading", "downloaded", "sent"],
  downloaded: ["sent"],
  sent: [],
  cancelled: [],
  failed: ["requested"],
};

export function canTransition(from: z.infer<typeof buildStatus>, to: z.infer<typeof buildStatus>): boolean {
  return buildTransitions[from].includes(to);
}

export const applicationState = z.enum(["sent", "follow_up_due", "second_follow_up", "stale", "written_off", "replied"]);

export const deletionStatus = z.enum(["requested", "portal_purged", "vault_pending", "done"]);

export const decisionKind = z.enum(["apply", "stretch", "pass"]);

export const replyKind = z.enum(["screen", "interview", "offer", "rejected", "no_response", "withdrawn"]);

export const applicationVia = z.enum(["portal", "email", "referral"]);

export const claimStatus = z.enum(["safe", "safe_as_written", "retired"]);

export type ParticipantState = z.infer<typeof participantState>;
export type BuildStatus = z.infer<typeof buildStatus>;
