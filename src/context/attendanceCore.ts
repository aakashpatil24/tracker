import { createContext, useContext } from 'react';
import type { AppData, AppMode, Cycle, DayStatus, PublicHoliday, Region } from '../types';

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

// ── Leave policy constants ───────────────────────────────────────────────────
export const SICK_LEAVE_QUOTA = 6; // sick leaves granted per calendar year
export const ANNUAL_LEAVE_QUOTA = 24; // fresh annual leaves granted per calendar year
export const CARRY_FORWARD_YEARLY_CAP = 12; // max unused annual leaves eligible to carry forward each year
export const CARRY_FORWARD_MAX_BALANCE = 45; // max accumulated carry-forward balance

// ── Leave summary (all-time, from stored data) ──────────────────────────────
export interface YearLeaveStats {
  year: string;
  sickUsed: number;
  sickTaken: number;
  sickApplied: number;
  sickRemaining: number;
  annualUsed: number;
  annualTaken: number;
  annualApplied: number;
  broughtForward: number;
  totalAvailable: number;
  annualRemaining: number;
  carryForwardEligibleThisYear: number;
  carryForwardToNextYear: number;
  isSeeded: boolean;
}

export interface LeaveSummaryResult {
  currentYear: string;
  years: Record<string, YearLeaveStats>;
}

// ── Context interface ────────────────────────────────────────────────────────
export interface AttendanceCtxValue {
  mode: AppMode;
  setExpectedOverride: (cycleId: string, value: number | null) => void;
  data: AppData;
  cycles: Cycle[];
  currentCycle: Cycle | undefined;
  selectedCycle: Cycle;
  setSelectedCycle: (c: Cycle) => void;

  setDayEntry: (date: string, status: DayStatus, note?: string) => void;
  clearDayEntry: (date: string) => void;
  /** Update only the note of a day, keeping its status (removes the entry if both are empty). */
  setDayNote: (date: string, note?: string) => void;

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

  /** True when the last write to localStorage failed (quota / disabled storage). */
  saveFailed: boolean;
  /** ISO timestamp of the last export in this mode, or null if never exported. */
  lastBackup: string | null;
  /** Today as YYYY-MM-DD; updates when the date changes while the tab is open. */
  today: string;
}

export const Ctx = createContext<AttendanceCtxValue | null>(null);

export const useAttendance = (): AttendanceCtxValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttendance must be inside AttendanceProvider');
  return ctx;
};
