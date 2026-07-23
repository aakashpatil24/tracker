import { useState } from 'react';
import { X } from './Icons';
import { useAttendance } from '../context/AttendanceContext';
import type { DayStatus } from '../types';
import { formatDayLabel } from '../utils/dateUtils';

interface Props { dateStr: string; onClose: () => void; }

const OPTIONS: {
  value: DayStatus; emoji: string; label: string; desc: string; selected: string;
}[] = [
  { value: 'wfo',    emoji: '🏢', label: 'Work from Office', desc: 'Attended office today',    selected: 'ring-emerald-400 bg-emerald-50' },
  { value: 'wfh',    emoji: '🏠', label: 'Work from Home',   desc: 'Worked remotely',          selected: 'ring-sky-400 bg-sky-50' },
  { value: 'sick',   emoji: '🤒', label: 'Sick Leave',       desc: 'On medical / sick leave',  selected: 'ring-amber-400 bg-amber-50' },
  { value: 'annual', emoji: '🌴', label: 'Annual Leave',     desc: 'Planned / approved leave', selected: 'ring-purple-400 bg-purple-50' },
  { value: 'none',   emoji: '✕',  label: 'Clear Entry',      desc: 'Remove status for this day', selected: 'ring-gray-300 bg-gray-50' },
];

export default function DayModal({ dateStr, onClose }: Props) {
  const { data, setDayEntry, clearDayEntry, getEffectiveHolidays } = useAttendance();
  const existing = data.entries[dateStr];
  const holiday  = getEffectiveHolidays().find(h => h.date === dateStr);

  const [selected, setSelected] = useState<DayStatus>(existing?.status ?? 'none');
  const [note, setNote] = useState(existing?.note ?? '');

  const handleSave = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    selected === 'none' ? clearDayEntry(dateStr) : setDayEntry(dateStr, selected, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-base">{formatDayLabel(dateStr)}</p>
            {holiday && (
              <p className="text-xs text-rose-600 font-semibold mt-1">
                🏖 {holiday.name} · Public Holiday
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Status options */}
        <div className="p-4 space-y-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={[
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                selected === opt.value
                  ? `ring-2 ${opt.selected} border-transparent`
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/80',
              ].join(' ')}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
              {selected === opt.value && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}

          {/* Optional note */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Team offsite, Doctor appointment…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}