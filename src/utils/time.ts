export const MIN = 60;

export function minutesToHM(minutes: number): { h: number; m: number } {
  const m = Math.round(minutes);
  return { h: Math.floor(m / 60), m: m % 60 };
}

export function formatMinutes(minutes: number, use24 = false): string {
  const { h, m } = minutesToHM(minutes);
  const mm = m.toString().padStart(2, '0');
  if (use24) return `${h.toString().padStart(2, '0')}:${mm}`;
  const period = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${mm} ${period}`;
}

export function parseTimeStr(value: string, use24 = false): number | null {
  const v = value.trim();
  if (!v) return null;
  if (use24) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (h > 23 || mm > 59) return null;
    return h * 60 + mm;
  }
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/i.exec(v);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = (m[3] || '').toLowerCase();
  if (h > 12 || mm > 59) return null;
  if (suffix.startsWith('a') && h === 12) h = 0;
  if (suffix.startsWith('p') && h !== 12) h += 12;
  if (!suffix && h === 12) h = 12;
  if (!suffix && h > 12) h = 0;
  return h * 60 + mm;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function diffDays(a: string, b: string): number {
  const da = parseDateKey(a).getTime();
  const db = parseDateKey(b).getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toISO(d: Date): string {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 10);
}

export function dateLabel(key: string): string {
  const d = parseDateKey(key);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function weekdayName(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'long' });
}

export function weekdayShort(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'short' });
}

export function monthDay(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function shortDate(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function durationLabel(start: number, end: number): string {
  const d = end - start;
  if (d < 60) return `${d}m`;
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToTimeInput(minutes: number): string {
  const { h, m } = minutesToHM(minutes);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeInputToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function snapToInterval(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

export function monthMatrix(year: number, month: number): { key: string; day: number }[][] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: { key: string; day: number }[][] = [];
  let cells: { key: string; day: number }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ key: '', day: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ key: formatDateKey(dt), day: d });
    if (cells.length === 7) {
      weeks.push(cells);
      cells = [];
    }
  }
  while (cells.length > 0 && cells.length < 7) cells.push({ key: '', day: 0 });
  if (cells.length) weeks.push(cells);
  return weeks;
}