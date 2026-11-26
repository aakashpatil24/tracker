import { useState } from "react";
import { useAttendance } from "../context/attendanceCore";
import { Pencil } from "./Icons";

const MIN_COMPLIANCE = 80;

const QuarterStats = () => {
  const { selectedCycle, getCycleStats, data, setExpectedOverride } =
    useAttendance();
  const s = getCycleStats(selectedCycle);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const expected = s.targetDays;
  const actual = s.wfoDays;
  const pct = expected > 0 ? Math.round((actual / expected) * 100) : 100;
  const ok = pct >= MIN_COMPLIANCE;
  const isManual = data.expectedOverride?.[selectedCycle.id] !== undefined;
  const quarterName = selectedCycle.name ?? selectedCycle.label;

  const save = () => {
    const v = draft.trim();
    const n = Number(v);
    setExpectedOverride(
      selectedCycle.id,
      v === "" || !Number.isFinite(n) ? null : n,
    );
    setEditing(false);
  };

  const tiles = [
    { label: "Total Working Days", value: s.workingDays },
    { label: "Expected from Office", value: expected, editable: true },
    { label: "Actual from Office", value: actual },
    {
      label: `Leaves (${s.sickDays} sick · ${s.annualDays} annual)`,
      value: s.totalLeaves,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          ok
            ? "bg-emerald-400/5 border-emerald-400/20 text-emerald-200"
            : "bg-rose-400/5 border-rose-400/20 text-rose-200"
        }`}
      >
        Your Compliance Percent for <strong>{quarterName}</strong> is{" "}
        <strong className="text-lg">{pct}%</strong>, which is{" "}
        {ok ? "meeting" : "below"} the required standards (min {MIN_COMPLIANCE}
        %).
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-zinc-900/70 rounded-xl p-3 border border-zinc-800"
          >
            <p className="text-2xl font-semibold text-zinc-100 leading-none">
              {t.value}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 mt-1.5 flex items-center gap-1.5">
              {t.label}
              {t.editable &&
                (editing ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={s.effectiveWorkDays}
                      step={1}
                      inputMode="numeric"
                      aria-label="Expected office days (blank for automatic)"
                      value={draft}
                      placeholder="auto"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      className="w-14 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      autoFocus
                    />
                    <button
                      onClick={save}
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
                    <button
                      onClick={() => {
                        setDraft(isManual ? String(expected) : "");
                        setEditing(true);
                      }}
                      title="Set expected days manually (blank = 50% of all weekdays)"
                      aria-label="Edit expected office days"
                      className="text-amber-400 hover:underline"
                    >
                      <Pencil size={10} />
                    </button>
                    {isManual && (
                      <span className="text-zinc-600">(manual)</span>
                    )}
                  </>
                ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuarterStats;
