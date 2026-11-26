import { useState } from "react";
import { useAttendance } from "../context/attendanceCore";
import { parseDate } from "../utils/dateUtils";
import { X } from "./Icons";

const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 86_400_000;

/** App-wide warnings: failed saves (persistent) and an overdue-backup reminder (dismissible). */
const StatusBanners = () => {
  const { saveFailed, lastBackup, data, exportData, today } = useAttendance();
  const [backupDismissed, setBackupDismissed] = useState(false);

  const hasData = Object.keys(data.entries).length > 0;
  const daysSinceBackup = lastBackup
    ? Math.floor(
        (parseDate(today).getTime() - new Date(lastBackup).getTime()) / DAY_MS,
      )
    : null;
  const backupDue =
    hasData &&
    !backupDismissed &&
    (daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_DAYS);

  if (!saveFailed && !backupDue) return null;

  return (
    <div className="space-y-2 mb-4">
      {saveFailed && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          <strong>Your changes could not be saved</strong> — browser storage is
          full or disabled. Export a backup now so you don&apos;t lose data.{" "}
          <button
            onClick={exportData}
            className="underline font-semibold hover:text-rose-100"
          >
            Export backup
          </button>
        </div>
      )}
      {backupDue && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300 flex items-start gap-3">
          <p className="flex-1">
            Your data lives only in this browser.{" "}
            {daysSinceBackup === null
              ? "You haven't exported a backup yet."
              : `Last backup was ${daysSinceBackup} days ago.`}{" "}
            <button
              onClick={exportData}
              className="text-amber-400 font-semibold hover:underline"
            >
              Export backup
            </button>
          </p>
          <button
            onClick={() => setBackupDismissed(true)}
            aria-label="Dismiss backup reminder"
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-200"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusBanners;
