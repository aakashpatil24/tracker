import { useState } from "react";
import {
  useAttendance,
  ANNUAL_LEAVE_QUOTA,
  SICK_LEAVE_QUOTA,
  CARRY_FORWARD_MAX_BALANCE,
} from "../context/AttendanceContext";
import { Palm, Thermometer, Pencil } from "./Icons";

const LeaveSummary = () => {
  const { getLeaveSummary, setCarryForwardSeed } = useAttendance();
  const { currentYear, years } = getLeaveSummary();
  const stats = years[currentYear];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("0");

  if (!stats) return null;

  const startEdit = () => {
    setDraft(String(stats.broughtForward));
    setEditing(true);
  };

  const saveEdit = () => {
    const value = Math.max(0, Number(draft) || 0);
    setCarryForwardSeed(currentYear, value);
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
      {/* ── Annual Leave ── */}
      <div className="bg-zinc-900/70 rounded-xl p-3 border border-zinc-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="bg-purple-400/10 text-purple-400 p-1.5 rounded-lg shrink-0">
            <Palm size={16} />
          </div>
          <p className="text-xs font-medium text-zinc-400 flex-1">
            Annual Leave · {currentYear}
          </p>
          <p className="text-sm font-semibold text-zinc-100">
            {stats.annualUsed}
            <span className="text-zinc-600 font-normal">
              /{stats.totalAvailable}
            </span>
          </p>
        </div>

        {/* progress */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-purple-400 transition-all"
            style={{
              width: `${Math.min(100, (stats.annualUsed / Math.max(1, stats.totalAvailable)) * 100)}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300">
            {stats.annualTaken} used
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300">
            {stats.annualApplied} applied
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {stats.annualRemaining} left
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>
            Carried in:{" "}
            {editing ? (
              <span className="inline-flex items-center gap-1 align-middle">
                <input
                  type="number"
                  min={0}
                  max={CARRY_FORWARD_MAX_BALANCE}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-14 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-1 py-0.5 text-[11px]
                             focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="text-amber-400 font-semibold hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-zinc-500 hover:underline"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <>
                <strong className="text-zinc-300">
                  {stats.broughtForward}
                </strong>{" "}
                <button
                  onClick={startEdit}
                  title="Manually set carried-forward days for this year"
                  className="inline-flex items-center gap-0.5 text-amber-400 hover:underline align-middle"
                >
                  <Pencil size={10} />
                </button>
                {stats.isSeeded && (
                  <span className="text-zinc-600"> (manual)</span>
                )}
              </>
            )}
          </span>
          <span>
            This Year:{" "}
            <strong className="text-zinc-300">{ANNUAL_LEAVE_QUOTA}</strong>
          </span>
          <span>
            → {Number(currentYear) + 1}:{" "}
            <strong className="text-zinc-300">
              {stats.carryForwardToNextYear}
            </strong>
            <span className="text-zinc-600">
              {" "}
              ({stats.carryForwardEligibleThisYear} new, max{" "}
              {CARRY_FORWARD_MAX_BALANCE})
            </span>
          </span>
        </div>
      </div>

      {/* ── Sick Leave ── */}
      <div className="bg-zinc-900/70 rounded-xl p-3 border border-zinc-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="bg-amber-400/10 text-amber-400 p-1.5 rounded-lg shrink-0">
            <Thermometer size={16} />
          </div>
          <p className="text-xs font-medium text-zinc-400 flex-1">
            Sick Leave · {currentYear}
          </p>
          <p className="text-sm font-semibold text-zinc-100">
            {stats.sickUsed}
            <span className="text-zinc-600 font-normal">
              /{SICK_LEAVE_QUOTA}
            </span>
          </p>
        </div>

        {/* progress */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{
              width: `${Math.min(100, (stats.sickUsed / SICK_LEAVE_QUOTA) * 100)}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300">
            {stats.sickTaken} used
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300">
            {stats.sickApplied} applied
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {stats.sickRemaining} left
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeaveSummary;
