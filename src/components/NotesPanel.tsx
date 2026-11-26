import { useState } from "react";
import { useAttendance } from "../context/attendanceCore";
import type { DayStatus } from "../types";
import { formatDayLabel, isWeekend } from "../utils/dateUtils";
import { ChevronsLeft, ChevronsRight, Pencil, Umbrella } from "./Icons";
import NoteEditor from "./NoteEditor";

const STATUS_CHIPS: Record<
  Exclude<DayStatus, "none">,
  { label: string; cls: string }
> = {
  wfo: {
    label: "Work from Office",
    cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
  wfh: {
    label: "Work from Home",
    cls: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  },
  sick: {
    label: "Sick Leave",
    cls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
  annual: {
    label: "Annual Leave",
    cls: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  },
};

// Auto-saving editor for one day; remount (key) to load another day / fresh data.
// Every change goes straight to the store (which debounces disk writes and
// flushes on unload), so nothing is lost on reload, day switch or modal open.
const DayNoteEditor = ({
  dateStr,
  initial,
}: {
  dateStr: string;
  initial: string;
}) => {
  const { setDayNote } = useAttendance();
  const [draft, setDraft] = useState(initial);

  const handleChange = (value: string) => {
    setDraft(value);
    setDayNote(dateStr, value.trim() || undefined);
  };

  return (
    <>
      <NoteEditor
        value={draft}
        onChange={handleChange}
        ariaLabel={`Note for ${formatDayLabel(dateStr)}`}
        placeholder="Log what you worked on, meetings, tasks…"
        rows={8}
        className="flex-1 min-h-48"
      />
      <p className="text-[11px] text-zinc-600 flex justify-between gap-2">
        <span>Tab / Shift+Tab to indent · Shift+Enter for a plain line</span>
        <span className="text-zinc-500 shrink-0 whitespace-nowrap">
          {draft.trim() ? "Auto-saved" : ""}
        </span>
      </p>
    </>
  );
};

interface Props {
  dateStr: string;
  open: boolean;
  onToggle: () => void;
  onEditDay: () => void;
  /** Bump to reload the editor from storage (e.g. after the day modal saved) */
  editorVersion: number;
}

const NotesPanel = ({
  dateStr,
  open,
  onToggle,
  onEditDay,
  editorVersion,
}: Props) => {
  const { data, getEffectiveHolidays } = useAttendance();
  const entry = data.entries[dateStr];
  const hasNote = !!entry?.note;

  if (!open) {
    return (
      <aside className="shrink-0 w-full lg:w-11 bg-zinc-900/70 rounded-2xl border border-zinc-800 overflow-hidden">
        <button
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Show notes"
          title="Show notes"
          className="w-full h-full flex lg:flex-col items-center justify-center gap-3 px-4 py-3 lg:px-0 lg:py-5
                     text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/50 transition-colors"
        >
          <ChevronsLeft size={16} className="max-lg:-rotate-90" />
          <span className="flex lg:flex-col items-center gap-0.5 lg:gap-0 text-xs font-semibold uppercase lg:leading-4">
            {"Notes".split("").map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </span>
          {hasNote && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              title="This day has a note"
            />
          )}
        </button>
      </aside>
    );
  }

  const holiday = getEffectiveHolidays().find((h) => h.date === dateStr);
  const status =
    entry && entry.status !== "none" ? STATUS_CHIPS[entry.status] : null;

  return (
    <aside
      aria-label="Notes"
      className="shrink-0 w-full lg:w-[30%] lg:min-w-72 bg-zinc-900/70 rounded-2xl border border-zinc-800
                 flex flex-col animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2 px-4 py-4 border-b border-zinc-800">
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-100">Notes</h2>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {formatDayLabel(dateStr)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEditDay}
            aria-label="Edit day status"
            title="Edit day status (or right-click the day)"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onToggle}
            aria-expanded
            aria-label="Hide notes"
            title="Hide notes"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronsRight size={16} className="max-lg:-rotate-90" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 p-4">
        {(status || holiday || isWeekend(dateStr)) && (
          <div className="flex flex-wrap gap-1.5">
            {status && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.cls}`}
              >
                {status.label}
              </span>
            )}
            {holiday && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-300 border-rose-500/30 inline-flex items-center gap-1">
                <Umbrella size={11} /> {holiday.name}
              </span>
            )}
            {isWeekend(dateStr) && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-400 border-zinc-700">
                Weekend
              </span>
            )}
          </div>
        )}
        <DayNoteEditor
          key={`${dateStr}-${editorVersion}`}
          dateStr={dateStr}
          initial={entry?.note ?? ""}
        />
      </div>
    </aside>
  );
};

export default NotesPanel;
