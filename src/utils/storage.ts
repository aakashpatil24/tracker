import type {
  AppData,
  AppMode,
  DayEntry,
  DayStatus,
  PublicHoliday,
  Region,
} from '../types';
import { REGION_LABELS } from '../types';
import { CARRY_FORWARD_MAX_BALANCE } from '../context/attendanceCore';
import { formatDate } from './dateUtils';

export const CYCLE_KEY = 'oa-tracker-v1';
export const QUARTER_KEY = 'oa-tracker-quarter-v1';
const MODE_KEY = 'oa-tracker-mode';
const BACKUP_KEY_PREFIX = 'oa-tracker-last-backup-';
const KEY_PREFIX = 'oa-tracker';

/** Bump when the stored shape changes and add a step to `migrate`. */
export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const storageKeyFor = (mode: AppMode): string =>
  mode === 'quarter' ? QUARTER_KEY : CYCLE_KEY;

// localStorage can throw (disabled storage, Safari private mode, quota)
const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error('Storage write failed:', e);
    return false;
  }
};

export const loadMode = (): AppMode =>
  safeGet(MODE_KEY) === 'quarter' ? 'quarter' : 'cycle';

export const saveMode = (m: AppMode): boolean => safeSet(MODE_KEY, m);

export const createDefaultData = (): AppData => ({
  schemaVersion: SCHEMA_VERSION,
  entries: {},
  customHolidays: [],
  deletedHolidayIds: [],
  selectedRegion: 'south',
  cycleAnchorDate: '2026-07-20',
  annualCarryForwardSeed: {},
  expectedOverride: {},
  lastModified: new Date().toISOString(),
});

// ── Validation / migration ───────────────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const STATUSES: readonly DayStatus[] = ['wfo', 'wfh', 'sick', 'annual', 'none'];
const REGIONS = Object.keys(REGION_LABELS) as Region[];

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const isDate = (v: unknown): v is string =>
  typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

const sanitizeEntries = (raw: unknown): Record<string, DayEntry> => {
  const out: Record<string, DayEntry> = {};
  if (!isObj(raw)) return out;
  for (const [date, e] of Object.entries(raw)) {
    if (!isDate(date) || !isObj(e)) continue;
    const status = STATUSES.includes(e.status as DayStatus)
      ? (e.status as DayStatus)
      : 'none';
    const note =
      typeof e.note === 'string' && e.note.trim() ? e.note : undefined;
    if (status === 'none' && !note) continue;
    out[date] = note ? { date, status, note } : { date, status };
  }
  return out;
};

const sanitizeHolidays = (raw: unknown): PublicHoliday[] =>
  Array.isArray(raw)
    ? raw.flatMap((h): PublicHoliday[] => {
      if (
        !isObj(h) ||
        typeof h.id !== 'string' ||
        !isDate(h.date) ||
        typeof h.name !== 'string' ||
        !h.name.trim()
      )
        return [];
      const regions = Array.isArray(h.regions)
        ? h.regions.filter((r): r is Region => REGIONS.includes(r as Region))
        : [];
      if (!regions.length) return [];
      return [
        { id: h.id, date: h.date, name: h.name.trim(), regions, isCustom: true },
      ];
    })
    : [];

// Keys are validated by pattern, which also blocks "__proto__"-style keys
const sanitizeCounts = (
  raw: unknown,
  keyRe: RegExp,
  max = Number.MAX_SAFE_INTEGER,
): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (keyRe.test(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0)
      out[k] = Math.min(max, Math.floor(v));
  }
  return out;
};

/** Turn any stored/imported JSON into a valid, current-schema AppData. */
export const migrate = (raw: unknown): AppData => {
  const p = isObj(raw) ? raw : {};
  const d = createDefaultData();
  // v0 (no schemaVersion) → v1: same shape, defaults filled in by sanitizing
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: sanitizeEntries(p.entries),
    customHolidays: sanitizeHolidays(p.customHolidays),
    deletedHolidayIds: Array.isArray(p.deletedHolidayIds)
      ? p.deletedHolidayIds.filter((x): x is string => typeof x === 'string')
      : [],
    selectedRegion: REGIONS.includes(p.selectedRegion as Region)
      ? (p.selectedRegion as Region)
      : d.selectedRegion,
    cycleAnchorDate: isDate(p.cycleAnchorDate)
      ? p.cycleAnchorDate
      : d.cycleAnchorDate,
    annualCarryForwardSeed: sanitizeCounts(
      p.annualCarryForwardSeed,
      YEAR_RE,
      CARRY_FORWARD_MAX_BALANCE,
    ),
    expectedOverride: sanitizeCounts(p.expectedOverride, DATE_RE),
    lastModified:
      typeof p.lastModified === 'string' ? p.lastModified : d.lastModified,
  };
};

// ── Persistence ──────────────────────────────────────────────────────────────
/** Parse a raw stored string; a corrupt value is kept aside so it isn't overwritten. */
export const parseStored = (raw: string | null, key: string): AppData => {
  if (!raw) return createDefaultData();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    safeSet(`${key}-corrupt-${Date.now()}`, raw);
    return createDefaultData();
  }
};

export const loadFromStorage = (key: string = CYCLE_KEY): AppData =>
  parseStored(safeGet(key), key);

/** Returns false when the browser refused the write (quota / disabled storage). */
export const saveToStorage = (
  data: AppData,
  key: string = CYCLE_KEY,
): boolean =>
  safeSet(
    key,
    JSON.stringify({ ...data, lastModified: new Date().toISOString() }),
  );

// ── Backup / restore ─────────────────────────────────────────────────────────
const downloadJson = (payload: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const getLastBackup = (mode: AppMode): string | null =>
  safeGet(BACKUP_KEY_PREFIX + mode);

export const exportToJson = (data: AppData, mode: AppMode = 'cycle'): void => {
  const prefix = mode === 'quarter' ? 'quarter' : 'attendance';
  downloadJson(
    { ...data, exportedMode: mode },
    `${prefix}-backup-${formatDate(new Date())}.json`,
  );
  safeSet(BACKUP_KEY_PREFIX + mode, new Date().toISOString());
};

/** Emergency export of everything this app stored, as raw strings (used by the error screen). */
export const exportRawStorage = (): void => {
  const dump: Record<string, string | null> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) dump[k] = localStorage.getItem(k);
    }
  } catch {
    /* storage unavailable: export what we have */
  }
  downloadJson(dump, `tracker-raw-${formatDate(new Date())}.json`);
};

/** Remove everything this app stored (last-resort recovery from the error screen). */
export const clearAppStorage = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clear */
  }
};

export interface ImportResult {
  data: AppData;
  exportedMode?: AppMode;
}

export const parseImportFile = async (file: File): Promise<ImportResult> => {
  if (file.size > MAX_IMPORT_BYTES)
    throw new Error('File is too large to be an attendance backup (max 5 MB)');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid JSON');
  }
  if (!isObj(parsed) || !isObj(parsed.entries))
    throw new Error('Not a valid attendance backup file');
  if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > SCHEMA_VERSION)
    throw new Error('This backup was created by a newer version of the app');
  const exportedMode =
    parsed.exportedMode === 'cycle' || parsed.exportedMode === 'quarter'
      ? parsed.exportedMode
      : undefined;
  return { data: migrate(parsed), exportedMode };
};