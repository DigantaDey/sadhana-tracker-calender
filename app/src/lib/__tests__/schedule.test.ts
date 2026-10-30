import { beforeEach, describe, expect, it } from 'vitest';
import {
  consistency,
  currentStreak,
  isDone,
  nextOccurrence,
  occursOn,
  occKey,
  sankalpProgress,
  scheduledOn,
  tallyDay,
} from '../schedule';
import { setPanchangLocation } from '../panchang';
import type { Completion, Sankalp } from '../types';

const base: Sankalp = {
  id: 'sk-1',
  name: 'Gāyatrī Japa',
  category: 'japa',
  color: 'saffron',
  glyph: 'ॐ',
  startedOn: '2026-10-01',
  endsOn: '2026-10-10',
  frequency: { kind: 'daily' },
  time: { start: '05:30' },
  targetCount: 108,
  reminder: { enabled: true, leadMinutes: 15, snoozeMinutes: 30 },
  status: 'active',
  createdAt: 0,
};

const make = (patch: Partial<Sankalp>): Sankalp => ({ ...base, ...patch });

beforeEach(() =>
  setPanchangLocation({
    id: 'delhi',
    label: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    timeZone: 'Asia/Kolkata',
  })
);

describe('occurrence engine', () => {
  it('respects the window and the status', () => {
    expect(occursOn(base, '2026-09-30')).toBe(false); // before the vow
    expect(occursOn(base, '2026-10-05')).toBe(true);
    expect(occursOn(base, '2026-10-10')).toBe(true); // last day
    expect(occursOn(base, '2026-10-11')).toBe(false); // after the vow
    expect(occursOn({ ...base, status: 'paused' }, '2026-10-05')).toBe(false);
    expect(occursOn({ ...base, status: 'completed' }, '2026-10-05')).toBe(false);
  });

  it('supports every rhythm', () => {
    const weekly = make({ frequency: { kind: 'weekly', days: [1, 4] } });
    expect(occursOn(weekly, '2026-10-05')).toBe(true); // Monday
    expect(occursOn(weekly, '2026-10-08')).toBe(true); // Thursday
    expect(occursOn(weekly, '2026-10-06')).toBe(false);

    const monthly = make({ frequency: { kind: 'monthly', day: 31 }, endsOn: null });
    expect(occursOn(monthly, '2026-10-31')).toBe(true);
    expect(occursOn(monthly, '2026-11-30')).toBe(true); // clamped to month length

    const yearly = make({ frequency: { kind: 'yearly', month: 10, day: 5 }, endsOn: null });
    expect(occursOn(yearly, '2026-10-05')).toBe(true);
    expect(occursOn(yearly, '2027-10-05')).toBe(true);
    expect(occursOn(yearly, '2027-10-06')).toBe(false);

    const once = make({ frequency: { kind: 'once', date: '2026-10-09' } });
    expect(occursOn(once, '2026-10-09')).toBe(true);
    expect(occursOn(once, '2026-10-10')).toBe(false);
  });

  it('follows the pañcāṅga for tithi vows', () => {
    const ekadashi = make({
      frequency: { kind: 'tithi', tithi: 11 },
      startedOn: '2026-01-01',
      endsOn: null,
    });
    const due: string[] = [];
    for (let i = 0; i < 60; i++) {
      const iso = new Date(Date.UTC(2026, 8, 1) + i * 86_400_000).toISOString().slice(0, 10);
      if (occursOn(ekadashi, iso)) due.push(iso);
    }
    expect(due.length).toBe(2); // one śukla Ekādaśī per lunar month
  });

  it('orders a day by its time window', () => {
    const morning = make({ id: 'a', time: { start: '05:30' } });
    const evening = make({ id: 'b', time: { start: '19:45' } });
    const anytime = make({ id: 'c', time: null });
    const list = scheduledOn([evening, anytime, morning], '2026-10-05');
    expect(list.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('marks and tallies', () => {
  const completions: Record<string, Completion> = {
    [occKey('sk-1', '2026-10-03')]: {
      id: occKey('sk-1', '2026-10-03'),
      sankalpId: 'sk-1',
      date: '2026-10-03',
      done: true,
      updatedAt: 0,
    },
  };

  it('reads a mark', () => {
    expect(isDone(completions, 'sk-1', '2026-10-03')).toBe(true);
    expect(isDone(completions, 'sk-1', '2026-10-04')).toBe(false);
  });

  it('counts a day', () => {
    expect(tallyDay([base], completions, '2026-10-03')).toEqual({
      date: '2026-10-03',
      due: 1,
      done: 1,
    });
  });

  it('counts a streak ending today, and tolerates an unfinished today', () => {
    const marks = (dates: string[]) => {
      const out: Record<string, Completion> = {};
      for (const d of dates)
        out[occKey('sk-1', d)] = {
          id: occKey('sk-1', d),
          sankalpId: 'sk-1',
          date: d,
          done: true,
          updatedAt: 0,
        };
      return out;
    };
    const c = marks(['2026-10-06', '2026-10-05', '2026-10-04']);
    expect(currentStreak([base], c, '2026-10-06')).toBe(3);
    // today not yet marked: yesterday's run still counts
    expect(currentStreak([base], c, '2026-10-07')).toBe(3);
    // a gap breaks it
    expect(currentStreak([base], marks(['2026-10-06', '2026-10-04']), '2026-10-06')).toBe(1);
  });

  it('computes progress and the next due day', () => {
    const progress = sankalpProgress(base, completions, '2026-10-03');
    expect(progress.dayNumber).toBe(3);
    expect(progress.due).toBe(3);
    expect(progress.done).toBe(1);
    expect(progress.totalDays).toBe(10);
    expect(nextOccurrence(base, '2026-10-05')).toBe('2026-10-05');
    expect(nextOccurrence({ ...base, endsOn: '2026-10-04' }, '2026-10-05')).toBeNull();
  });

  it('measures consistency over a window', () => {
    expect(consistency([base], completions, '2026-10-03', '2026-10-03')).toBe(1);
    expect(consistency([base], completions, '2026-10-03', '2026-10-04')).toBe(0.5);
    expect(consistency([], completions, '2026-10-03', '2026-10-04')).toBe(0);
  });
});
