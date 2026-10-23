import { NextResponse } from "next/server";
import { CONTRACT_VERSION } from "@/lib/limits";
import { syncEnv } from "@/lib/env";
import { checkSyncRequest } from "@/lib/sync/auth";
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
  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    env: syncEnv(),
    contract_version: CONTRACT_VERSION,
    week_key: weekKey(now),
  });
}
