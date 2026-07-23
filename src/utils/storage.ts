import type { AppData } from '../types';

const KEY = 'oa-tracker-v1';

export const DEFAULT_DATA: AppData = {
  entries: {},
  customHolidays: [],
  deletedHolidayIds: [],
  selectedRegion: 'south',
  cycleAnchorDate: '2026-07-20',
  lastModified: new Date().toISOString(),
};

export function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const p = JSON.parse(raw) as Partial<AppData>;
    return {
      ...DEFAULT_DATA, ...p,
      entries:           p.entries           ?? {},
      customHolidays:    p.customHolidays    ?? [],
      deletedHolidayIds: p.deletedHolidayIds ?? [],
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, lastModified: new Date().toISOString() }));
  } catch (e) { console.error('Storage write failed:', e); }
}

export function exportToJson(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<AppData> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => { try { res(JSON.parse(e.target?.result as string)); } catch { rej(new Error('Invalid JSON')); } };
    reader.onerror = () => rej(new Error('Cannot read file'));
    reader.readAsText(file);
  });
}