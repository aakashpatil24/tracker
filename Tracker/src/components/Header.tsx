import React, { useRef } from 'react';
import { Building2, CalendarDays, Flag, Download, Upload } from './Icons';
import { useAttendance } from '../context/AttendanceContext';

type Page = 'dashboard' | 'holidays';
interface Props { currentPage: Page; onNavigate: (p: Page) => void; }

export default function Header({ currentPage, onNavigate }: Props) {
  const { exportData, importData } = useAttendance();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importData(file);
      alert('✅ Data imported successfully!');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert('❌ Import failed: ' + err.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const NavBtn = ({ page, label, icon }: { page: Page; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        currentPage === page ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl">
            <Building2 size={20} />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-sm">Office Attendance Tracker</p>
            <p className="text-[11px] text-gray-400">4-Week Compliance Cycle</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavBtn page="dashboard" label="Dashboard" icon={<CalendarDays size={15} />} />
          <NavBtn page="holidays"  label="Holidays"  icon={<Flag size={15} />} />

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <button
            onClick={exportData}
            title="Export data as JSON backup"
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download size={14} /> Export
          </button>

          <label
            title="Import data from JSON backup"
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <Upload size={14} /> Import
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </nav>
      </div>
    </header>
  );
}