import { useAttendance, type CycleStats } from '../context/AttendanceContext';

export default function StatsBar() {
  const { selectedCycle, getCycleStats } = useAttendance();
  const s: CycleStats = getCycleStats(selectedCycle);

  const metTarget = s.wfoDays >= s.targetDays;
  const remaining = Math.max(0, s.targetDays - s.wfoDays);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* ── Office Visits (WFO only) ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl text-xl leading-none">
            🏢
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">Office Visits</p>
            <p className="text-3xl font-bold text-gray-900">{s.wfoDays}</p>
            <p className={`text-xs font-bold mt-1 ${
              metTarget ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              Target: {s.targetDays} WFO&nbsp;
              {metTarget ? '✅ Met!' : `— need ${remaining} more`}
            </p>
          </div>
        </div>
      </div>

      {/* ── WFH (tracked separately, doesn't count as visited) ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="bg-sky-100 text-sky-600 p-2.5 rounded-xl text-xl leading-none">
            🏠
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">Work from Home</p>
            <p className="text-3xl font-bold text-gray-900">{s.wfhDays}</p>
            <p className="text-xs text-gray-400 mt-1">Not counted in WFO target</p>
          </div>
        </div>
      </div>

      {/* ── Leaves ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="bg-rose-100 text-rose-500 p-2.5 rounded-xl text-xl leading-none">
            🌴
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Leaves Taken</p>
            <p className="text-3xl font-bold text-gray-900">{s.totalLeaves}</p>
            <p className="text-xs text-gray-400 mt-1">
              🤒 {s.sickDays} sick · 🌴 {s.annualDays} annual
            </p>
          </div>
        </div>
      </div>

      {/* ── Working Days ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="bg-orange-100 text-orange-600 p-2.5 rounded-xl text-xl leading-none">
            💼
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Working Days</p>
            <p className="text-3xl font-bold text-gray-900">{s.workingDays}</p>
            <p className="text-xs text-gray-400 mt-1">
              🏖 {s.holidayCount} holidays · Effective {s.effectiveWorkDays}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}