import {
  addDays,
  diffDays,
  fromISO,
  todayISO,
  weekdayOf,
} from './date';
import { tithiOccursOn } from './panchang';
import type { Completion, Sankalp } from './types';

export const occKey = (sankalpId: string, date: string) => `${sankalpId}::${date}`;

export function completionId(sankalpId: string, date: string) {
  return occKey(sankalpId, date);
}

/** Is this practice scheduled on `iso`? Honours the vow window and status. */
export function occursOn(s: Sankalp, iso: string): boolean {
  if (s.status === 'stopped' || s.status === 'completed') return false;
  if (s.status === 'paused') return false;
  if (iso < s.startedOn) return false;
  if (s.endsOn && iso > s.endsOn) return false;

  const f = s.frequency;
  switch (f.kind) {
    case 'daily':
      return true;
    case 'weekly':
      return f.days.includes(weekdayOf(iso));
    case 'monthly': {
      const d = fromISO(iso);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() === Math.min(f.day, last);
    }
    case 'yearly': {
      const d = fromISO(iso);
      return d.getMonth() + 1 === f.month && d.getDate() === f.day;
    }
    case 'tithi':
      return tithiOccursOn(iso, f.tithi);
    case 'once':
      return iso === f.date;
  }
}

export function scheduledOn(sankalps: Sankalp[], iso: string): Sankalp[] {
  return sankalps
    .filter((s) => occursOn(s, iso))
    .sort((a, b) => {
      const am = a.time ? a.time.start : '99:99';
      const bm = b.time ? b.time.start : '99:99';
      return am.localeCompare(bm) || a.name.localeCompare(b.name);
    });
}

export function isDone(
  completions: Record<string, Completion>,
  sankalpId: string,
  iso: string
): boolean {
  return !!completions[occKey(sankalpId, iso)]?.done;
}

export type DayTally = {
  date: string;
  due: number;
  done: number;
};

export function tallyDay(
  sankalps: Sankalp[],
  completions: Record<string, Completion>,
  iso: string
): DayTally {
  const due = scheduledOn(sankalps, iso);
  const done = due.filter((s) => isDone(completions, s.id, iso)).length;
  return { date: iso, due: due.length, done };
}

/** Consecutive days (ending today or yesterday) where every due practice was done. */
export function currentStreak(
  sankalps: Sankalp[],
  completions: Record<string, Completion>,
  endISO = todayISO()
): number {
  let streak = 0;
  let iso = endISO;
  // A day with nothing due neither breaks nor extends the streak.
  for (let guard = 0; guard < 400; guard++) {
    const t = tallyDay(sankalps, completions, iso);
    if (t.due > 0) {
      if (t.done === t.due) streak++;
      else if (iso === endISO) {
        // today still in progress — look one day back
      } else break;
    }
    iso = addDays(iso, -1);
    if (iso < (sankalps.length ? earliestStart(sankalps) : iso)) break;
  }
  return streak;
}

function earliestStart(sankalps: Sankalp[]): string {
  return sankalps.reduce((m, s) => (s.startedOn < m ? s.startedOn : m), todayISO());
}

export function longestStreak(
  sankalps: Sankalp[],
  completions: Record<string, Completion>,
  from: string,
  to: string
): number {
  let best = 0;
  let run = 0;
  let iso = from;
  while (iso <= to) {
    const t = tallyDay(sankalps, completions, iso);
    if (t.due > 0) {
      if (t.done === t.due) {
        run++;
        best = Math.max(best, run);
      } else run = 0;
    }
    iso = addDays(iso, 1);
  }
  return best;
}

/** 0–1: share of scheduled practices actually completed over a window. */
export function consistency(
  sankalps: Sankalp[],
  completions: Record<string, Completion>,
  from: string,
  to: string
): number {
  let due = 0;
  let done = 0;
  let iso = from;
  while (iso <= to) {
    const t = tallyDay(sankalps, completions, iso);
    due += t.due;
    done += t.done;
    iso = addDays(iso, 1);
  }
  return due === 0 ? 0 : done / due;
}

export function sankalpProgress(
  s: Sankalp,
  completions: Record<string, Completion>,
  asOf = todayISO()
) {
  const start = s.startedOn;
  const end = s.endsOn ?? asOf;
  const totalDays = Math.max(1, diffDays(start, end) + 1);
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(start, asOf) + 1));

  let due = 0;
  let done = 0;
  let iso = start;
  const limit = s.endsOn ? (asOf < s.endsOn ? asOf : s.endsOn) : asOf;
  while (iso <= limit) {
    if (occursOn(s, iso)) {
      due++;
      if (isDone(completions, s.id, iso)) done++;
    }
    iso = addDays(iso, 1);
  }

  // consecutive-day streak for this practice
  let streak = 0;
  let cursor = asOf;
  for (let i = 0; i < 400; i++) {
    if (occursOn(s, cursor)) {
      if (isDone(completions, s.id, cursor)) streak++;
      else if (cursor !== asOf) break;
    }
    cursor = addDays(cursor, -1);
    if (cursor < s.startedOn) break;
  }

  const nextDue = nextOccurrence(s, asOf);
  return {
    totalDays,
    elapsed,
    due,
    done,
    rate: due === 0 ? 0 : done / due,
    streak,
    nextDue,
    dayNumber: Math.min(totalDays, Math.max(1, diffDays(start, asOf) + 1)),
  };
}

export function nextOccurrence(s: Sankalp, from = todayISO()): string | null {
  for (let i = 0; i < 800; i++) {
    const iso = addDays(from, i);
    if (s.endsOn && iso > s.endsOn) return null;
    if (occursOn(s, iso)) return iso;
  }
  return null;
}

/** Upcoming occurrences for the reminder engine, next `hours` ahead. */
export function upcomingWithin(
  sankalps: Sankalp[],
  now: Date,
  withinMinutes: number
): { sankalp: Sankalp; start: Date; key: string }[] {
  const out: { sankalp: Sankalp; start: Date; key: string }[] = [];
  for (const s of sankalps) {
    if (!s.time || !s.reminder.enabled) continue;
    for (let offset = 0; offset <= 1; offset++) {
      const iso = addDays(todayISO(), offset);
      if (!occursOn(s, iso)) continue;
      const [h, m] = s.time.start.split(':').map(Number);
      const start = new Date(fromISO(iso));
      start.setHours(h, m, 0, 0);
      const lead = start.getTime() - s.reminder.leadMinutes * 60_000;
      const delta = lead - now.getTime();
      if (delta >= 0 && delta <= withinMinutes * 60_000) {
        out.push({ sankalp: s, start, key: `${s.id}::${iso}` });
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
