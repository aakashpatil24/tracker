import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Building, Home, Thermometer, Palm, Umbrella } from "./Icons";
import { useAttendance } from "../context/attendanceCore";
import { useDialog } from "../hooks/useDialog";
import type { DayStatus } from "../types";
import { formatDayLabel, isWeekend } from "../utils/dateUtils";
import NoteEditor from "./NoteEditor";
import type { ReactNode } from "react";

interface Props {
  dateStr: string;
  onClose: () => void;
}

const OPTIONS: {
  value: DayStatus;
  icon: ReactNode;
  label: string;
  desc: string;
  selected: string;
  iconWrap: string;
  weekend?: boolean; // available on weekends
  weekday?: boolean; // available on weekdays
  weekendLabel?: string;
  weekendDesc?: string;
}[] = [
  {
    value: "wfo",
    icon: <Building size={18} />,
    label: "Work from Office",
    desc: "Attended office today",
    selected: "ring-emerald-400/60 bg-emerald-500/10",
    iconWrap: "bg-emerald-500/10 text-emerald-400",
    weekend: true,
    weekday: true,
    weekendLabel: "OT · Office",
    weekendDesc: "Overtime worked from office",
  },
  {
    value: "wfh",
    icon: <Home size={18} />,
    label: "Work from Home",
    desc: "Worked remotely",
    selected: "ring-sky-400/60 bg-sky-500/10",
    iconWrap: "bg-sky-500/10 text-sky-400",
    weekend: true,
    weekday: true,
    weekendLabel: "OT · Home",
    weekendDesc: "Overtime worked from home",
  },
  {
    value: "sick",
    icon: <Thermometer size={18} />,
    label: "Sick Leave",
    desc: "On medical / sick leave",
    selected: "ring-amber-400/60 bg-amber-500/10",
    iconWrap: "bg-amber-500/10 text-amber-400",
    weekday: true,
  },
  {
    value: "annual",
    icon: <Palm size={18} />,
    label: "Annual Leave",
    desc: "Planned / approved leave",
    selected: "ring-purple-400/60 bg-purple-500/10",
    iconWrap: "bg-purple-500/10 text-purple-400",
    weekday: true,
  },
  {
    value: "none",
    icon: <X size={18} />,
    label: "Clear Entry",
    desc: "Remove status for this day",
    selected: "ring-zinc-500/60 bg-zinc-800",
    iconWrap: "bg-zinc-800 text-zinc-400",
    weekend: true,
    weekday: true,
  },
];

const DayModal = ({ dateStr, onClose }: Props) => {
  const { data, setDayEntry, clearDayEntry, getEffectiveHolidays } =
    useAttendance();
  const existing = data.entries[dateStr];
  const holiday = getEffectiveHolidays().find((h) => h.date === dateStr);
  const weekend = isWeekend(dateStr);

  const [selected, setSelected] = useState<DayStatus>(
    existing?.status ?? "none",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(onClose);

  const handleSave = () => {
    const trimmed = note.trim();
    if (selected === "none" && !trimmed) clearDayEntry(dateStr);
    // A note alone is a valid entry: status "none" is ignored by all stats
    else setDayEntry(dateStr, selected, trimmed || undefined);
    onClose();
  };

  // WFO / WFH: one click saves (keeping any note) and closes the modal.
  // Clear Entry only removes the status; the note stays until the user edits/empties it.
  const handleSelect = (value: DayStatus) => {
    if (value === "wfo" || value === "wfh") {
      setDayEntry(dateStr, value, note.trim() || undefined);
      onClose();
      return;
    }
    setSelected(value);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={formatDayLabel(dateStr)}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div>
            <p className="font-semibold text-zinc-100 text-base">
              {formatDayLabel(dateStr)}
            </p>
            {weekend && (
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Weekend · log overtime or add a note
              </p>
            )}
            {holiday && (
              <p className="text-xs text-rose-400 font-medium mt-1 flex items-center gap-1">
                <Umbrella size={13} /> {holiday.name} · Public Holiday
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status options */}
        <div className="p-4 space-y-2">
          {OPTIONS.filter((opt) => (weekend ? opt.weekend : opt.weekday)).map(
            (opt) => (
              <button
                key={opt.value}
                data-autofocus={selected === opt.value ? true : undefined}
                aria-pressed={selected === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={[
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  selected === opt.value
                    ? `ring-2 ${opt.selected} border-transparent`
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60",
                ].join(" ")}
              >
                <span className={`p-2 rounded-lg leading-none ${opt.iconWrap}`}>
                  {opt.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-100">
                    {weekend && opt.weekendLabel ? opt.weekendLabel : opt.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {weekend && opt.weekendDesc ? opt.weekendDesc : opt.desc}
                  </p>
                </div>
                {selected === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-zinc-900" />
                  </div>
                )}
              </button>
            ),
          )}

          {/* Optional note / work log */}
          <div className="pt-1">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Work Log / Note{" "}
              <span className="font-normal text-zinc-600">(optional)</span>
            </label>
            <NoteEditor
              value={note}
              onChange={setNote}
              rows={4}
              ariaLabel="Work log / note"
              placeholder="Log what you worked on, meetings, tasks, or any note…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-xl text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DayModal;
