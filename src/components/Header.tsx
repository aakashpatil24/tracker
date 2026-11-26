import React, { useRef, useState } from "react";
import { TrackerLogo, CalendarDays, Flag, Download, Upload } from "./Icons";
import { useAttendance } from "../context/attendanceCore";
import { useToast } from "../context/toastCore";
import ConfirmDialog from "./ConfirmDialog";

type Page = "dashboard" | "holidays";
interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  onToggleMode: () => void;
}

const NavBtn = ({
  page,
  current,
  onNavigate,
  label,
  icon,
}: {
  page: Page;
  current: Page;
  onNavigate: (p: Page) => void;
  label: string;
  icon: React.ReactNode;
}) => (
  <button
    onClick={() => onNavigate(page)}
    aria-label={label}
    aria-current={current === page ? "page" : undefined}
    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      current === page
        ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20"
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Header = ({ currentPage, onNavigate, onToggleMode }: Props) => {
  const { exportData, importData, mode } = useAttendance();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    // reset so picking the same file again still fires onChange
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    try {
      await importData(file);
      toast("Data imported successfully.", "success");
    } catch (err) {
      toast(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    }
  };

  const handleExport = () => {
    exportData();
    toast("Backup downloaded.", "success");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="bg-amber-400 text-zinc-900 p-2 rounded-xl shrink-0 shadow-[0_0_20px_-4px] shadow-amber-400/40">
            <TrackerLogo size={20} />
          </div>
          <div className="leading-tight min-w-0 hidden min-[480px]:block">
            <p className="font-semibold text-zinc-100 text-sm truncate">
              Attendance Tracker
            </p>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              {mode === "quarter"
                ? "Quarterly Compliance"
                : "4-Week Compliance Cycle"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavBtn
            page="dashboard"
            current={currentPage}
            onNavigate={onNavigate}
            label="Dashboard"
            icon={<CalendarDays size={15} />}
          />
          <NavBtn
            page="holidays"
            current={currentPage}
            onNavigate={onNavigate}
            label="Holidays"
            icon={<Flag size={15} />}
          />

          <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-2" />

          <button
            onClick={onToggleMode}
            role="switch"
            aria-checked={mode === "quarter"}
            aria-label="Quarter mode"
            title="Switch between 28-day cycle (leave tracking) and quarterly mode"
            className="flex items-center rounded-lg bg-zinc-800 p-0.5 text-xs font-medium"
          >
            <span
              className={`px-1.5 sm:px-2 py-1 rounded-md transition-colors ${
                mode === "cycle"
                  ? "bg-amber-400 text-zinc-900"
                  : "text-zinc-400"
              }`}
            >
              Cycle
            </span>
            <span
              className={`px-1.5 sm:px-2 py-1 rounded-md transition-colors ${
                mode === "quarter"
                  ? "bg-amber-400 text-zinc-900"
                  : "text-zinc-400"
              }`}
            >
              Quarter
            </span>
          </button>

          <button
            onClick={handleExport}
            aria-label="Export backup"
            title="Export data as JSON backup"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          <label
            title="Import data from JSON backup"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-amber-400/60"
          >
            <Upload size={14} />
            <span className="hidden md:inline">Import</span>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              aria-label="Import backup"
              className="sr-only"
              onChange={handleFilePicked}
            />
          </label>
        </nav>
      </div>

      {pendingFile && (
        <ConfirmDialog
          title="Replace all data?"
          message={`Importing replaces ALL current ${mode}-mode data with the contents of "${pendingFile.name}". Consider exporting a backup first.`}
          confirmLabel="Import"
          danger
          onConfirm={confirmImport}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </header>
  );
};

export default Header;
