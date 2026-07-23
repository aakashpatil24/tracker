import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from './Icons';
import { useAttendance } from '../context/AttendanceContext';
import { getAvailableYears, getCyclesForYear, parseDate, todayStr } from '../utils/dateUtils';

export default function CycleSelector() {
  const { cycles, selectedCycle, setSelectedCycle, currentCycle } = useAttendance();

  // Derive year from selectedCycle — no separate state needed
  const selectedYear  = parseDate(selectedCycle.startDate).getFullYear();
  const availableYears = useMemo(() => getAvailableYears(cycles), [cycles]);
  const filteredCycles = useMemo(() => getCyclesForYear(cycles, selectedYear), [cycles, selectedYear]);

  // Global index for cross-year prev/next
  const globalIdx = cycles.findIndex(c => c.id === selectedCycle.id);
  const canPrev = globalIdx > 0;
  const canNext = globalIdx < cycles.length - 1;

  const handleYearChange = (year: number) => {
    const yc = getCyclesForYear(cycles, year);
    if (!yc.length) return;
    const today = todayStr();
    setSelectedCycle(yc.find(c => c.startDate <= today && c.endDate >= today) ?? yc[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500">Select year</span>
        <select
          value={selectedYear}
          onChange={e => handleYearChange(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cycle selector with prev/next */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500">Select cycle</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => canPrev && setSelectedCycle(cycles[globalIdx - 1])}
            disabled={!canPrev}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <select
            value={selectedCycle.id}
            onChange={e => {
              const c = cycles.find(c => c.id === e.target.value);
              if (c) setSelectedCycle(c);
            }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm max-w-70 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {filteredCycles.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}{currentCycle?.id === c.id ? ' ← current' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => canNext && setSelectedCycle(cycles[globalIdx + 1])}
            disabled={!canNext}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Jump back to current */}
      {currentCycle && selectedCycle.id !== currentCycle.id && (
        <button
          onClick={() => setSelectedCycle(currentCycle)}
          className="text-xs text-indigo-600 hover:underline"
        >
          ↩ Go to current cycle
        </button>
      )}
    </div>
  );
}