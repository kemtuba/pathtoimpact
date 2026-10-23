import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES, PILOT_CAP } from "@/lib/limits";

describe("limits", () => {
  it("keeps every body under Vercel's 4.5 MB function payload limit", () => {
    expect(MAX_BODY_BYTES).toBe(4_194_304);
    expect(MAX_BODY_BYTES).toBeLessThan(4.5 * 1_000_000);
  });

  it("caps the pilot at 10 users", () => {
    expect(PILOT_CAP).toBe(10);
  });
});
