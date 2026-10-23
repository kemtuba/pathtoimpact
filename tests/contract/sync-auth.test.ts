import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkSyncRequest, tokenMatches } from "@/lib/sync/auth";
import { syncTokenHashes } from "@/lib/env";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

describe("sync token check", () => {
  it("accepts the current or the previous token and nothing else", () => {
    const hashes = [hash("current-token"), hash("previous-token")];
    expect(tokenMatches("current-token", hashes)).toBe(true);
    expect(tokenMatches("previous-token", hashes)).toBe(true);
    expect(tokenMatches("wrong-token", hashes)).toBe(false);
    expect(tokenMatches(null, hashes)).toBe(false);
    expect(tokenMatches("current-token", [])).toBe(false);
  });

  it("reads hashes from the environment and ignores empty values", () => {
    expect(syncTokenHashes({ SYNC_TOKEN_SHA256: hash("a").toUpperCase(), SYNC_TOKEN_SHA256_PREVIOUS: "" })).toEqual([hash("a")]);
    expect(() => syncTokenHashes({ SYNC_TOKEN_SHA256: "not-a-hash" })).toThrow(/sha256/);
  });
});

describe("sync request check", () => {
  it("answers a bad sync variable with the error envelope, not a bare 500", async () => {
    const saved = process.env.SYNC_TOKEN_SHA256;
    process.env.SYNC_TOKEN_SHA256 = "sha256  abc"; // a pasted line from pnpm sync:token
    try {
      const res = checkSyncRequest(new Request("http://x/api/sync/v1/ping", { headers: { authorization: "Bearer t" } }));
      expect(res?.status).toBe(500);
      const json = (await res?.json()) as { error: { code: string; message: string } };
      expect(json.error.code).toBe("state");
      expect(json.error.message).toContain("SYNC_TOKEN_SHA256");
      expect(json.error.message).not.toContain("abc");
    } finally {
      if (saved === undefined) delete process.env.SYNC_TOKEN_SHA256;
      else process.env.SYNC_TOKEN_SHA256 = saved;
    }
  });
});
