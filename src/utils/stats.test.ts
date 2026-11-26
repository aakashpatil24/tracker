import { describe, expect, it } from "vitest";
import type { DayEntry, PublicHoliday } from "../types";
import { computeCycleStats, computeLeaveSummary } from "./stats";
import { formatDate } from "./dateUtils";

const entries = (list: [string, DayEntry["status"]][]) =>
  Object.fromEntries(list.map(([date, status]) => [date, { date, status }]));

const Q3_26 = {
  id: "2026-07-01",
  label: "Q3-26",
  startDate: "2026-07-01",
  endDate: "2026-09-30",
};

const holiday = (date: string): PublicHoliday => ({
  id: date,
  date,
  name: "H",
  regions: ["south"],
});

describe("computeCycleStats — cycle mode", () => {
  const cycle = {
    id: "2026-11-09",
    label: "",
    startDate: "2026-11-09",
    endDate: "2026-12-06",
  };

  it("target = ceil(50% × (working days − leaves))", () => {
    const s = computeCycleStats(
      cycle,
      entries([
        ["2026-11-11", "annual"],
        ["2026-11-12", "sick"],
        ["2026-11-16", "wfo"],
        ["2026-11-17", "wfh"],
      ]),
      [holiday("2026-11-10")],
      false,
    );
    expect(s.workingDays).toBe(19); // 20 weekdays − 1 holiday
    expect(s.totalLeaves).toBe(2);
    expect(s.effectiveWorkDays).toBe(17);
    expect(s.targetDays).toBe(9);
    expect(s.wfoDays).toBe(1);
    expect(s.wfhDays).toBe(1);
  });
});

describe("computeCycleStats — quarter mode", () => {
  it("expected = ceil(50% of ALL weekdays); holidays and leaves don't reduce it", () => {
    const s = computeCycleStats(
      Q3_26,
      entries([["2026-07-01", "annual"]]),
      [holiday("2026-09-14")],
      true,
    );
    expect(s.effectiveWorkDays).toBe(66);
    expect(s.workingDays).toBe(65);
    expect(s.targetDays).toBe(33);
  });

  it("uses the manual override when set", () => {
    expect(computeCycleStats(Q3_26, {}, [], true, 30).targetDays).toBe(30);
  });
});

describe("computeLeaveSummary", () => {
  it("splits taken vs applied around today", () => {
    const r = computeLeaveSummary(
      entries([
        ["2026-03-02", "annual"],
        ["2026-12-01", "annual"],
        ["2026-04-01", "sick"],
      ]),
      {},
      "2026-11-26",
    );
    const y = r.years["2026"];
    expect(r.currentYear).toBe("2026");
    expect(y.annualTaken).toBe(1);
    expect(y.annualApplied).toBe(1);
    expect(y.sickRemaining).toBe(5);
  });

  it("carries forward at most 12 unused days per year", () => {
    const r = computeLeaveSummary({}, {}, "2026-06-01");
    expect(r.years["2026"].carryForwardToNextYear).toBe(12);
  });

  it("caps the running balance at 45 and honours a manual seed", () => {
    const r = computeLeaveSummary({}, { "2026": 40 }, "2026-06-01");
    expect(r.years["2026"].broughtForward).toBe(40);
    expect(r.years["2026"].isSeeded).toBe(true);
    expect(r.years["2026"].carryForwardToNextYear).toBe(45);
  });

  it("uses carried days once fresh leave is exhausted", () => {
    const days = Array.from({ length: 30 }, (_, i) =>
      [formatDate(new Date(2026, 0, 5 + i)), "annual"] as [string, "annual"],
    );
    const r = computeLeaveSummary(entries(days), { "2026": 10 }, "2026-12-31");
    expect(r.years["2026"].annualRemaining).toBe(4); // 24 + 10 − 30
    expect(r.years["2026"].carryForwardToNextYear).toBe(4);
  });
});
