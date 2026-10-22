import { useAttendance, type CycleStats } from "../context/AttendanceContext";
import { Building, Home, Palm, Briefcase, Check } from "./Icons";

const StatsBar = () => {
  const { selectedCycle, getCycleStats } = useAttendance();
  const s: CycleStats = getCycleStats(selectedCycle);

  const metTarget = s.wfoDays >= s.targetDays;
  const remaining = Math.max(0, s.targetDays - s.wfoDays);

  const tiles = [
    {
      icon: <Building size={16} />,
      wrap: "bg-emerald-400/10 text-emerald-400",
      label: "Office Visits",
      value: s.wfoDays,
      sub: metTarget ? (
        <span className="text-emerald-400 flex items-center gap-0.5">
          <Check size={11} /> Target {s.targetDays} met
        </span>
      ) : (
        <span className="text-amber-400">
          Target {s.targetDays} · {remaining} to go
        </span>
      ),
    },
    {
      icon: <Home size={16} />,
      wrap: "bg-sky-400/10 text-sky-400",
      label: "Work from Home",
      value: s.wfhDays,
      sub: <span className="text-zinc-500">Not in target</span>,
    },
    {
      icon: <Palm size={16} />,
      wrap: "bg-purple-400/10 text-purple-400",
      label: "Leaves Taken",
      value: s.totalLeaves,
      sub: (
        <span className="text-zinc-500">
          {s.sickDays} sick · {s.annualDays} annual
        </span>
      ),
    },
    {
      icon: <Briefcase size={16} />,
      wrap: "bg-amber-400/10 text-amber-400",
      label: "Working Days",
      value: s.workingDays,
      sub: (
        <span className="text-zinc-500">
          {s.holidayCount} holidays · {s.effectiveWorkDays} effective
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-zinc-900/70 rounded-xl p-3 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-3"
        >
          <div className={`${t.wrap} p-2 rounded-lg shrink-0`}>{t.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-semibold text-zinc-100 leading-none">
                {t.value}
              </p>
              <p className="text-[11px] font-medium text-zinc-500 truncate">
                {t.label}
              </p>
            </div>
            <p className="text-[11px] font-medium mt-1 truncate">{t.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
