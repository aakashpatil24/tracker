import { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getCalendarWeeks, getMonthYearLabel } from '../utils/dateUtils';
import DayCell from './DayCell';
import DayModal from './DayModal';

const DOW_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEGEND = [
  { cls: 'bg-emerald-100 border-emerald-300', label: 'WFO' },
  { cls: 'bg-sky-100     border-sky-300',     label: 'WFH' },
  { cls: 'bg-amber-100   border-amber-300',   label: 'Sick Leave' },
  { cls: 'bg-purple-100  border-purple-300',  label: 'Annual Leave' },
  { cls: 'bg-rose-100    border-rose-300',    label: 'Public Holiday' },
  { cls: 'bg-gray-100    border-gray-200',    label: 'Weekend' },
];

export default function CalendarGrid() {
  const { selectedCycle, data, getHolidaysForCycle } = useAttendance();
  const [modalDate, setModalDate] = useState<string | null>(null);

  const weeks      = getCalendarWeeks(selectedCycle);
  const holidays   = getHolidaysForCycle(selectedCycle);
  const holidayMap = new Map(holidays.map(h => [h.date, h]));

  // Month labels shown in header
  const months = [...new Set(weeks.flat().filter(Boolean).map(d => getMonthYearLabel(d!)))];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900">Attendance Calendar</h2>
          <p className="text-xs text-gray-400 mt-0.5">{selectedCycle.label}</p>
        </div>
        <p className="text-sm text-gray-500 font-medium">{months.join(' · ')}</p>
      </div>

      <div className="p-5">
        {/* ── Day-of-week headers ── */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DOW_HEADERS.map(d => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-1 rounded ${
                d === 'Sat' || d === 'Sun' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar rows ── */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-2 mb-2">
            {week.map((dateStr, di) =>
              dateStr ? (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  entry={data.entries[dateStr]}
                  holiday={holidayMap.get(dateStr)}
                  onClick={() => setModalDate(dateStr)}
                />
              ) : (
                <div key={`pad-${wi}-${di}`} className="min-h-15.5" />
              )
            )}
          </div>
        ))}

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 mt-2 border-t border-gray-100">
          {LEGEND.map(({ cls, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`inline-block w-3.5 h-3.5 rounded border ${cls}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-3.5 h-3.5 rounded border-2 border-amber-400 bg-white" />
            Today
          </span>
        </div>
      </div>

      {/* ── Day modal ── */}
      {modalDate && (
        <DayModal dateStr={modalDate} onClose={() => setModalDate(null)} />
      )}
    </section>
  );
}