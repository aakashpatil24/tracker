import type { Cycle } from '../types';

const CYCLE_LENGTH = 28; // 4 weeks exactly
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function pad(n: number) { return String(n).padStart(2, '0'); }

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isWeekend(s: string): boolean {
  const day = parseDate(s).getDay();
  return day === 0 || day === 6;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function formatDisplayShort(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayLabel(s: string): string {
  const d = parseDate(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getMonthYearLabel(s: string): string {
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Cycle generation ──────────────────────────────────────
export function generateCycles(anchorDate: string): Cycle[] {
  const BACK = 30, FORWARD = 30;
  const anchor = parseDate(anchorDate);
  const cycles: Cycle[] = [];
  let start = addDays(anchor, -(BACK * CYCLE_LENGTH));

  for (let i = 0; i <= BACK + FORWARD; i++) {
    const end = addDays(start, CYCLE_LENGTH - 1);
    const s = formatDate(start);
    const e = formatDate(end);
    cycles.push({
      id: s,
      startDate: s,
      endDate: e,
      label: `${formatDisplayShort(s)} to ${formatDisplayShort(e)}`,
    });
    start = addDays(start, CYCLE_LENGTH);
  }
  return cycles;
};

export const getCurrentCycle = (cycles: Cycle[]): Cycle | undefined => {
  const today = todayStr();
  return cycles.find(c => c.startDate <= today && c.endDate >= today);
};

export const getDaysInCycle = (cycle: Cycle): string[] => {
  const days: string[] = [];
  let cur = parseDate(cycle.startDate);
  for (let i = 0; i < CYCLE_LENGTH; i++) {
    days.push(formatDate(cur));
    cur = addDays(cur, 1);
  }
  return days;
};

// Returns weeks as Mon-indexed rows; null = padding outside cycle
export const getCalendarWeeks = (cycle: Cycle): (string | null)[][] => {
  const days = getDaysInCycle(cycle);
  const startDow = (parseDate(cycle.startDate).getDay() + 6) % 7; // Mon=0

  const weeks: (string | null)[][] = [];
  let dayIdx = 0;
  let row: (string | null)[] = Array(startDow).fill(null);
  let col = startDow;

  while (dayIdx < days.length) {
    row.push(days[dayIdx++]);
    col++;
    if (col === 7) { weeks.push(row); row = []; col = 0; }
  }
  if (row.length) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }
  return weeks;
};

export const getAvailableYears = (cycles: Cycle[]): number[] => {
  const s = new Set(cycles.map(c => parseDate(c.startDate).getFullYear()));
  return Array.from(s).sort((a, b) => a - b);
};

export const getCyclesForYear = (cycles: Cycle[], year: number): Cycle[] => {
  return cycles.filter(c => parseDate(c.startDate).getFullYear() === year);
};