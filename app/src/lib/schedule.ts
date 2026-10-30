// ── The occurrence engine ────────────────────────────────────────────────────
//
// One pure predicate — `occursOn(sankalp, date)` — decides whether a vow is due
// on a day. The calendar, the streak, the insights and the reminders all call
// it, so they can never disagree with each other.
//
// It is called a lot: a year view is 365 days × every vow. Results are memoised
// per sankalp object (a `WeakMap`, so an edited vow gets a fresh cache and the
// old one is collected with the object).

import {
  addDays,
  diffDays,
  fromISO,
  todayISO,
  weekdayOf,
} from './date';
import { tithiObservanceOn } from './panchang';
import type { Completion, Sankalp } from './types';

export const occKey = (sankalpId: string, date: string) => `${sankalpId}::${date}`;

export function completionId(sankalpId: string, date: string) {
  return occKey(sankalpId, date);
}

const occurrenceCache = new WeakMap<Sankalp, Map<string, boolean>>();
const OCCURRENCE_CACHE_LIMIT = 4096;

/** Is this practice scheduled on `iso`? Honours the vow window and status. */
export function occursOn(s: Sankalp, iso: string): boolean {
  let cache = occurrenceCache.get(s);
  if (!cache) {
    cache = new Map();
    occurrenceCache.set(s, cache);
  }
  const hit = cache.get(iso);
  if (hit !== undefined) return hit;

  const value = computeOccursOn(s, iso);
  if (cache.size >= OCCURRENCE_CACHE_LIMIT) cache.clear();
  cache.set(iso, value);
  return value;
}

function computeOccursOn(s: Sankalp, iso: string): boolean {
  // A finished vow keeps its history but is never due again.
  if (s.status !== 'active') return false;
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
      return tithiObservanceOn(iso, f.tithi);
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
  let due = 0;
  let done = 0;
  for (const s of sankalps) {
    if (!occursOn(s, iso)) continue;
    due++;
    if (isDone(completions, s.id, iso)) done++;
  }
  return { date: iso, due, done };
}

/** Consecutive days (ending today or yesterday) where every due practice was done. */
export function currentStreak(
  sankalps: Sankalp[],
  completions: Record<string, Completion>,
  endISO = todayISO()
): number {
  let streak = 0;
  let iso = endISO;
  const floor = earliestStart(sankalps);

  for (let guard = 0; guard < 400; guard++) {
    const t = tallyDay(sankalps, completions, iso);
    if (t.due > 0) {
      if (t.done === t.due) streak++;
      else if (iso !== endISO) break;
      // today is still in progress: it neither extends nor breaks the streak
    }
    if (iso <= floor) break;
    iso = addDays(iso, -1);
  }
  return streak;
}

function earliestStart(sankalps: Sankalp[]): string {
  return sankalps.reduce(
    (m, s) => (s.startedOn < m ? s.startedOn : m),
    sankalps.length ? sankalps[0].startedOn : todayISO()
  );
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

export type SankalpProgress = {
  totalDays: number;
  elapsed: number;
  due: number;
  done: number;
  rate: number;
  streak: number;
  nextDue: string | null;
  dayNumber: number;
};

export function sankalpProgress(
  s: Sankalp,
  completions: Record<string, Completion>,
  asOf = todayISO()
): SankalpProgress {
  const start = s.startedOn;
  const end = s.endsOn ?? asOf;
  const totalDays = Math.max(1, diffDays(start, end) + 1);
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(start, asOf) + 1));

  let due = 0;
  let done = 0;
  let iso = start;
  const limit = s.endsOn && asOf > s.endsOn ? s.endsOn : asOf;
  while (iso <= limit) {
    if (occursOn(s, iso)) {
      due++;
      if (isDone(completions, s.id, iso)) done++;
    }
    iso = addDays(iso, 1);
  }

  // consecutive days kept, for this practice alone
  let streak = 0;
  let cursor = asOf;
  for (let i = 0; i < 400; i++) {
    if (occursOn(s, cursor)) {
      if (isDone(completions, s.id, cursor)) streak++;
      else if (cursor !== asOf) break;
    }
    if (cursor <= s.startedOn) break;
    cursor = addDays(cursor, -1);
  }

  return {
    totalDays,
    elapsed,
    due,
    done,
    rate: due === 0 ? 0 : done / due,
    streak,
    nextDue: s.status === 'active' ? nextOccurrence(s, asOf) : null,
    dayNumber: Math.min(totalDays, Math.max(1, diffDays(start, asOf) + 1)),
  };
}

/** Days until the vow is due again, inclusive of today. */
export function daysUntil(n: string, from = todayISO()): number {
  return diffDays(from, n);
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
  const today = todayISO();
  for (const s of sankalps) {
    if (!s.time || !s.reminder.enabled || s.status !== 'active') continue;
    for (let offset = 0; offset <= 1; offset++) {
      const iso = addDays(today, offset);
      if (!occursOn(s, iso)) continue;
      const [h, m] = s.time.start.split(':').map(Number);
      const start = new Date(fromISO(iso));
      start.setHours(h, m, 0, 0);
      const lead = start.getTime() - s.reminder.leadMinutes * 60_000;
      const delta = lead - now.getTime();
      if (delta >= 0 && delta <= withinMinutes * 60_000) {
        out.push({ sankalp: s, start, key: occKey(s.id, iso) });
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
