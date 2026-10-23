import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncTokenHashes } from "@/lib/env";
import { CONTRACT_MAJOR } from "@/lib/limits";

export type SyncErrorCode =
  | "unauthorized"
  | "env_mismatch"
  | "validation"
  | "not_found"
  | "conflict"
  | "too_large"
  | "state";

/** The one error envelope every sync endpoint returns. */
export function syncError(status: number, code: SyncErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * True when the presented bearer token hashes to the current or the previous
 * configured hash. Both sides are 32-byte digests, so timingSafeEqual never
 * sees unequal lengths and the comparison leaks nothing about the token.
 */
export function tokenMatches(presented: string | null, hexHashes: string[]): boolean {
  if (!presented) return false;
  const digest = sha256(presented);
  let matched = false;
  for (const hex of hexHashes) {
    if (!/^[0-9a-f]{64}$/i.test(hex)) continue;
    if (timingSafeEqual(digest, Buffer.from(hex, "hex"))) matched = true;
  }
  return matched;
}

/** Returns a refusal response, or null when the request may proceed. */
export function checkSyncRequest(request: Request): NextResponse | null {
  const header = request.headers.get("authorization");
  const presented = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!tokenMatches(presented, syncTokenHashes())) {
    return syncError(401, "unauthorized", "Missing or wrong sync token.");
  }
  const version = request.headers.get("x-sync-version");
  if (version !== null && version.split(".")[0] !== String(CONTRACT_MAJOR)) {
    return syncError(400, "validation", `This portal speaks sync contract ${CONTRACT_MAJOR}; the client sent ${version}.`);
  }
  return null;
}
