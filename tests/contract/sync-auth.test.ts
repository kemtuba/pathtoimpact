import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { tokenMatches } from "@/lib/sync/auth";
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
