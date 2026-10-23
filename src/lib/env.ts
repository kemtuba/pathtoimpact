import { z } from "zod";

/**
 * Environment access, validated and lazy. Nothing here runs at import time,
 * so `next build` needs only BETTER_AUTH_SECRET and BETTER_AUTH_URL, which
 * better-auth itself reads on import.
 */

const sha256Hex = z.string().regex(/^[0-9a-fA-F]{64}$/, "must be a 64-character sha256 hex digest");

const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  SYNC_TOKEN_SHA256: sha256Hex.optional(),
  SYNC_TOKEN_SHA256_PREVIOUS: sha256Hex.optional(),
  SYNC_ENV: z.enum(["production", "staging", "development"]).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  OPERATOR_EMAIL: z.string().optional(),
  OPERATOR_USER_ID: z.string().optional(),
  DEFAULT_TIMEZONE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

/** Empty strings count as unset, which is how Vercel and .env files often leave them. */
function cleaned(source: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") out[key] = value.trim();
  }
  return out;
}

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(cleaned(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}

/** The hashes a presented sync token may match: current first, then the one being rotated out. */
export function syncTokenHashes(source?: Record<string, string | undefined>): string[] {
  const env = readEnv(source);
  return [env.SYNC_TOKEN_SHA256, env.SYNC_TOKEN_SHA256_PREVIOUS]
    .filter((h): h is string => Boolean(h))
    .map((h) => h.toLowerCase());
}

/** Echoed by ping so sync.py can refuse to push a real week into staging, or the reverse. */
export function syncEnv(source?: Record<string, string | undefined>): "production" | "staging" | "development" {
  return readEnv(source).SYNC_ENV ?? "development";
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The operator's timezone, which defines week keys and the default applied date. */
export function defaultTimezone(source?: Record<string, string | undefined>): string {
  const tz = readEnv(source).DEFAULT_TIMEZONE ?? "America/New_York";
  if (!isValidTimeZone(tz)) throw new Error(`DEFAULT_TIMEZONE is not a valid IANA timezone: ${tz}`);
  return tz;
}
