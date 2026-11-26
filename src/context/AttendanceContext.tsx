import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  AppMode,
  Cycle,
  DayStatus,
  PublicHoliday,
  Region,
} from "../types";
import {
  Ctx,
  ANNUAL_LEAVE_QUOTA,
  SICK_LEAVE_QUOTA,
  CARRY_FORWARD_YEARLY_CAP,
  CARRY_FORWARD_MAX_BALANCE,
  type AttendanceCtxValue,
  type CycleStats,
  type LeaveSummaryResult,
  type YearLeaveStats,
} from "./attendanceCore";
import { DEFAULT_HOLIDAYS } from "../utils/holidayData";
import {
  exportToJson,
  loadFromStorage,
  parseImportFile,
  QUARTER_KEY,
  saveToStorage,
} from "../utils/storage";
import {
  generateCycles,
  generateQuarters,
  getCurrentCycle,
  getDaysInCycle,
  isWeekend,
  todayStr,
} from "../utils/dateUtils";

// ── Provider ────────────────────────────────────────────
export const AttendanceProvider = ({
  children,
  mode = "cycle",
}: {
  children: React.ReactNode;
  mode?: AppMode;
}) => {
  const isQuarter = mode === "quarter";
  const storageKey = isQuarter ? QUARTER_KEY : undefined;
  const [data, setData] = useState<AppData>(() => loadFromStorage(storageKey));

  const cycles = useMemo(
    () =>
      isQuarter ? generateQuarters() : generateCycles(data.cycleAnchorDate),
    [isQuarter, data.cycleAnchorDate],
  );
  const currentCycle = useMemo(() => getCurrentCycle(cycles), [cycles]);

  // Initialise selectedCycle to today's cycle (lazy — runs once)
  const [selectedCycle, setSelectedCycle] = useState<Cycle>(
    () => getCurrentCycle(cycles) ?? cycles[Math.floor(cycles.length / 2)],
  );

  // Persist on every change (debounced so rapid edits / note typing don't thrash localStorage)
  const latest = useRef(data);
  useLayoutEffect(() => {
    latest.current = data;
  }, [data]);
  useEffect(() => {
    const id = setTimeout(() => saveToStorage(data, storageKey), 300);
    return () => clearTimeout(id);
  }, [data, storageKey]);

  // Flush any pending edit immediately when the provider unmounts (mode switch) or the tab closes
  useEffect(() => {
    const flush = () => saveToStorage(latest.current, storageKey);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [storageKey]);

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

  const setDayNote = useCallback(
    (date: string, note?: string) =>
      setData((p) => {
        const status = p.entries[date]?.status ?? "none";
        const entries = { ...p.entries };
        if (!note && status === "none") delete entries[date];
        else entries[date] = { date, status, note };
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
      // Quarter mode: leaves are tracked but not deducted, and expected is 50% of
      // ALL weekdays (holidays reduce the working-days figure but not the target)
      const weekdayCount = days.filter((d) => !isWeekend(d)).length;
      const effective = isQuarter
        ? weekdayCount
        : Math.max(0, workDays.length - leaves);
      const override = data.expectedOverride?.[cycle.id];
      const target =
        isQuarter && override !== undefined
          ? override
          : Math.ceil(effective * 0.5);

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
    [data.entries, data.expectedOverride, getHolidaysForCycle, isQuarter],
  );

  const setExpectedOverride = useCallback(
    (cycleId: string, value: number | null) =>
      setData((p) => {
        const next = { ...(p.expectedOverride ?? {}) };
        if (value === null) delete next[cycleId];
        else next[cycleId] = Math.max(0, Math.floor(value));
        return { ...p, expectedOverride: next };
      }),
    [],
  );

  // ── Import / Export ────────────────────────────────────────────────────────
  const exportData = useCallback(() => exportToJson(data, mode), [data, mode]);
  const importData = useCallback(
    async (file: File) => {
      const imported = await parseImportFile(file);
      if (imported.exportedMode && imported.exportedMode !== mode) {
        throw new Error(
          `This backup was exported from ${imported.exportedMode} mode. Switch to ${imported.exportedMode} mode to import it.`,
        );
      }
      setData(imported);
    },
    [mode],
  );

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
      mode,
      setExpectedOverride,
      data,
      cycles,
      currentCycle,
      selectedCycle,
      setSelectedCycle,
      setDayEntry,
      clearDayEntry,
      setDayNote,
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
      mode,
      setExpectedOverride,
      data,
      cycles,
      currentCycle,
      selectedCycle,
      setDayEntry,
      clearDayEntry,
      setDayNote,
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
