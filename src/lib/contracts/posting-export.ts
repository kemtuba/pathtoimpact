import { z } from "zod";
import { EXCERPT_MAX_CHARS, PICK_REASON_MAX_CHARS, POSTINGS_PER_REQUEST } from "../limits";
import { httpUrl, isoDate, textId, weekKeySchema } from "./events";

/*
 * POST /api/sync/v1/postings, section 4.2, and the export scrub of section 4.5.
 * Engine-owned vocabularies (fit, status, tier_hint, source_board) are plain
 * strings, so a new value needs no portal release. Objects are strict: an
 * unknown key from the engine is an error here, not something stored silently.
 * The route parses only the envelope as a whole; each item goes through
 * checkPostingItem, so one bad item is rejected alone and never aborts the rest.
 */

/**
 * PLACEHOLDER facet names. The engine's six facet names are a section 8 need
 * from Kem; swap these when they arrive. "competitive" is the one the reason
 * codes already rely on, for outshone.
 */
export const FACET_KEYS = ["title_match", "level", "domain", "employer_type", "competitive", "logistics"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

/** The only keys card_json may carry. The scrub and the JSON Schema both read this list. */
export const CARD_JSON_KEYS = ["summary", "highlights", "requirements", "team", "work_mode", "employment_type"] as const;
export type CardJsonKey = (typeof CARD_JSON_KEYS)[number];

/**
 * Length in Unicode code points, which is what Python's len() and JSON Schema's
 * maxLength count. String.length counts UTF-16 units and would refuse an
 * excerpt the engine had correctly cut to 2,000 characters.
 */
export function codePointLength(value: string): number {
  return [...value].length;
}

function maxChars(limit: number) {
  return z
    .string()
    .refine((s) => codePointLength(s) <= limit, `must be at most ${limit} characters`)
    .meta({ maxLength: limit });
}

/** A facet's value is the engine's own short verdict text, or null when it did not judge that facet. */
const facetShape = Object.fromEntries(FACET_KEYS.map((key) => [key, z.string().nullable()])) as Record<
  FacetKey,
  z.ZodNullable<z.ZodString>
>;
export const postingFacets = z.strictObject(facetShape);

export const cardJson = z.strictObject({
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  team: z.string().optional(),
  work_mode: z.string().optional(),
  employment_type: z.string().optional(),
} satisfies Record<CardJsonKey, z.ZodType>);

/** One postings row, field for field as section 4.2 lists it. */
export const postingItem = z
  .strictObject({
    external_id: textId,
    profile_id: textId,
    // Section 4.2 lists no per-item user_id but section 4.5 checks one, so it is optional and must match the body's.
    user_id: textId.optional(),
    company: z.string().min(1),
    role: z.string().min(1),
    url: httpUrl,
    location: z.string().nullable(),
    comp_min: z.number().nonnegative().nullable(),
    comp_max: z.number().nonnegative().nullable(),
    fit: z.string().min(1),
    fit_why: z.string(),
    facets: postingFacets,
    card_json: cardJson,
    excerpt: maxChars(EXCERPT_MAX_CHARS).nullable(),
    // Stored as engine_status; it never touches the portal's application state.
    status: z.string().min(1),
    status_date: isoDate.nullable(),
    source_board: z.string().min(1),
    tier_hint: z.string().nullable(),
    proposed: z.boolean(),
    rank: z.number().int().positive().nullable(),
    pick_reason: maxChars(PICK_REASON_MAX_CHARS).nullable(),
    posting_date: isoDate.nullable(),
  })
  .refine((p) => p.comp_min === null || p.comp_max === null || p.comp_min <= p.comp_max, {
    message: "comp_min must not exceed comp_max",
    path: ["comp_max"],
  });

export type PostingItem = z.output<typeof postingItem>;

// The upsert is one multi-row INSERT ON CONFLICT, which Postgres refuses when two rows share a key.
function uniqueExternalIds(body: { postings: ReadonlyArray<{ external_id: string }> }): boolean {
  return new Set(body.postings.map((p) => p.external_id)).size === body.postings.length;
}
const uniqueExternalIdsIssue = { message: "external_id must be unique within a request", path: ["postings"] };

/**
 * What the route parses. A failure here, and only here, fails the whole
 * request with 422: a bad run_id, week_key or user_id, more than
 * POSTINGS_PER_REQUEST items, an item that is not an object or has no
 * external_id, or two items sharing an external_id.
 */
export const postingsRequest = z
  .strictObject({
    run_id: z.uuid(),
    week_key: weekKeySchema,
    user_id: textId,
    postings: z.array(z.looseObject({ external_id: textId })).max(POSTINGS_PER_REQUEST),
  })
  .refine(uniqueExternalIds, uniqueExternalIdsIssue);

export type PostingsRequest = z.output<typeof postingsRequest>;

/**
 * The same body with every item held to postingItem. contracts/posting-export.schema.json
 * publishes this, so the engine can check its own export before sending. The
 * portal never parses a body with it: an item that fails is rejected alone.
 */
export const postingsRequestForEngine = z
  .strictObject({
    run_id: z.uuid(),
    week_key: weekKeySchema,
    user_id: textId,
    postings: z.array(postingItem).max(POSTINGS_PER_REQUEST),
  })
  .refine(uniqueExternalIds, uniqueExternalIdsIssue);

const count = z.number().int().nonnegative();

/** reason is a scrub reason below or "validation"; it is a string so a new reason stays an additive change. */
export const postingsResponse = z.object({
  inserted: count,
  updated: count,
  unchanged: count,
  rejected: z.array(z.object({ external_id: z.string(), reason: z.string() })),
  week_key: weekKeySchema,
});

export type PostingsResponse = z.output<typeof postingsResponse>;

// The export scrub, section 4.5.

export const SCRUB_REASONS = [
  "user_id_mismatch",
  "url_not_http",
  "card_json_key",
  "excerpt_too_long",
  "filesystem_path",
  "foreign_user_id",
] as const;
export type ScrubReason = (typeof SCRUB_REASONS)[number];

/**
 * /Users/<name>/ or /home/<name>/, or ~/, at the start of a string or after any
 * character that cannot end a URL host or path segment: whitespace, quotes,
 * brackets, "(", "=", ",", ":" and "/", so file:// URIs and markdown links are
 * caught. A letter, digit, ".", "~", "%" or "-" before the slash means a URL
 * path, which is why https://example.com/home/jobs/ passes.
 */
export const FILESYSTEM_PATH_PATTERN = /(?:^|[^\w.~%-])(?:\/(?:Users|home)\/[^/\s]+\/|~\/)/;

const CARD_JSON_KEY_SET: ReadonlySet<string> = new Set(CARD_JSON_KEYS);

export function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || !/^https?:\/\//.test(value)) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectStrings(value: unknown, out: string[]): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (isPlainObject(value)) for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

/**
 * The per-item scrub. Returns null when the item may be stored, or the first
 * rule it breaks. It reads the item as plain data, so it can run before or
 * after zod validation; one bad item is rejected alone and never aborts the
 * rest of the request.
 */
export function scrubPosting(
  item: Readonly<Record<string, unknown>>,
  bodyUserId: string,
  otherUserIds: readonly string[],
): ScrubReason | null {
  if (item.user_id !== undefined && item.user_id !== bodyUserId) return "user_id_mismatch";
  if (!isHttpUrl(item.url)) return "url_not_http";
  if (isPlainObject(item.card_json) && Object.keys(item.card_json).some((key) => !CARD_JSON_KEY_SET.has(key))) {
    return "card_json_key";
  }
  if (typeof item.excerpt === "string" && codePointLength(item.excerpt) > EXCERPT_MAX_CHARS) return "excerpt_too_long";

  const exceptUrl = Object.entries(item).filter(([key]) => key !== "url");
  if (collectStrings(Object.fromEntries(exceptUrl), []).some((s) => FILESYSTEM_PATH_PATTERN.test(s))) {
    return "filesystem_path";
  }

  // The url is checked here too: a link that names another participant leaks just as much.
  const others = otherUserIds.filter((id) => id !== "" && id !== bodyUserId);
  if (others.length > 0 && collectStrings(item, []).some((s) => others.some((id) => s.includes(id)))) {
    return "foreign_user_id";
  }
  return null;
}

export type PostingCheck =
  | { ok: true; item: PostingItem }
  | { ok: false; reason: ScrubReason | "validation"; issues?: string[] };

/**
 * One item of a postings push: the scrub first, then the item schema. A
 * failure goes into the response's rejected list with its reason; the rest
 * of the request is stored.
 */
export function checkPostingItem(
  raw: Readonly<Record<string, unknown>>,
  bodyUserId: string,
  otherUserIds: readonly string[],
): PostingCheck {
  const reason = scrubPosting(raw, bodyUserId, otherUserIds);
  if (reason) return { ok: false, reason };
  const parsed = postingItem.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "validation", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  return { ok: true, item: parsed.data };
}
