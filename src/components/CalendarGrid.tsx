import { useCallback, useMemo, useState } from "react";
import { useAttendance } from "../context/attendanceCore";
import {
  formatDate,
  getCalendarWeeks,
  getMonthShort,
  getMonthYearLabel,
  parseDate,
  todayStr,
} from "../utils/dateUtils";
import type { Cycle } from "../types";
import DayCell from "./DayCell";
import DayModal from "./DayModal";
import NotesPanel from "./NotesPanel";

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
  const { selectedCycle, data, getHolidaysForCycle, mode } = useAttendance();
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [editorVersion, setEditorVersion] = useState(0);

  // Notes panel: open by default when the selected day has a note
  const selectedHasNote = !!data.entries[selectedDate]?.note;
  const [panelOpen, setPanelOpen] = useState(selectedHasNote);
  const [prevHasNote, setPrevHasNote] = useState(selectedHasNote);
  if (prevHasNote !== selectedHasNote) {
    setPrevHasNote(selectedHasNote);
    if (selectedHasNote) setPanelOpen(true); // e.g. a note was added in the modal
  }

  // Panel open: left click only selects the day (modal via right click).
  // Panel closed: day with a note → open the panel; otherwise → open the modal.
  const selectDay = useCallback(
    (d: string, hasNote: boolean) => {
      setSelectedDate(d);
      if (panelOpen) return;
      if (hasNote) setPanelOpen(true);
      else setModalDate(d);
    },
    [panelOpen],
  );

  // Right click (or the panel's edit button): always open the modal
  const editDay = useCallback((d: string) => {
    setSelectedDate(d);
    setModalDate(d);
  }, []);

  const closeModal = useCallback(() => {
    setModalDate(null);
    setEditorVersion((v) => v + 1); // reload panel editor with what the modal saved
  }, []);

  const [pickedMonth, setPickedMonth] = useState<string | null>(null);

  // Quarter mode: split the quarter into its calendar months
  const monthViews = useMemo<Cycle[]>(() => {
    if (mode !== "quarter") return [];
    const start = parseDate(selectedCycle.startDate);
    return [0, 1, 2].map((i) => {
      const s = formatDate(
        new Date(start.getFullYear(), start.getMonth() + i, 1),
      );
      const e = formatDate(
        new Date(start.getFullYear(), start.getMonth() + i + 1, 0),
      );
      return {
        id: s,
        startDate: s,
        endDate: e,
        label: getMonthYearLabel(s),
        name: getMonthShort(s),
      };
    });
  }, [mode, selectedCycle]);

  // Selected month: the user's pick if it belongs to this quarter, else today's month, else the first
  const activeMonth =
    monthViews.find((m) => m.id === pickedMonth) ??
    monthViews.find(
      (m) => m.startDate <= todayStr() && m.endDate >= todayStr(),
    ) ??
    monthViews[0];
  const view: Cycle = activeMonth ?? selectedCycle;

  const weeks = getCalendarWeeks(view);
  const holidays = getHolidaysForCycle(view);
  const holidayMap = new Map(holidays.map((h) => [h.date, h]));

  // Month labels shown in the header (cycle mode only; quarter mode uses month tabs)
  const months = activeMonth
    ? []
    : [
        ...new Set(
          weeks
            .flat()
            .filter(Boolean)
            .map((d) => getMonthYearLabel(d!)),
        ),
      ];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <section className="flex-1 min-w-0 bg-zinc-900/70 rounded-2xl border border-zinc-800 overflow-hidden">
        {/* ── Card header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-100">Attendance Calendar</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {activeMonth ? activeMonth.label : selectedCycle.label}
            </p>
          </div>
          {activeMonth ? (
            <div className="flex items-center rounded-lg bg-zinc-800 p-0.5 text-xs font-medium">
              {monthViews.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPickedMonth(m.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    m.id === activeMonth.id
                      ? "bg-amber-400 text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 font-medium hidden sm:block">
              {months.join(" · ")}
            </p>
          )}
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
                    selected={dateStr === selectedDate}
                    onSelect={selectDay}
                    onEdit={editDay}
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
          <p className="text-[11px] text-zinc-600 mt-3">
            {panelOpen
              ? "Click a day to view/write its note · Right-click (long-press on touch) to edit status"
              : "Click a day to log it (or view its note) · Right-click (long-press on touch) to edit status"}
          </p>
        </div>
      </section>

      <NotesPanel
        dateStr={selectedDate}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        onEditDay={() => editDay(selectedDate)}
        editorVersion={editorVersion}
      />

      {/* ── Day modal ── */}
      {modalDate && <DayModal dateStr={modalDate} onClose={closeModal} />}
    </div>
  );
};

export default CalendarGrid;
