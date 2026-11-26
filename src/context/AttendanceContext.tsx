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
  CARRY_FORWARD_MAX_BALANCE,
  type AttendanceCtxValue,
  type CycleStats,
  type LeaveSummaryResult,
} from "./attendanceCore";
import { DEFAULT_HOLIDAYS } from "../utils/holidayData";
import { computeCycleStats, computeLeaveSummary } from "../utils/stats";
import {
  exportToJson,
  getLastBackup,
  loadFromStorage,
  parseImportFile,
  parseStored,
  saveToStorage,
  storageKeyFor,
} from "../utils/storage";
import {
  generateCycles,
  generateQuarters,
  getCurrentCycle,
  todayStr,
} from "../utils/dateUtils";

// Today's date, refreshed when the tab regains focus and once a minute, so a
// tab left open overnight rolls over to the new day / cycle.
const useToday = (): string => {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday(todayStr()); // same string → no re-render
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return today;
};

export const AttendanceProvider = ({
  children,
  mode = "cycle",
}: {
  children: React.ReactNode;
  mode?: AppMode;
}) => {
  const isQuarter = mode === "quarter";
  const storageKey = storageKeyFor(mode);
  const [data, setData] = useState<AppData>(() => loadFromStorage(storageKey));
  const today = useToday();

  const cycles = useMemo(
    () =>
      isQuarter
        ? generateQuarters(today)
        : generateCycles(data.cycleAnchorDate, today),
    [isQuarter, data.cycleAnchorDate, today],
  );
  const currentCycle = useMemo(
    () => getCurrentCycle(cycles, today),
    [cycles, today],
  );

  // Initialise selectedCycle to today's cycle (lazy — runs once)
  const [selectedCycle, setSelectedCycle] = useState<Cycle>(
    () => currentCycle ?? cycles[Math.floor(cycles.length / 2)],
  );
  // When the day rolls into a new cycle, follow it if the user was viewing the current one
  const [prevCurrentId, setPrevCurrentId] = useState(currentCycle?.id);
  if (prevCurrentId !== currentCycle?.id) {
    setPrevCurrentId(currentCycle?.id);
    if (currentCycle && selectedCycle.id === prevCurrentId)
      setSelectedCycle(currentCycle);
  }

  // ── Persistence ────────────────────────────────────────────────────────────
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef(data);
  const dirty = useRef(false); // local edits not yet written
  const external = useRef<AppData | null>(null); // last state received from another tab
  useLayoutEffect(() => {
    latest.current = data;
  }, [data]);

  // Debounced save so rapid edits / note typing don't thrash localStorage
  useEffect(() => {
    if (data === external.current) return; // came from another tab: already stored
    dirty.current = true;
    const id = setTimeout(() => {
      dirty.current = false;
      setSaveFailed(!saveToStorage(data, storageKey));
    }, 300);
    return () => clearTimeout(id);
  }, [data, storageKey]);

  // Flush any pending edit immediately when the provider unmounts (mode switch) or the tab closes
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      dirty.current = false;
      saveToStorage(latest.current, storageKey);
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [storageKey]);

  // Keep several open tabs in sync (otherwise the last tab to save wins silently)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey || e.storageArea !== localStorage) return;
      const next = parseStored(e.newValue, storageKey);
      external.current = next;
      dirty.current = false;
      setData(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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

  // ── Holidays (memoised: recomputed only when holiday settings change) ─────
  const { deletedHolidayIds, customHolidays, selectedRegion } = data;
  const effectiveHolidays = useMemo((): PublicHoliday[] => {
    const deleted = new Set(deletedHolidayIds);
    const visible = (h: PublicHoliday) =>
      !deleted.has(h.id) && h.regions.includes(selectedRegion);
    // Custom overrides default on same date
    const map = new Map<string, PublicHoliday>();
    [
      ...DEFAULT_HOLIDAYS.filter(visible),
      ...customHolidays.filter(visible),
    ].forEach((h) => map.set(h.date, h));
    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [deletedHolidayIds, customHolidays, selectedRegion]);
  const getEffectiveHolidays = useCallback(
    () => effectiveHolidays,
    [effectiveHolidays],
  );

  // All holidays (no region filter) — used by holiday management page
  const allHolidays = useMemo((): PublicHoliday[] => {
    const deleted = new Set(deletedHolidayIds);
    return [
      ...DEFAULT_HOLIDAYS.filter((h) => !deleted.has(h.id)),
      ...customHolidays,
    ].sort((a, b) => a.date.localeCompare(b.date));
  }, [deletedHolidayIds, customHolidays]);
  const getAllHolidaysAdmin = useCallback(() => allHolidays, [allHolidays]);

  const getHolidaysForCycle = useCallback(
    (cycle: Cycle): PublicHoliday[] =>
      effectiveHolidays.filter(
        (h) => h.date >= cycle.startDate && h.date <= cycle.endDate,
      ),
    [effectiveHolidays],
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
    (cycle: Cycle): CycleStats =>
      computeCycleStats(
        cycle,
        data.entries,
        getHolidaysForCycle(cycle),
        isQuarter,
        data.expectedOverride?.[cycle.id],
      ),
    [data.entries, data.expectedOverride, getHolidaysForCycle, isQuarter],
  );

  const setExpectedOverride = useCallback(
    (cycleId: string, value: number | null) =>
      setData((p) => {
        const next = { ...(p.expectedOverride ?? {}) };
        if (value === null) delete next[cycleId];
        else next[cycleId] = Math.max(0, Math.floor(value) || 0);
        return { ...p, expectedOverride: next };
      }),
    [],
  );

  // ── Import / Export ────────────────────────────────────────────────────────
  const [lastBackup, setLastBackup] = useState(() => getLastBackup(mode));
  const exportData = useCallback(() => {
    exportToJson(latest.current, mode);
    setLastBackup(getLastBackup(mode));
  }, [mode]);
  const importData = useCallback(
    async (file: File) => {
      const { data: imported, exportedMode } = await parseImportFile(file);
      if (exportedMode && exportedMode !== mode) {
        throw new Error(
          `This backup was exported from ${exportedMode} mode. Switch to ${exportedMode} mode to import it.`,
        );
      }
      setData(imported);
    },
    [mode],
  );

  // ── Leave summary (all-time, from stored data; memoised per data change) ──
  const leaveSummary = useMemo(
    (): LeaveSummaryResult =>
      computeLeaveSummary(
        data.entries,
        data.annualCarryForwardSeed ?? {},
        today,
      ),
    [data.entries, data.annualCarryForwardSeed, today],
  );
  const getLeaveSummary = useCallback(() => leaveSummary, [leaveSummary]);

  const setCarryForwardSeed = useCallback((year: string, value: number) => {
    const clamped = Math.min(
      CARRY_FORWARD_MAX_BALANCE,
      Math.max(0, Math.floor(value) || 0),
    );
    setData((p) => ({
      ...p,
      annualCarryForwardSeed: { ...p.annualCarryForwardSeed, [year]: clamped },
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
      saveFailed,
      lastBackup,
      today,
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
      saveFailed,
      lastBackup,
      today,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
