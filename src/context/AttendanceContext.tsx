import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import type { AppData, Cycle, DayStatus, PublicHoliday, Region } from '../types';
import { DEFAULT_HOLIDAYS } from '../utils/holidayData';
import { exportToJson, loadFromStorage, parseImportFile, saveToStorage } from '../utils/storage';
import { generateCycles, getCurrentCycle, getDaysInCycle, isWeekend } from '../utils/dateUtils';

// ── Stats shape ──────────────────────────────────────────────────────────────
export interface CycleStats {
  workingDays: number;       // 20 (for 28-day cycle) minus holidays
  wfoDays: number;
  wfhDays: number;
  sickDays: number;
  annualDays: number;
  totalLeaves: number;
  holidayCount: number;
  effectiveWorkDays: number; // workingDays - leaves
  targetDays: number;        // ⌈effectiveWorkDays × 0.5⌉
  attendedDays: number;      // wfo
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

  addHoliday: (h: Omit<PublicHoliday, 'id'>) => void;
  updateHoliday: (h: PublicHoliday) => void;
  removeHoliday: (id: string) => void;

  setRegion: (r: Region) => void;
  getCycleStats: (cycle: Cycle) => CycleStats;

  exportData: () => void;
  importData: (file: File) => Promise<void>;
}

const Ctx = createContext<AttendanceCtxValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadFromStorage());

  const cycles = useMemo(() => generateCycles(data.cycleAnchorDate), [data.cycleAnchorDate]);
  const currentCycle = useMemo(() => getCurrentCycle(cycles), [cycles]);

  // Initialise selectedCycle to today's cycle (lazy — runs once)
  const [selectedCycle, setSelectedCycle] = useState<Cycle>(() => {
    const d = loadFromStorage();
    const c = generateCycles(d.cycleAnchorDate);
    return getCurrentCycle(c) ?? c[30];
  });

  // Persist on every change
  useEffect(() => { saveToStorage(data); }, [data]);

  // ── Day entries ────────────────────────────────────────────────────────────
  const setDayEntry = useCallback((date: string, status: DayStatus, note?: string) =>
    setData(p => ({ ...p, entries: { ...p.entries, [date]: { date, status, note } } })), []);

  const clearDayEntry = useCallback((date: string) =>
    setData(p => {
      const entries = { ...p.entries };
      delete entries[date];
      return { ...p, entries };
    }), []);

  // ── Holidays ───────────────────────────────────────────────────────────────
  const getEffectiveHolidays = useCallback((): PublicHoliday[] => {
    const { deletedHolidayIds, customHolidays, selectedRegion } = data;
    const defaults = DEFAULT_HOLIDAYS.filter(h =>
      !deletedHolidayIds.includes(h.id) && h.regions.includes(selectedRegion));
    const custom = customHolidays.filter(h =>
      !deletedHolidayIds.includes(h.id) && h.regions.includes(selectedRegion));
    // Custom overrides default on same date
    const map = new Map<string, PublicHoliday>();
    [...defaults, ...custom].forEach(h => map.set(h.date, h));
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // All holidays (no region filter) — used by holiday management page
  const getAllHolidaysAdmin = useCallback((): PublicHoliday[] => {
    const { deletedHolidayIds, customHolidays } = data;
    return [
      ...DEFAULT_HOLIDAYS.filter(h => !deletedHolidayIds.includes(h.id)),
      ...customHolidays,
    ].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const getHolidaysForCycle = useCallback((cycle: Cycle): PublicHoliday[] =>
    getEffectiveHolidays().filter(h => h.date >= cycle.startDate && h.date <= cycle.endDate),
    [getEffectiveHolidays]);

  const addHoliday = useCallback((h: Omit<PublicHoliday, 'id'>) => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setData(p => ({ ...p, customHolidays: [...p.customHolidays, { ...h, id, isCustom: true }] }));
  }, []);

  const updateHoliday = useCallback((h: PublicHoliday) => {
    const isDefault = DEFAULT_HOLIDAYS.some(d => d.id === h.id);
    if (isDefault) {
      // Shadow the default: delete it, store edited copy as custom
      setData(p => ({
        ...p,
        deletedHolidayIds: [...p.deletedHolidayIds, h.id],
        customHolidays: [...p.customHolidays, { ...h, id: `cedit-${h.id}`, isCustom: true }],
      }));
    } else {
      setData(p => ({ ...p, customHolidays: p.customHolidays.map(c => c.id === h.id ? h : c) }));
    }
  }, []);

  const removeHoliday = useCallback((id: string) => {
    if (DEFAULT_HOLIDAYS.some(d => d.id === id)) {
      setData(p => ({ ...p, deletedHolidayIds: [...p.deletedHolidayIds, id] }));
    } else {
      setData(p => ({ ...p, customHolidays: p.customHolidays.filter(h => h.id !== id) }));
    }
  }, []);

  // ── Region ─────────────────────────────────────────────────────────────────
  const setRegion = useCallback((r: Region) =>
    setData(p => ({ ...p, selectedRegion: r })), []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getCycleStats = useCallback((cycle: Cycle): CycleStats => {
    const days = getDaysInCycle(cycle);
    const hDates = new Set(getHolidaysForCycle(cycle).map(h => h.date));
    const workDays = days.filter(d => !isWeekend(d) && !hDates.has(d));

    let wfo = 0, wfh = 0, sick = 0, annual = 0;
    for (const d of days) {
      const e = data.entries[d];
      if (!e) continue;
      if (e.status === 'wfo')    wfo++;
      else if (e.status === 'wfh')    wfh++;
      else if (e.status === 'sick')   sick++;
      else if (e.status === 'annual') annual++;
    }
    const leaves     = sick + annual;
    const effective  = Math.max(0, workDays.length - leaves);
    const target     = Math.ceil(effective * 0.5);

    return {
      workingDays:       workDays.length,
      wfoDays:           wfo,
      wfhDays:           wfh,
      sickDays:          sick,
      annualDays:        annual,
      totalLeaves:       leaves,
      holidayCount:      getHolidaysForCycle(cycle).length,
      effectiveWorkDays: effective,
      targetDays:        target,
      attendedDays:      wfo,
    };
  }, [data.entries, getHolidaysForCycle]);

  // ── Import / Export ────────────────────────────────────────────────────────
  const exportData = useCallback(() => exportToJson(data), [data]);
  const importData = useCallback(async (file: File) => {
    const imported = await parseImportFile(file);
    setData(imported);
  }, []);

  // ── Memoised value (prevents unnecessary consumer re-renders) ─────────────
  const value = useMemo<AttendanceCtxValue>(() => ({
    data, cycles, currentCycle, selectedCycle, setSelectedCycle,
    setDayEntry, clearDayEntry,
    getEffectiveHolidays, getAllHolidaysAdmin, getHolidaysForCycle,
    addHoliday, updateHoliday, removeHoliday,
    setRegion, getCycleStats,
    exportData, importData,
  }), [
    data, cycles, currentCycle, selectedCycle,
    setDayEntry, clearDayEntry,
    getEffectiveHolidays, getAllHolidaysAdmin, getHolidaysForCycle,
    addHoliday, updateHoliday, removeHoliday,
    setRegion, getCycleStats, exportData, importData,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAttendance(): AttendanceCtxValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttendance must be inside AttendanceProvider');
  return ctx;
}