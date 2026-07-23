export type DayStatus = 'wfo' | 'wfh' | 'sick' | 'annual' | 'none';

export type Region = 'west' | 'east' | 'north' | 'south' | 'south_chennai';

export const REGION_LABELS: Record<Region, string> = {
  west: 'West (Mumbai, Pune, Ahmedabad, Goa)',
  east: 'East (Kolkata, Patna, Guwahati, Bhubaneswar)',
  north: 'North (Delhi, Jaipur)',
  south: 'South (Hyderabad, Bangalore & Others)',
  south_chennai: 'South Chennai',
};

export interface DayEntry {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  note?: string;
}

export interface PublicHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  regions: Region[];
  isCustom?: boolean;
}

export interface Cycle {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

export interface AppData {
  entries: Record<string, DayEntry>;
  customHolidays: PublicHoliday[];
  deletedHolidayIds: string[];
  selectedRegion: Region;
  cycleAnchorDate: string; // YYYY-MM-DD  →  default: 2026-07-20
  lastModified: string;
}