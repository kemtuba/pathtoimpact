import { describe, expect, it } from "vitest";
import { mondayOf, previousWeekKey, weekKey } from "@/lib/week";

const NY = "America/New_York";

describe("weekKey", () => {
  it("puts a Sunday-night run in the week it prepares", () => {
    // Sunday 25 Oct 2026, 22:00 in New York, already Monday in UTC.
    expect(weekKey(new Date("2026-10-26T02:00:00Z"), NY)).toBe("2026-W44");
    // Sunday 25 Oct 2026, 09:00 in New York.
    expect(weekKey(new Date("2026-10-25T13:00:00Z"), NY)).toBe("2026-W44");
  });

  it("uses the operator's timezone, not UTC", () => {
    // Saturday 24 Oct 2026, 22:00 in New York is Sunday in UTC, but still Saturday locally.
    expect(weekKey(new Date("2026-10-25T02:00:00Z"), NY)).toBe("2026-W43");
  });

  it("keeps a Tuesday catch-up push in the same week as Sunday's run", () => {
    const sunday = weekKey(new Date("2026-10-25T20:00:00Z"), NY);
    const tuesday = weekKey(new Date("2026-10-27T15:00:00Z"), NY);
    expect(tuesday).toBe(sunday);
  });

  it("handles the year boundary, where ISO week 53 runs into the next year", () => {
    // 2026 starts on a Thursday, so it has 53 ISO weeks.
    expect(weekKey(new Date("2026-12-31T17:00:00Z"), NY)).toBe("2026-W53");
    expect(weekKey(new Date("2027-01-02T17:00:00Z"), NY)).toBe("2026-W53");
    // Sunday 3 Jan 2027 prepares the first week of 2027.
    expect(weekKey(new Date("2027-01-03T17:00:00Z"), NY)).toBe("2027-W01");
    expect(previousWeekKey("2027-W01")).toBe("2026-W53");
  });
});

describe("week arithmetic", () => {
  it("steps back one week", () => {
    expect(previousWeekKey("2026-W44")).toBe("2026-W43");
    expect(previousWeekKey("2026-W01")).toBe("2025-W52");
  });

  it("finds the Monday that starts a week", () => {
    expect(mondayOf("2026-W44").toISOString().slice(0, 10)).toBe("2026-10-26");
    expect(mondayOf("2027-W01").toISOString().slice(0, 10)).toBe("2027-01-04");
  });

  it("rejects weeks that do not exist", () => {
    expect(() => mondayOf("2025-W53")).toThrow();
    expect(() => previousWeekKey("2026-44")).toThrow();
  });
});
