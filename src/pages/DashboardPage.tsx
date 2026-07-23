import { useAttendance } from '../context/AttendanceContext';
import { REGION_LABELS, type Region } from '../types';
import CycleSelector from '../components/CycleSelector';
import StatsBar from '../components/StatsBar';
import CalendarGrid from '../components/CalendarGrid';

export default function DashboardPage() {
  const { data, setRegion } = useAttendance();

  return (
    <div className="space-y-4">

      {/* Region selector */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100
                      flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-gray-700">Your Region:</span>
        <select
          value={data.selectedRegion}
          onChange={e => setRegion(e.target.value as Region)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {(Object.entries(REGION_LABELS) as [Region, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 hidden sm:block">
          Filters which public holidays apply to you
        </span>
      </div>

      <CycleSelector />
      <StatsBar />
      <CalendarGrid />

      {/* Formula card */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 text-sm text-indigo-800">
        <p className="font-bold mb-1">📐 How target is calculated</p>
        <p className="text-indigo-700">
          <strong>Target WFO Days = ⌈50% × (Working Days − Leaves)⌉</strong>
          <br />
          Working Days = 20 standard days per cycle − Public Holidays for your region
        </p>
      </div>
    </div>
  );
}