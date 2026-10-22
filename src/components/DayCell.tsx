import type { ReactNode } from "react";
import { memo, useState } from "react";
import type { DayEntry, DayStatus, PublicHoliday } from "../types";
import {
  isWeekend,
  parseDate,
  todayStr,
  formatDayLabel,
} from "../utils/dateUtils";
import { Building, Home, Thermometer, Palm } from "./Icons";

interface Props {
  dateStr: string;
  entry?: DayEntry;
  holiday?: PublicHoliday;
  onSelect: (dateStr: string) => void;
}

type StyleKey = DayStatus | "holiday" | "weekend";

const STYLES: Record<StyleKey, string> = {
  wfo: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
  wfh: "bg-sky-500/10     border-sky-500/40     text-sky-300",
  sick: "bg-amber-500/10   border-amber-500/40   text-amber-300",
  annual: "bg-purple-500/10  border-purple-500/40  text-purple-300",
  none: "bg-zinc-900/60    border-zinc-800       text-zinc-300",
  holiday: "bg-rose-500/10    border-rose-500/40    text-rose-300",
  weekend: "bg-zinc-950/40    border-zinc-900       text-zinc-600",
};

const ICONS: Partial<Record<DayStatus, ReactNode>> = {
  wfo: <Building size={15} />,
  wfh: <Home size={15} />,
  sick: <Thermometer size={15} />,
  annual: <Palm size={15} />,
};

const STATUS_LABELS: Record<DayStatus, string> = {
  wfo: "Work from Office",
  wfh: "Work from Home",
  sick: "Sick Leave",
  annual: "Annual Leave",
  none: "No entry",
};

const DOT_COLORS: Record<StyleKey, string> = {
  wfo: "bg-emerald-400",
  wfh: "bg-sky-400",
  sick: "bg-amber-400",
  annual: "bg-purple-400",
  none: "bg-zinc-500",
  holiday: "bg-rose-400",
  weekend: "bg-zinc-600",
};

const DayCell = ({ dateStr, entry, holiday, onSelect }: Props) => {
  const today = todayStr();
  const isToday = dateStr === today;
  const weekend = isWeekend(dateStr);
  const dayNum = parseDate(dateStr).getDate();
  const [hovered, setHovered] = useState(false);

  let key: StyleKey = "none";
  if (entry && entry.status !== "none") key = entry.status;
  else if (holiday) key = "holiday";
  else if (weekend) key = "weekend";

  const hasNote = !!entry?.note;
  const hasDetails = (entry && entry.status !== "none") || !!holiday || hasNote;
  const showPopover = hovered && hasDetails;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onSelect(dateStr)}
        title={weekend ? "Weekend — log overtime or add a note" : undefined}
        className={[
          "relative w-full min-h-15.5 rounded-xl border flex flex-col items-center",
          "justify-center gap-0.5 py-1.5 transition-all duration-100 select-none",
          STYLES[key],
          "hover:border-zinc-600 hover:-translate-y-0.5 active:scale-95 cursor-pointer",
          isToday
            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0b]"
            : "",
        ].join(" ")}
      >
        {/* Day number */}
        <span
          className={`text-sm font-semibold leading-none ${isToday ? "text-amber-400" : ""}`}
        >
          {dayNum}
        </span>

        {/* Entry icon */}
        {entry && entry.status !== "none" && (
          <span className="leading-none">{ICONS[entry.status]}</span>
        )}

        {/* Holiday short name (only when no entry) */}
        {holiday && !entry && (
          <span className="text-[10px] leading-tight text-center px-1 font-medium line-clamp-2">
            {holiday.name.split(" ").slice(0, 2).join(" ")}
          </span>
        )}

        {/* Note indicator */}
        {hasNote && (
          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-current rounded-full opacity-70" />
        )}

        {/* Today indicator dot */}
        {isToday && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#0a0a0b]" />
        )}
      </button>

      {/* Hover detail popover */}
      {showPopover && (
        <div
          className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-52
                     bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 text-left
                     pointer-events-none animate-fade-in"
        >
          <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
            {formatDayLabel(dateStr)}
          </p>

          {entry && entry.status !== "none" && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${DOT_COLORS[key]}`} />
              <span className="text-xs text-zinc-200">
                {weekend && (entry.status === "wfo" || entry.status === "wfh")
                  ? entry.status === "wfo"
                    ? "OT · Office"
                    : "OT · Home"
                  : STATUS_LABELS[entry.status]}
              </span>
            </div>
          )}

          {holiday && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-xs text-rose-300">{holiday.name}</span>
            </div>
          )}

          {hasNote ? (
            <p className="text-xs text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-800 whitespace-pre-wrap wrap-break-word">
              {entry!.note}
            </p>
          ) : (
            entry &&
            entry.status !== "none" && (
              <p className="text-[11px] text-zinc-600 mt-1.5 pt-1.5 border-t border-zinc-800 italic">
                No work log — click to add
              </p>
            )
          )}

          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2.5 h-2.5
                       bg-zinc-900 border-r border-b border-zinc-700 rotate-45"
          />
        </div>
      )}
    </div>
  );
};

export default memo(DayCell);

