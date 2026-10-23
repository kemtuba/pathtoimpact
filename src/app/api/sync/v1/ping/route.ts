import { NextResponse } from "next/server";
import { CONTRACT_VERSION } from "@/lib/limits";
import { syncEnv } from "@/lib/env";
import { checkSyncRequest, syncError } from "@/lib/sync/auth";
import { weekKey } from "@/lib/week";

/**
 * GET /api/sync/v1/ping, the first call of every sync.py run.
 * The skeleton answers identity and the week key. The backlog counts in
 * docs/sync-contract.md need the database and arrive with WS4.
 */
export async function GET(request: Request) {
  const refusal = checkSyncRequest(request);
  if (refusal) return refusal;
  const now = new Date();
  try {
    return NextResponse.json({
      ok: true,
      at: now.toISOString(),
      env: syncEnv(),
      contract_version: CONTRACT_VERSION,
      week_key: weekKey(now),
    });
  } catch (error) {
    // An invalid DEFAULT_TIMEZONE or SYNC_ENV lands here.
    const detail = error instanceof Error ? error.message : "unknown problem";
    return syncError(500, "state", `The portal's sync configuration is invalid. ${detail}`);
  }
}
