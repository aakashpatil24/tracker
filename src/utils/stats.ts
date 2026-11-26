import type { Cycle, DayEntry, PublicHoliday } from "../types";
import {
  ANNUAL_LEAVE_QUOTA,
  CARRY_FORWARD_MAX_BALANCE,
  CARRY_FORWARD_YEARLY_CAP,
  SICK_LEAVE_QUOTA,
  type CycleStats,
  type LeaveSummaryResult,
  type YearLeaveStats,
} from "../context/attendanceCore";
import { getDaysInCycle, isWeekend } from "./dateUtils";

/**
 * Attendance figures for one cycle / quarter.
 * - Cycle mode: target = ⌈50% × (working days − leaves)⌉
 * - Quarter mode: leaves are tracked but not deducted; target = manual
 *   override, else ⌈50% × ALL weekdays⌉ (holidays reduce working days only).
 */
export const computeCycleStats = (
  cycle: Cycle,
  entries: Record<string, DayEntry>,
  cycleHolidays: PublicHoliday[],
  isQuarter: boolean,
  override?: number,
): CycleStats => {
  const days = getDaysInCycle(cycle);
  const hDates = new Set(cycleHolidays.map((h) => h.date));
  const weekdays = days.filter((d) => !isWeekend(d));
  const workDays = weekdays.filter((d) => !hDates.has(d));

  let wfo = 0,
    wfh = 0,
    sick = 0,
    annual = 0;
  for (const d of days) {
    const status = entries[d]?.status;
    if (status === "wfo") wfo++;
    else if (status === "wfh") wfh++;
    else if (status === "sick") sick++;
    else if (status === "annual") annual++;
  }
  const leaves = sick + annual;
  const effective = isQuarter
    ? weekdays.length
    : Math.max(0, workDays.length - leaves);
  const target =
    isQuarter && override !== undefined ? override : Math.ceil(effective * 0.5);

  return {
    workingDays: workDays.length,
    wfoDays: wfo,
    wfhDays: wfh,
    sickDays: sick,
    annualDays: annual,
    totalLeaves: leaves,
    holidayCount: cycleHolidays.length,
    effectiveWorkDays: effective,
    targetDays: target,
    attendedDays: wfo,
  };
};

interface YearUsage {
  annual: number;
  sick: number;
  annualTaken: number;
  sickTaken: number;
  annualApplied: number;
  sickApplied: number;
}

const emptyUsage = (): YearUsage => ({
  annual: 0,
  sick: 0,
  annualTaken: 0,
  sickTaken: 0,
  annualApplied: 0,
  sickApplied: 0,
});

/**
 * Leave balances per calendar year with carry-forward:
 * up to CARRY_FORWARD_YEARLY_CAP unused fresh days roll over each year, the
 * running balance is capped at CARRY_FORWARD_MAX_BALANCE, and a manual seed
 * for a year replaces the computed brought-forward value.
 */
export const computeLeaveSummary = (
  entries: Record<string, DayEntry>,
  seed: Record<string, number>,
  today: string,
): LeaveSummaryResult => {
  const usageByYear: Record<string, YearUsage> = {};
  for (const e of Object.values(entries)) {
    if (e.status !== "annual" && e.status !== "sick") continue;
    const bucket = (usageByYear[e.date.slice(0, 4)] ??= emptyUsage());
    const isFuture = e.date > today;
    if (e.status === "annual") {
      bucket.annual++;
      if (isFuture) bucket.annualApplied++;
      else bucket.annualTaken++;
    } else {
      bucket.sick++;
      if (isFuture) bucket.sickApplied++;
      else bucket.sickTaken++;
    }
  }

  const currentYear = today.slice(0, 4);
  const allYears = [
    ...Object.keys(usageByYear),
    ...Object.keys(seed),
    currentYear,
  ].map(Number);
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);

  const years: Record<string, YearLeaveStats> = {};
  let runningCF = 0;

  for (let y = minYear; y <= maxYear; y++) {
    const yearStr = String(y);
    const seeded = seed[yearStr] !== undefined;
    const broughtForward = seeded ? seed[yearStr] : runningCF;
    const usage = usageByYear[yearStr] ?? emptyUsage();

    const totalAvailable = ANNUAL_LEAVE_QUOTA + broughtForward;
    const unusedFresh = Math.max(0, ANNUAL_LEAVE_QUOTA - usage.annual);
    const carryForwardEligibleThisYear = Math.min(
      CARRY_FORWARD_YEARLY_CAP,
      unusedFresh,
    );
    const excessUsed = Math.max(0, usage.annual - ANNUAL_LEAVE_QUOTA);
    const remainingBroughtForward = Math.max(0, broughtForward - excessUsed);
    const carryForwardToNextYear = Math.min(
      CARRY_FORWARD_MAX_BALANCE,
      carryForwardEligibleThisYear + remainingBroughtForward,
    );

    years[yearStr] = {
      year: yearStr,
      sickUsed: usage.sick,
      sickTaken: usage.sickTaken,
      sickApplied: usage.sickApplied,
      sickRemaining: Math.max(0, SICK_LEAVE_QUOTA - usage.sick),
      annualUsed: usage.annual,
      annualTaken: usage.annualTaken,
      annualApplied: usage.annualApplied,
      broughtForward,
      totalAvailable,
      annualRemaining: Math.max(0, totalAvailable - usage.annual),
      carryForwardEligibleThisYear,
      carryForwardToNextYear,
      isSeeded: seeded,
    };
    runningCF = carryForwardToNextYear;
  }

  return { currentYear, years };
};
