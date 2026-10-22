import { useCallback, useState } from "react";
import { useAttendance } from "../context/AttendanceContext";
import { getCalendarWeeks, getMonthYearLabel } from "../utils/dateUtils";
import DayCell from "./DayCell";
import DayModal from "./DayModal";

const DOW_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LEGEND = [
  { cls: "bg-emerald-500/20 border-emerald-500/50", label: "WFO" },
  { cls: "bg-sky-500/20     border-sky-500/50", label: "WFH" },
  { cls: "bg-amber-500/20   border-amber-500/50", label: "Sick Leave" },
  { cls: "bg-purple-500/20  border-purple-500/50", label: "Annual Leave" },
  { cls: "bg-rose-500/20    border-rose-500/50", label: "Public Holiday" },
  { cls: "bg-zinc-800       border-zinc-700", label: "Weekend" },
];

const CalendarGrid = () => {
  const { selectedCycle, data, getHolidaysForCycle } = useAttendance();
  const [modalDate, setModalDate] = useState<string | null>(null);
  const openDay = useCallback((d: string) => setModalDate(d), []);

  const weeks = getCalendarWeeks(selectedCycle);
  const holidays = getHolidaysForCycle(selectedCycle);
  const holidayMap = new Map(holidays.map((h) => [h.date, h]));

  // Month labels shown in header
  const months = [
    ...new Set(
      weeks
        .flat()
        .filter(Boolean)
        .map((d) => getMonthYearLabel(d!)),
    ),
  ];

  return (
    <section className="bg-zinc-900/70 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-zinc-800">
        <div>
          <h2 className="font-semibold text-zinc-100">Attendance Calendar</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{selectedCycle.label}</p>
        </div>
        <p className="text-sm text-zinc-400 font-medium hidden sm:block">
          {months.join(" · ")}
        </p>
      </div>

      <div className="p-3 sm:p-5">
        {/* ── Day-of-week headers ── */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
          {DOW_HEADERS.map((d) => (
            <div
              key={d}
              className={`text-center text-xs font-medium py-1 ${
                d === "Sat" || d === "Sun" ? "text-zinc-600" : "text-zinc-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar rows ── */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2"
          >
            {week.map((dateStr, di) =>
              dateStr ? (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  entry={data.entries[dateStr]}
                  holiday={holidayMap.get(dateStr)}
                  onSelect={openDay}
                />
              ) : (
                <div key={`pad-${wi}-${di}`} className="min-h-15.5" />
              ),
            )}
          </div>
        ))}

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 mt-2 border-t border-zinc-800">
          {LEGEND.map(({ cls, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs text-zinc-400"
            >
              <span
                className={`inline-block w-3.5 h-3.5 rounded border ${cls}`}
              />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="inline-block w-3.5 h-3.5 rounded border-2 border-amber-400 bg-transparent" />
            Today
          </span>
        </div>
      </div>

      {/* ── Day modal ── */}
      {modalDate && (
        <DayModal dateStr={modalDate} onClose={() => setModalDate(null)} />
      )}
    </section>
  );
};

export default CalendarGrid;
