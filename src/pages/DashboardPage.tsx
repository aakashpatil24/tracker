import { useAttendance } from "../context/AttendanceContext";
import { REGION_LABELS, type Region } from "../types";
import CycleSelector from "../components/CycleSelector";
import StatsBar from "../components/StatsBar";
import LeaveSummary from "../components/LeaveSummary";
import CalendarGrid from "../components/CalendarGrid";

const DashboardPage = () => {
  const { data, setRegion } = useAttendance();

  return (
    <div className="space-y-4">
      {/* Region selector */}
      <div
        className="bg-zinc-900/70 rounded-2xl px-3 sm:px-4 py-3 border border-zinc-800
                      flex flex-wrap items-center gap-3"
      >
        <span className="text-sm font-medium text-zinc-400">Your Region</span>
        <select
          value={data.selectedRegion}
          onChange={(e) => setRegion(e.target.value as Region)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          {(Object.entries(REGION_LABELS) as [Region, string][]).map(
            ([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ),
          )}
        </select>
        <span className="text-xs text-zinc-600 hidden sm:block">
          Filters which public holidays apply to you
        </span>
      </div>

      <CycleSelector />
      <StatsBar />
      <LeaveSummary />
      <CalendarGrid />

      {/* Formula card */}
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 sm:px-5 py-4 text-sm text-amber-200/90">
        <p className="font-semibold mb-1 text-amber-300">
          How target is calculated
        </p>
        <p className="text-amber-200/70">
          <strong className="text-amber-200">
            Target WFO Days = ⌈50% × (Working Days − Leaves)⌉
          </strong>
          <br />
          Working Days = 20 standard days per cycle − Public Holidays for your
          region
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;