import { useState } from 'react';
import { X } from './Icons';
import { useAttendance } from '../context/AttendanceContext';
import { type PublicHoliday, type Region, REGION_LABELS } from '../types';

interface Props { holiday?: PublicHoliday; onClose: () => void; }

const ALL_REGIONS: Region[] = ['west', 'east', 'north', 'south', 'south_chennai'];

export default function HolidayModal({ holiday, onClose }: Props) {
  const { addHoliday, updateHoliday } = useAttendance();
  const [name,    setName]    = useState(holiday?.name    ?? '');
  const [date,    setDate]    = useState(holiday?.date    ?? '');
  const [regions, setRegions] = useState<Region[]>(holiday?.regions ?? [...ALL_REGIONS]);
  const [error,   setError]   = useState('');

  const allSel = regions.length === ALL_REGIONS.length;
  const toggleRegion = (r: Region) =>
    setRegions(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const handleSave = () => {
    if (!name.trim())    return setError('Holiday name is required');
    if (!date)           return setError('Date is required');
    if (!regions.length) return setError('Select at least one region');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    holiday
      ? updateHoliday({ ...holiday, name: name.trim(), date, regions })
      : addHoliday({ name: name.trim(), date, regions, isCustom: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">
            {holiday ? '✏️ Edit Holiday' : '➕ Add Holiday'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Holiday Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Diwali, Christmas, Team Day"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Regions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Applicable Regions *
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox" checked={allSel}
                  onChange={e => setRegions(e.target.checked ? [...ALL_REGIONS] : [])}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-semibold text-gray-800">All Regions</span>
              </label>
              <div className="ml-6 space-y-2">
                {ALL_REGIONS.map(r => (
                  <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox" checked={regions.includes(r)}
                      onChange={() => toggleRegion(r)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm text-gray-600">{REGION_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
            {holiday ? 'Update Holiday' : 'Add Holiday'}
          </button>
        </div>
      </div>
    </div>
  );
}