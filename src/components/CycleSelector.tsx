import { useMemo } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "./Icons";
import { useAttendance } from "../context/AttendanceContext";
import {
  getAvailableYears,
  getCyclesForYear,
  parseDate,
  todayStr,
} from "../utils/dateUtils";

const CycleSelector = () => {
  const { cycles, selectedCycle, setSelectedCycle, currentCycle } =
    useAttendance();

  // Derive year from selectedCycle — no separate state needed
  const selectedYear = parseDate(selectedCycle.startDate).getFullYear();
  const availableYears = useMemo(() => getAvailableYears(cycles), [cycles]);
  const filteredCycles = useMemo(
    () => getCyclesForYear(cycles, selectedYear),
    [cycles, selectedYear],
  );

  // Global index for cross-year prev/next
  const globalIdx = cycles.findIndex((c) => c.id === selectedCycle.id);
  const canPrev = globalIdx > 0;
  const canNext = globalIdx < cycles.length - 1;

  const handleYearChange = (year: number) => {
    const yc = getCyclesForYear(cycles, year);
    if (!yc.length) return;
    const today = todayStr();
    setSelectedCycle(
      yc.find((c) => c.startDate <= today && c.endDate >= today) ?? yc[0],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-zinc-900/70 rounded-2xl px-3 sm:px-4 py-3 border border-zinc-800">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-500">Year</span>
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Cycle selector with prev/next */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-500 hidden sm:inline">
          Cycle
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => canPrev && setSelectedCycle(cycles[globalIdx - 1])}
            disabled={!canPrev}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <select
            value={selectedCycle.id}
            onChange={(e) => {
              const c = cycles.find((c) => c.id === e.target.value);
              if (c) setSelectedCycle(c);
            }}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2.5 py-1.5 text-sm max-w-44 sm:max-w-70 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            {filteredCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {currentCycle?.id === c.id ? " ← current" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={() => canNext && setSelectedCycle(cycles[globalIdx + 1])}
            disabled={!canNext}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Jump back to current */}
      {currentCycle && selectedCycle.id !== currentCycle.id && (
        <button
          onClick={() => setSelectedCycle(currentCycle)}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          <RotateCcw size={13} /> Current cycle
        </button>
      )}
    </div>
  );
};

export default CycleSelector;
