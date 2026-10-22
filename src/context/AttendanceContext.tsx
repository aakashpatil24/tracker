import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import type { AppData, Cycle, DayStatus, PublicHoliday, Region } from '../types';
import { DEFAULT_HOLIDAYS } from '../utils/holidayData';
import { exportToJson, loadFromStorage, parseImportFile, saveToStorage } from '../utils/storage';
import {
  generateCycles,
  getCurrentCycle,
  getDaysInCycle,
  isWeekend,
  todayStr,
} from "../utils/dateUtils";

// ── Stats shape ──────────────────────────────────────────────────────────────
export interface CycleStats {
  workingDays: number; // 20 (for 28-day cycle) minus holidays
  wfoDays: number;
  wfhDays: number;
  sickDays: number;
  annualDays: number;
  totalLeaves: number;
  holidayCount: number;
  effectiveWorkDays: number; // workingDays - leaves
  targetDays: number; // ⌈effectiveWorkDays × 0.5⌉
  attendedDays: number; // wfo
}

// ── Context interface ────────────────────────────────────────────────────────
interface AttendanceCtxValue {
  data: AppData;
  cycles: Cycle[];
  currentCycle: Cycle | undefined;
  selectedCycle: Cycle;
  setSelectedCycle: (c: Cycle) => void;

  setDayEntry: (date: string, status: DayStatus, note?: string) => void;
  clearDayEntry: (date: string) => void;

  getEffectiveHolidays: () => PublicHoliday[];
  getAllHolidaysAdmin: () => PublicHoliday[];
  getHolidaysForCycle: (cycle: Cycle) => PublicHoliday[];

  addHoliday: (h: Omit<PublicHoliday, "id">) => void;
  updateHoliday: (h: PublicHoliday) => void;
  removeHoliday: (id: string) => void;

  setRegion: (r: Region) => void;
  getCycleStats: (cycle: Cycle) => CycleStats;
  getLeaveSummary: () => LeaveSummaryResult;
  setCarryForwardSeed: (year: string, value: number) => void;

  exportData: () => void;
  importData: (file: File) => Promise<void>;
}

// ── Leave policy constants ───────────────────────────────────────────────────
export const SICK_LEAVE_QUOTA = 6; // sick leaves granted per calendar year
export const ANNUAL_LEAVE_QUOTA = 24; // fresh annual leaves granted per calendar year
export const CARRY_FORWARD_YEARLY_CAP = 12; // max unused annual leaves eligible to carry forward each year
export const CARRY_FORWARD_MAX_BALANCE = 45; // max accumulated carry-forward balance

// ── Leave summary (all-time, from stored data) ──────────────────────────────
export interface YearLeaveStats {
  year: string;
  sickUsed: number; // total consumed (taken + applied)
  sickTaken: number; // date <= today
  sickApplied: number; // future dates
  sickRemaining: number;
  annualUsed: number; // total consumed (taken + applied)
  annualTaken: number; // date <= today
  annualApplied: number; // future dates
  broughtForward: number; // carried into this year (from previous year, or manual seed)
  totalAvailable: number; // ANNUAL_LEAVE_QUOTA + broughtForward
  annualRemaining: number; // max(0, totalAvailable - annualUsed)
  carryForwardEligibleThisYear: number; // unused fresh quota eligible to carry, capped at CARRY_FORWARD_YEARLY_CAP
  carryForwardToNextYear: number; // total balance that will carry into next year, capped at CARRY_FORWARD_MAX_BALANCE
  isSeeded: boolean; // true if broughtForward came from a manual seed rather than being auto-computed
}

export interface LeaveSummaryResult {
  currentYear: string;
  years: Record<string, YearLeaveStats>;
}

const Ctx = createContext<AttendanceCtxValue | null>(null);

