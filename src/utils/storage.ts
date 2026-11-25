import type { AppData, AppMode } from '../types';
import { formatDate } from './dateUtils';

const KEY = 'oa-tracker-v1';
export const QUARTER_KEY = 'oa-tracker-quarter-v1';
const MODE_KEY = 'oa-tracker-mode';

export const loadMode = (): AppMode =>
  localStorage.getItem(MODE_KEY) === 'quarter' ? 'quarter' : 'cycle';

export const saveMode = (m: AppMode): void => {
  try { localStorage.setItem(MODE_KEY, m); } catch (e) { console.error('Storage write failed:', e); }
};

export const DEFAULT_DATA: AppData = {
  entries: {},
  customHolidays: [],
  deletedHolidayIds: [],
  selectedRegion: 'south',
  cycleAnchorDate: '2026-07-20',
  annualCarryForwardSeed: {},
  lastModified: new Date().toISOString(),
};

const normalize = (p: Partial<AppData>): AppData => ({
  ...DEFAULT_DATA, ...p,
  entries: p.entries ?? {},
  customHolidays: p.customHolidays ?? [],
  deletedHolidayIds: p.deletedHolidayIds ?? [],
  annualCarryForwardSeed: p.annualCarryForwardSeed ?? {},
  expectedOverride: p.expectedOverride ?? {},
});

export const loadFromStorage = (key: string = KEY): AppData => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_DATA };
    return normalize(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return { ...DEFAULT_DATA };
  }
};

export const saveToStorage = (data: AppData, key: string = KEY): void => {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, lastModified: new Date().toISOString() }));
  } catch (e) { console.error('Storage write failed:', e); }
};

export const exportToJson = (data: AppData, mode: AppMode = 'cycle'): void => {
  const payload: AppData = { ...data, exportedMode: mode };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const prefix = mode === 'quarter' ? 'quarter' : 'attendance';
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `${prefix}-backup-${formatDate(new Date())}.json`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseImportFile = (file: File): Promise<AppData> => {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      let parsed: unknown;
      try { parsed = JSON.parse(e.target?.result as string); } catch { rej(new Error('Invalid JSON')); return; }
      const p = parsed as Partial<AppData> | null;
      if (!p || typeof p !== 'object' || Array.isArray(p) || !p.entries || typeof p.entries !== 'object') {
        rej(new Error('Not a valid attendance backup file'));
        return;
      }
      res(normalize(p));
    };
    reader.onerror = () => rej(new Error('Cannot read file'));
    reader.readAsText(file);
  });
};