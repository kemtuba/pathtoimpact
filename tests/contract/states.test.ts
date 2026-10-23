import { describe, expect, it } from "vitest";
import { canTransition, type BuildStatus } from "@/lib/contracts/states";

function walk(path: BuildStatus[]): boolean {
  return path.every((to, i) => i === 0 || canTransition(path[i - 1], to));
}

describe("build state machine", () => {
  it("allows the call orders docs/sync-contract.md publishes", () => {
    // No draft review: build, push uploading, then the PDF moves it to ready.
    expect(walk(["requested", "uploading", "ready", "downloaded", "sent"])).toBe(true);
    // Draft review first, then the user approves, then the build.
    expect(walk(["requested", "draft_review", "approved_draft", "uploading", "ready"])).toBe(true);
    // With the optional progress pushes.
    expect(walk(["requested", "drafting", "draft_review", "approved_draft", "building", "uploading", "ready"])).toBe(true);
    // A replacement PDF before the first download.
    expect(walk(["ready", "uploading", "ready"])).toBe(true);
  });

  it("refuses transitions the contract forbids", () => {
    expect(canTransition("ready", "requested")).toBe(false);
    expect(canTransition("sent", "ready")).toBe(false);
    expect(canTransition("requested", "ready")).toBe(false);
    expect(canTransition("cancelled", "building")).toBe(false);
  });
});
