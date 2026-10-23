import { z } from "zod";
import { sha256Hex, textId } from "./events";

/*
 * PUT /api/sync/v1/profiles, section 4.2. Profiles live as files in the engine
 * repository (decision 10) and this push mirrors them, so the portal can show
 * them on forms 1, 3 and 5. Strict objects, as for every engine-to-portal body.
 */

export const PROFILE_STATUSES = ["draft", "active", "demoted"] as const;
export const profileStatus = z.enum(PROFILE_STATUSES);

/** A kind of work the profile scores, with the bar a role must clear to count, ticked on form 3. */
export const profileKind = z.strictObject({
  id: textId,
  label: z.string().min(1),
  bar: z.string().min(1),
});

const names = z.array(z.string().min(1));

export const profileForm = z
  .strictObject({
    kinds: z.array(profileKind),
    tools: names,
    employer_types: names,
    screens_default: names,
  })
  .refine((form) => new Set(form.kinds.map((k) => k.id)).size === form.kinds.length, {
    message: "kind ids must be unique within a profile",
    path: ["kinds"],
  });

/** The shape of pay_range is a guess until the profile files arrive from the engine repository. */
export const payRange = z
  .strictObject({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/, "must be an ISO 4217 code"),
    period: z.enum(["annual", "hourly"]),
  })
  .refine((r) => r.min <= r.max, { message: "min must not exceed max", path: ["max"] });

const positiveInt = z.number().int().positive();

export const profileMirror = z.strictObject({
  id: textId,
  name: z.string().min(1),
  description: z.string(),
  node: z.string().min(1),
  // Engine-owned text, null when the profile needs no ruling.
  ruling_status: z.string().min(1).nullable(),
  status: profileStatus,
  version: positiveInt,
  lookup_version: positiveInt,
  example_titles: names,
  form: profileForm,
  pay_range: payRange.optional(),
  sha256: sha256Hex,
});

export type ProfileMirror = z.output<typeof profileMirror>;

/** Profiles absent from the body are left untouched, so a partial push is safe. */
export const profilesRequest = z
  .strictObject({
    profiles: z.array(profileMirror).min(1),
  })
  .refine((body) => new Set(body.profiles.map((p) => p.id)).size === body.profiles.length, {
    message: "profile ids must be unique within a request",
    path: ["profiles"],
  });

export type ProfilesRequest = z.output<typeof profilesRequest>;

const count = z.number().int().nonnegative();

/** A profile whose sha256 is already stored counts as unchanged. */
export const profilesResponse = z.object({
  upserted: count,
  unchanged: count,
});
