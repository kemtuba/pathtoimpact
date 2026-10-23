import { z } from "zod";
import { FOLLOW_UP_DAYS_DEFAULT } from "../limits";
import { httpUrl, isoMonth, textId, timeZone } from "./events";

/*
 * The overlay, section 5.7, field by field and grouped by form. Form 4 writes
 * resume_file and form 6 writes consent rows, so neither appears here.
 * Required versus optional follows the table's Required column. Where it says
 * "A or B", a refine enforces it and a meta hint carries it into the JSON
 * Schema, which does not see refines.
 */

/** Form caps from the section 5.7 table. They are form limits, not platform limits, so they sit here rather than in limits.ts. */
export const PROJECTS_MAX = 4;
export const TARGET_EMPLOYERS_MAX = 50;

export const CERTIFICATIONS = ["CISA", "CIA", "CPA", "AIGP", "ISO 42001 LA", "CIPP"] as const;

function reportOnly<T extends z.ZodType>(schema: T): T {
  return schema.meta({
    "x-report-only": true,
    description: "Report only: the engine stores and shows it and never scores on it.",
  });
}

const text = z.string().min(1);

// Form 1: profiles.

export const overlayForm1 = z
  .object({
    primary_profile_id: textId.optional(),
    secondary_profile_id: textId.optional(),
    // The operator resolves this with Assign profile, which sets primary_profile_id.
    not_sure: z.boolean().optional(),
  })
  .refine((f) => f.primary_profile_id !== undefined || f.not_sure === true, {
    message: "choose a primary profile, or not sure",
    path: ["primary_profile_id"],
  })
  .refine((f) => f.secondary_profile_id === undefined || f.secondary_profile_id !== f.primary_profile_id, {
    message: "the secondary profile must differ from the primary",
    path: ["secondary_profile_id"],
  })
  .meta({
    anyOf: [{ required: ["primary_profile_id"] }, { required: ["not_sure"], properties: { not_sure: { const: true } } }],
  });

// Form 2: identity, where, pay, limits, report-only facts, timezone.

export const overlayForm2 = z
  .object({
    // Identity for the PDF.
    name_printed: text,
    email: z.email(),
    phone: text.optional(),
    linkedin_url: httpUrl.optional(),
    site_url: httpUrl.optional(),
    resume_filename: text,
    // Where.
    metro: text.optional(),
    remote_ok: z.boolean().optional(),
    relocation: z.boolean().optional(),
    country: text.optional(),
    // Pay.
    pay_floor_annual: z.number().positive().optional(),
    pay_floor_hourly: z.number().positive().optional(),
    // Limits.
    max_travel_pct: z.number().int().min(0).max(100).optional(),
    max_onsite_days: z.number().int().min(0).max(7).optional(),
    other_limits: text.optional(),
    // Report only.
    work_authorization: reportOnly(text).optional(),
    clearance: reportOnly(text).optional(),
    // Portal clocks only; the engine does not read it.
    timezone: timeZone,
  })
  .refine((f) => f.metro !== undefined || f.remote_ok === true, {
    message: "give a metro, or say remote is fine",
    path: ["metro"],
  })
  .refine((f) => f.pay_floor_annual !== undefined || f.pay_floor_hourly !== undefined, {
    message: "give an annual or an hourly pay floor",
    path: ["pay_floor_annual"],
  })
  .meta({
    allOf: [
      { anyOf: [{ required: ["metro"] }, { required: ["remote_ok"], properties: { remote_ok: { const: true } } }] },
      { anyOf: [{ required: ["pay_floor_annual"] }, { required: ["pay_floor_hourly"] }] },
    ],
  });

/** Stored and shown by the engine, never scored [scope]. The satisfies clause keeps the list in step with form 2. */
export const REPORT_ONLY_FIELDS = ["work_authorization", "clearance"] as const satisfies readonly (keyof z.output<
  typeof overlayForm2
>)[];
export type ReportOnlyField = (typeof REPORT_ONLY_FIELDS)[number];

// Form 3: the record.

/** One profile kind claimed for a role, with its single evidence line from the resume. */
export const overlayRoleKind = z.object({
  kind_id: textId,
  evidence: text,
});

export const overlayRole = z
  .object({
    title: text,
    employer: text,
    employment_type: text.optional(),
    start_month: isoMonth,
    end_month: isoMonth.optional(),
    current: z.boolean().optional(),
    kinds: z.array(overlayRoleKind).default([]),
  })
  .refine((r) => (r.end_month !== undefined) !== (r.current === true), {
    message: "give an end month, or mark the role current, not both",
    path: ["end_month"],
  })
  .refine((r) => r.end_month === undefined || r.end_month >= r.start_month, {
    message: "the end month is before the start month",
    path: ["end_month"],
  })
  .meta({
    oneOf: [{ required: ["end_month"] }, { required: ["current"], properties: { current: { const: true } } }],
  });

export const overlayForm3 = z.object({
  roles: z.array(overlayRole).min(1),
  // From the profile's list, plus anything typed in.
  tools: z.array(text).optional(),
  highest_degree: text,
  phd: z.boolean().optional(),
  certifications: z.array(z.enum(CERTIFICATIONS)).optional(),
  // Asked for the L1 track only.
  bar_admission: text.optional(),
  rung: text,
  manages_people: z.boolean().optional(),
  stretch_years: z.number().int().nonnegative().optional(),
});

// Form 5: preferences and allocation.

export const overlayProject = z.object({
  name: text,
  url: httpUrl,
  note: text.optional(),
});

export const overlayTargetEmployer = z.object({
  name: text,
  site: httpUrl.optional(),
});

/** An application or interview already under way, the stop rule's starting state. */
export const overlayInFlight = z.object({
  company: text,
  role: text.optional(),
});

export const overlayForm5 = z
  .object({
    screen_domains: z.array(text).optional(),
    // Ordered, most wanted first, over the profile's employer types.
    interest_ranking: z.array(text).optional(),
    projects: z.array(overlayProject).max(PROJECTS_MAX).optional(),
    target_employers: z.array(overlayTargetEmployer).max(TARGET_EMPLOYERS_MAX).optional(),
    apps_per_week: z.number().int().min(1),
    heavy_portal_per_week: z.number().int().min(0),
    already_applied: z.array(overlayInFlight).optional(),
    interviews_in_progress: z.array(overlayInFlight).optional(),
  })
  .refine((f) => f.heavy_portal_per_week <= f.apps_per_week, {
    message: "heavy-portal applications are part of the weekly total, so they cannot exceed it",
    path: ["heavy_portal_per_week"],
  });

// Operator-set.

export const overlayOperator = z.object({
  follow_up_days: z.number().int().min(1).default(FOLLOW_UP_DAYS_DEFAULT),
});

export const overlay = z.object({
  form_1: overlayForm1,
  form_2: overlayForm2,
  form_3: overlayForm3,
  form_5: overlayForm5,
  // prefault, not default, so a missing section still runs through the schema and picks up follow_up_days.
  operator: overlayOperator.prefault({}),
});

export type OverlayInput = z.input<typeof overlay>;
export type Overlay = z.output<typeof overlay>;

/** "form_2.metro" and so on: a dotted path to one overlay field, used by the reason-code mapping. */
export type OverlayFieldPath = {
  [F in keyof Overlay]: `${F & string}.${Extract<keyof Overlay[F], string>}`;
}[keyof Overlay];
