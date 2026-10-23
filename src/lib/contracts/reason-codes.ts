import { z } from "zod";
// Type-only imports: erased at runtime, so events.ts can import this file without a cycle.
import type { OverlayFieldPath } from "./overlay";
import type { FacetKey } from "./posting-export";

/*
 * Reason codes, section 5.3: the scope's ten plus verdict_wrong for a dispute.
 * Each maps to what the scope's feedback schema says a pass with that code
 * should tune, so the engine and the four-week review read the same answer key.
 */

export const REASON_CODES = [
  "too_senior",
  "too_junior",
  "wrong_field",
  "location",
  "pay",
  "not_interesting",
  "outshone",
  "duplicate",
  "posting_gone",
  "other",
] as const;

export const DISPUTE_REASON_CODE = "verdict_wrong";

export const ALL_REASON_CODES = [...REASON_CODES, DISPUTE_REASON_CODE] as const;
export type ReasonCode = (typeof ALL_REASON_CODES)[number];

export const reasonCode = z.enum(ALL_REASON_CODES);

export type ReasonCodeMapping = { description: string } & (
  | { kind: "ceiling_words"; overlay_fields: readonly OverlayFieldPath[] }
  | { kind: "sourcing_rule"; rules: readonly ("title_patterns" | "screens")[] }
  | { kind: "facet"; facet: FacetKey }
  | { kind: "overlay"; overlay_fields: readonly OverlayFieldPath[] }
  | { kind: "none" }
);

/** Form 3's rung, manages_people and stretch_years feed fit.py's ceiling words, per section 5.7. */
const ceilingFields = ["form_3.rung", "form_3.manages_people", "form_3.stretch_years"] as const;

export const REASON_CODE_MAPPING: Readonly<Record<ReasonCode, ReasonCodeMapping>> = {
  too_senior: {
    description: "The role is above the person's level.",
    kind: "ceiling_words",
    overlay_fields: ceilingFields,
  },
  too_junior: {
    description: "The role is below the person's level.",
    kind: "ceiling_words",
    overlay_fields: ceilingFields,
  },
  wrong_field: {
    description: "The role is outside the profile's field.",
    kind: "sourcing_rule",
    rules: ["title_patterns", "screens"],
  },
  location: {
    description: "The location does not work for the person.",
    kind: "overlay",
    overlay_fields: ["form_2.metro", "form_2.remote_ok", "form_2.relocation", "form_2.country"],
  },
  pay: {
    description: "The pay is under the person's floor.",
    kind: "overlay",
    overlay_fields: ["form_2.pay_floor_annual", "form_2.pay_floor_hourly"],
  },
  not_interesting: {
    description: "In range, but the person does not want it.",
    kind: "none",
  },
  outshone: {
    description: "The field of applicants is likely to be stronger.",
    kind: "facet",
    facet: "competitive",
  },
  duplicate: {
    description: "The same role was already shown.",
    kind: "none",
  },
  posting_gone: {
    description: "The posting is closed or its link is dead.",
    kind: "none",
  },
  other: {
    description: "Anything else; the decision text says what.",
    kind: "none",
  },
  verdict_wrong: {
    description: "The person disputes the engine's fit verdict.",
    kind: "none",
  },
};
