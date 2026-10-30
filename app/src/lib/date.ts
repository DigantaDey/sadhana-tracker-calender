// ── Date helpers. All dates are local, formatted YYYY-MM-DD ──────────────────

export const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Sunday */
export function weekdayOf(iso: string): number {
  return fromISO(iso).getDay();
}

export function startOfWeek(iso: string, mondayFirst = true): string {
  const wd = weekdayOf(iso);
  const shift = mondayFirst ? (wd + 6) % 7 : wd;
  return addDays(iso, -shift);
}

export function isWeekend(iso: string): boolean {
  const wd = weekdayOf(iso);
  return wd === 0 || wd === 6;
}

export const WEEKDAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export function weekdayLabels(mondayFirst: boolean): string[] {
  return mondayFirst ? WEEKDAYS_MON : WEEKDAYS_SUN;
}

/** Single-letter column headers, in the user's week order. */
export function isoWeekdayLabels(mondayFirst: boolean): string[] {
  return mondayFirst
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
}

export function formatLong(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS_SUN[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShort(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Suprabhātam';
  if (h < 17) return 'Namaste';
  if (h < 21) return 'Śubh sandhyā';
  return 'Śubh rātri';
}

export function clockLabel(now = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** "05:30" → 330 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** 5:30 am · 6:00 pm */
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hr} ${suffix}` : `${hr}:${pad(m)} ${suffix}`;
}

export function prettyWindow(t: { start: string; end?: string } | null): string {
  if (!t) return 'Anytime';
  return t.end ? `${prettyTime(t.start)} – ${prettyTime(t.end)}` : prettyTime(t.start);
}

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.round((ts - now) / 60000);
  if (Math.abs(diff) < 1) return 'now';
  if (diff > 0) {
    if (diff < 60) return `in ${diff} min`;
    if (diff < 1440) return `in ${Math.round(diff / 60)} hr`;
    return `in ${Math.round(diff / 1440)} d`;
  }
  const a = -diff;
  if (a < 60) return `${a} min ago`;
  if (a < 1440) return `${Math.round(a / 60)} hr ago`;
  return `${Math.round(a / 1440)} d ago`;
}

export function lastNDays(n: number, endISO = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endISO, -i));
  return out;
}