// ── Provider ────────────────────────────────────────────
export const AttendanceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [data, setData] = useState<AppData>(() => loadFromStorage());

  const cycles = useMemo(
    () => generateCycles(data.cycleAnchorDate),
    [data.cycleAnchorDate],
  );
  const currentCycle = useMemo(() => getCurrentCycle(cycles), [cycles]);

  // Initialise selectedCycle to today's cycle (lazy — runs once)
  const [selectedCycle, setSelectedCycle] = useState<Cycle>(() => {
    const d = loadFromStorage();
    const c = generateCycles(d.cycleAnchorDate);
    return getCurrentCycle(c) ?? c[30];
  });

  // Persist on every change (debounced so rapid edits / note typing don't thrash localStorage)
  useEffect(() => {
    const id = setTimeout(() => saveToStorage(data), 300);
    return () => clearTimeout(id);
  }, [data]);

  // ── Day entries ────────────────────────────────────────────────────────────
  const setDayEntry = useCallback(
    (date: string, status: DayStatus, note?: string) =>
      setData((p) => ({
        ...p,
        entries: { ...p.entries, [date]: { date, status, note } },
      })),
    [],
  );

  const clearDayEntry = useCallback(
    (date: string) =>
      setData((p) => {
        const entries = { ...p.entries };
        delete entries[date];
        return { ...p, entries };
      }),
    [],
  );

  // ── Holidays ───────────────────────────────────────────────────────────────
  const getEffectiveHolidays = useCallback((): PublicHoliday[] => {
    const { deletedHolidayIds, customHolidays, selectedRegion } = data;
    const defaults = DEFAULT_HOLIDAYS.filter(
      (h) =>
        !deletedHolidayIds.includes(h.id) && h.regions.includes(selectedRegion),
    );
    const custom = customHolidays.filter(
      (h) =>
        !deletedHolidayIds.includes(h.id) && h.regions.includes(selectedRegion),
    );
    // Custom overrides default on same date
    const map = new Map<string, PublicHoliday>();
    [...defaults, ...custom].forEach((h) => map.set(h.date, h));
    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [data]);

  // All holidays (no region filter) — used by holiday management page
  const getAllHolidaysAdmin = useCallback((): PublicHoliday[] => {
    const { deletedHolidayIds, customHolidays } = data;
    return [
      ...DEFAULT_HOLIDAYS.filter((h) => !deletedHolidayIds.includes(h.id)),
      ...customHolidays,
    ].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const getHolidaysForCycle = useCallback(
    (cycle: Cycle): PublicHoliday[] =>
      getEffectiveHolidays().filter(
        (h) => h.date >= cycle.startDate && h.date <= cycle.endDate,
      ),
    [getEffectiveHolidays],
  );

  const addHoliday = useCallback((h: Omit<PublicHoliday, "id">) => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setData((p) => ({
      ...p,
      customHolidays: [...p.customHolidays, { ...h, id, isCustom: true }],
    }));
  }, []);

  const updateHoliday = useCallback((h: PublicHoliday) => {
    const isDefault = DEFAULT_HOLIDAYS.some((d) => d.id === h.id);
    if (isDefault) {
      // Shadow the default: delete it, store edited copy as custom
      setData((p) => ({
        ...p,
        deletedHolidayIds: [...p.deletedHolidayIds, h.id],
        customHolidays: [
          ...p.customHolidays,
          { ...h, id: `cedit-${h.id}`, isCustom: true },
        ],
      }));
    } else {
      setData((p) => ({
        ...p,
        customHolidays: p.customHolidays.map((c) => (c.id === h.id ? h : c)),
      }));
    }
  }, []);

  const removeHoliday = useCallback((id: string) => {
    if (DEFAULT_HOLIDAYS.some((d) => d.id === id)) {
      setData((p) => ({
        ...p,
        deletedHolidayIds: [...p.deletedHolidayIds, id],
      }));
    } else {
      setData((p) => ({
        ...p,
        customHolidays: p.customHolidays.filter((h) => h.id !== id),
      }));
    }
  }, []);

  // ── Region ─────────────────────────────────────────────────────────────────
  const setRegion = useCallback(
    (r: Region) => setData((p) => ({ ...p, selectedRegion: r })),
    [],
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getCycleStats = useCallback(
    (cycle: Cycle): CycleStats => {
      const days = getDaysInCycle(cycle);
      const hDates = new Set(getHolidaysForCycle(cycle).map((h) => h.date));
      const workDays = days.filter((d) => !isWeekend(d) && !hDates.has(d));

      let wfo = 0,
        wfh = 0,
        sick = 0,
        annual = 0;
      for (const d of days) {
        const e = data.entries[d];
        if (!e) continue;
        if (e.status === "wfo") wfo++;
        else if (e.status === "wfh") wfh++;
        else if (e.status === "sick") sick++;
        else if (e.status === "annual") annual++;
      }
      const leaves = sick + annual;
      const effective = Math.max(0, workDays.length - leaves);
      const target = Math.ceil(effective * 0.5);

      return {
        workingDays: workDays.length,
        wfoDays: wfo,
        wfhDays: wfh,
        sickDays: sick,
        annualDays: annual,
        totalLeaves: leaves,
        holidayCount: getHolidaysForCycle(cycle).length,
        effectiveWorkDays: effective,
        targetDays: target,
        attendedDays: wfo,
      };
    },
    [data.entries, getHolidaysForCycle],
  );

  // ── Import / Export ────────────────────────────────────────────────────────
  const exportData = useCallback(() => exportToJson(data), [data]);
  const importData = useCallback(async (file: File) => {
    const imported = await parseImportFile(file);
    setData(imported);
  }, []);

  // ── Leave summary (all-time, from stored data) ─────────────────────────────
  const getLeaveSummary = useCallback((): LeaveSummaryResult => {
    const usageByYear: Record<
      string,
      {
        annual: number;
        sick: number;
        annualTaken: number;
        sickTaken: number;
        annualApplied: number;
        sickApplied: number;
      }
    > = {};
    const today = todayStr();
    for (const e of Object.values(data.entries)) {
      if (e.status !== "annual" && e.status !== "sick") continue;
      const year = e.date.slice(0, 4);
      if (!usageByYear[year])
        usageByYear[year] = {
          annual: 0,
          sick: 0,
          annualTaken: 0,
          sickTaken: 0,
          annualApplied: 0,
          sickApplied: 0,
        };
      const bucket = usageByYear[year];
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

    const seed = data.annualCarryForwardSeed ?? {};
    const currentYear = String(new Date().getFullYear());

    const allYearNums = [
      ...Object.keys(usageByYear),
      ...Object.keys(seed),
      currentYear,
    ].map(Number);
    const minYear = Math.min(...allYearNums);
    const maxYear = Math.max(...allYearNums);

    const years: Record<string, YearLeaveStats> = {};
    let runningCF = 0;

    for (let y = minYear; y <= maxYear; y++) {
      const yearStr = String(y);
      const seeded = seed[yearStr] !== undefined;
      const broughtForward = seeded ? seed[yearStr] : runningCF;

      const usage = usageByYear[yearStr] ?? {
        annual: 0,
        sick: 0,
        annualTaken: 0,
        sickTaken: 0,
        annualApplied: 0,
        sickApplied: 0,
      };
      const totalAvailable = ANNUAL_LEAVE_QUOTA + broughtForward;
      const annualRemaining = Math.max(0, totalAvailable - usage.annual);

      const unusedFresh = Math.max(0, ANNUAL_LEAVE_QUOTA - usage.annual);
      const carryForwardEligibleThisYear = Math.min(
        CARRY_FORWARD_YEARLY_CAP,
        unusedFresh,
      );
      const excessUsed = Math.max(0, usage.annual - ANNUAL_LEAVE_QUOTA);
      const remainingBroughtForwardAfterUsage = Math.max(
        0,
        broughtForward - excessUsed,
      );
      const carryForwardToNextYear = Math.min(
        CARRY_FORWARD_MAX_BALANCE,
        carryForwardEligibleThisYear + remainingBroughtForwardAfterUsage,
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
        annualRemaining,
        carryForwardEligibleThisYear,
        carryForwardToNextYear,
        isSeeded: seeded,
      };

      runningCF = carryForwardToNextYear;
    }

    return { currentYear, years };
  }, [data.entries, data.annualCarryForwardSeed]);

  const setCarryForwardSeed = useCallback((year: string, value: number) => {
    setData((p) => ({
      ...p,
      annualCarryForwardSeed: { ...p.annualCarryForwardSeed, [year]: value },
    }));
  }, []);

  // ── Memoised value (prevents unnecessary consumer re-renders) ─────────────
  const value = useMemo<AttendanceCtxValue>(
    () => ({
      data,
      cycles,
      currentCycle,
      selectedCycle,
      setSelectedCycle,
      setDayEntry,
      clearDayEntry,
      getEffectiveHolidays,
      getAllHolidaysAdmin,
      getHolidaysForCycle,
      addHoliday,
      updateHoliday,
      removeHoliday,
      setRegion,
      getCycleStats,
      getLeaveSummary,
      setCarryForwardSeed,
      exportData,
      importData,
    }),
    [
      data,
      cycles,
      currentCycle,
      selectedCycle,
      setDayEntry,
      clearDayEntry,
      getEffectiveHolidays,
      getAllHolidaysAdmin,
      getHolidaysForCycle,
      addHoliday,
      updateHoliday,
      removeHoliday,
      setRegion,
      getCycleStats,
      getLeaveSummary,
      setCarryForwardSeed,
      exportData,
      importData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAttendance = (): AttendanceCtxValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttendance must be inside AttendanceProvider');
  return ctx;
};