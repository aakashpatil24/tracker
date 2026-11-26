import { describe, expect, it } from "vitest";
import {
  generateCycles,
  generateQuarters,
  getCalendarWeeks,
  getCurrentCycle,
  getDaysInCycle,
  isWeekend,
} from "./dateUtils";

describe("generateCycles", () => {
  const anchor = "2026-07-20";

  it("creates contiguous 28-day cycles aligned to the anchor", () => {
    const cycles = generateCycles(anchor, "2026-11-26");
    expect(cycles.some((c) => c.startDate === anchor)).toBe(true);
    for (let i = 1; i < cycles.length; i++) {
      expect(getDaysInCycle(cycles[i - 1])).toHaveLength(28);
      const prevEnd = new Date(cycles[i - 1].endDate);
      const nextStart = new Date(cycles[i].startDate);
      expect(nextStart.getTime() - prevEnd.getTime()).toBe(86_400_000);
    }
  });

  it("always contains today, even years away from the anchor", () => {
    for (const today of ["2020-02-29", "2026-11-26", "2035-06-15"]) {
      const current = getCurrentCycle(generateCycles(anchor, today), today);
      expect(current).toBeDefined();
      expect(current!.startDate <= today && today <= current!.endDate).toBe(
        true,
      );
    }
  });

  it("finds the right cycle for the reference date", () => {
    const c = getCurrentCycle(generateCycles(anchor, "2026-11-26"), "2026-11-26");
    expect(c?.startDate).toBe("2026-11-09");
    expect(c?.endDate).toBe("2026-12-06");
  });
});

describe("generateQuarters", () => {
  it("covers two years either side with Qn-YY names", () => {
    const qs = generateQuarters("2026-11-26");
    expect(qs).toHaveLength(20);
    const q3 = qs.find((q) => q.name === "Q3-26");
    expect(q3).toMatchObject({ startDate: "2026-07-01", endDate: "2026-09-30" });
  });
});

describe("calendar helpers", () => {
  it("detects weekends", () => {
    expect(isWeekend("2026-11-28")).toBe(true); // Sat
    expect(isWeekend("2026-11-29")).toBe(true); // Sun
    expect(isWeekend("2026-11-30")).toBe(false); // Mon
  });

  it("pads calendar weeks to Monday-first rows of 7", () => {
    const weeks = getCalendarWeeks({
      id: "x",
      label: "",
      startDate: "2026-07-01", // Wednesday
      endDate: "2026-07-31",
    });
    expect(weeks[0].slice(0, 2)).toEqual([null, null]);
    expect(weeks[0][2]).toBe("2026-07-01");
    weeks.forEach((w) => expect(w).toHaveLength(7));
  });
});
