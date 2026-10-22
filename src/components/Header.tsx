import React, { useRef } from "react";
import { TrackerLogo, CalendarDays, Flag, Download, Upload } from "./Icons";
import { useAttendance } from "../context/AttendanceContext";

type Page = "dashboard" | "holidays";
interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
}

const Header = ({ currentPage, onNavigate }: Props) => {
  const { exportData, importData } = useAttendance();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importData(file);
      alert("Data imported successfully.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert("Import failed: " + err.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const NavBtn = ({
    page,
    label,
    icon,
  }: {
    page: Page;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        currentPage === page
          ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="bg-amber-400 text-zinc-900 p-2 rounded-xl shrink-0 shadow-[0_0_20px_-4px] shadow-amber-400/40">
            <TrackerLogo size={20} />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-semibold text-zinc-100 text-sm truncate">
              Attendance Tracker
            </p>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              4-Week Compliance Cycle
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavBtn
            page="dashboard"
            label="Dashboard"
            icon={<CalendarDays size={15} />}
          />
          <NavBtn page="holidays" label="Holidays" icon={<Flag size={15} />} />

          <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-2" />

          <button
            onClick={exportData}
            title="Export data as JSON backup"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          <label
            title="Import data from JSON backup"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Upload size={14} />
            <span className="hidden md:inline">Import</span>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </nav>
      </div>
    </header>
  );
};

export default Header;