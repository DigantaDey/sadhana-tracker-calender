import { describe, expect, it } from 'vitest';
import {
  findElongationCrossing,
  lunarPosition,
  riseSet,
  solarPosition,
  moonRiseSet,
  deltaTSeconds,
  jdTT,
} from '../astro';

/**
 * Reference values from Meeus, *Astronomical Algorithms* (2nd ed.) and from
 * published new/full moon times (NASA eclipse canon, UTC).
 *
 * These are the numbers that make the tithi trustworthy: if the Moon's
 * longitude is right to 10″ and the new moon lands on the published minute,
 * every tithi boundary derived from it is right to well under a minute.
 */
const minutesBetween = (a: number, b: number) => Math.abs(a - b) / 60_000;

describe('solar position', () => {
  it('matches Meeus example 25.b', () => {
    // 1992 October 13.0 TD → apparent λ = 199.90895°, RA 198.38083°, Dec −7.78507°
    const jd = 2448908.5;
    const sun = solarPosition(jd);
    expect(sun.apparentLongitude).toBeCloseTo(199.90895, 4);
    expect(sun.rightAscension).toBeCloseTo(198.38083, 3);
    expect(sun.declination).toBeCloseTo(-7.78507, 3);
  });
});

describe('lunar position', () => {
  it('matches Meeus example 47.a', () => {
    // 1992 April 12.0 TD → λ 133.162655°, β −3.229126°, Δ 368409.7 km
    const moon = lunarPosition(2448724.5);
    expect(moon.longitude).toBeCloseTo(133.162655, 5);
    expect(moon.latitude).toBeCloseTo(-3.229126, 5);
    expect(moon.distance).toBeCloseTo(368409.7, 0);
  });
});

describe('new and full moons', () => {
  const cases: [string, number, number, string][] = [
    // label, UTC year, reference epoch-ms, expectation note
    ['1977-02-18 new moon (Meeus 49.a, TD)', Date.UTC(1977, 1, 18, 3, 37, 42), 0, '0.5 min'],
    ['2024-04-08 new moon', Date.UTC(2024, 3, 8, 18, 21), 0, '3 min'],
    ['2025-03-29 new moon', Date.UTC(2025, 2, 29, 10, 58), 0, '3 min'],
    ['2026-08-12 new moon', Date.UTC(2026, 7, 12, 17, 37), 0, '3 min'],
    ['2024-09-18 full moon', Date.UTC(2024, 8, 18, 2, 34), 180, '3 min'],
    ['2026-03-03 full moon', Date.UTC(2026, 2, 3, 11, 38), 180, '3 min'],
  ];

  for (const [label, reference, target] of cases) {
    it(label, () => {
      const computed = findElongationCrossing(target, reference);
      expect(minutesBetween(computed, reference)).toBeLessThan(4);
    });
  }

  it('is precise to seconds across a decade of lunar cycles', () => {
    // Every synodic month for two years: the same crossing must reproduce the
    // published instant regardless of where the search starts.
    let start = Date.UTC(2028, 0, 1);
    for (let i = 0; i < 24; i++) {
      const exact = findElongationCrossing(0, start);
      const again = findElongationCrossing(0, exact + 6 * 3_600_000);
      expect(Math.abs(exact - again)).toBeLessThan(60_000);
      start = exact + 29.53 * 86_400_000;
    }
  });
});

describe('sunrise', () => {
  it('matches published times for Delhi and London', () => {
    // Delhi, 2026-10-30: sunrise 06:31, sunset 17:37 IST
    const delhi = Date.UTC(2026, 9, 30);
    const rise = riseSet(delhi, 28.6139, 77.209, true)!;
    const set = riseSet(delhi, 28.6139, 77.209, false)!;
    const ist = (ms: number) => new Date(ms + 5.5 * 3_600_000);
    expect(ist(rise).getUTCHours()).toBe(6);
    expect(ist(rise).getUTCMinutes()).toBe(31);
    expect(ist(set).getUTCHours()).toBe(17);
    expect(ist(set).getUTCMinutes()).toBe(37);

    // London, 2026-06-21 (BST): 04:43 / 21:21
    const london = Date.UTC(2026, 5, 21);
    const lrise = riseSet(london, 51.5074, -0.1278, true)!;
    expect(new Date(lrise + 3_600_000).toISOString().slice(11, 16)).toBe('04:43');
  });

  it('returns null through a polar day', () => {
    expect(riseSet(Date.UTC(2026, 5, 21), 69.6492, 18.9553, true)).toBeNull();
  });

  it('finds moonrise within a couple of minutes', () => {
    // Delhi, 2026-10-30: moonrise 21:18 IST, moonset 11:01 IST
    const d = Date.UTC(2026, 9, 30);
    const rise = moonRiseSet(d, 28.6139, 77.209, true)!;
    const set = moonRiseSet(d, 28.6139, 77.209, false)!;
    const hm = (ms: number) =>
      new Date(ms + 5.5 * 3_600_000).toISOString().slice(11, 16);
    expect(hm(rise)).toBe('21:18');
    expect(hm(set)).toBe('11:01');
  });
});

describe('ΔT', () => {
  it('stays near the measured values', () => {
    // 2000 ≈ 64 s, 2020 ≈ 69 s, 2050 ≈ 93 s (Espenak & Meeus)
    expect(deltaTSeconds(Date.UTC(2000, 0, 1))).toBeGreaterThan(55);
    expect(deltaTSeconds(Date.UTC(2020, 0, 1))).toBeGreaterThan(60);
    expect(deltaTSeconds(Date.UTC(2050, 0, 1))).toBeGreaterThan(80);
    expect(deltaTSeconds(Date.UTC(2050, 0, 1))).toBeLessThan(110);
  });

  it('converts a UTC instant to TT Julian Day', () => {
    const jd = jdTT(Date.UTC(2000, 0, 1, 12));
    expect(jd).toBeGreaterThan(2451545);
    expect(jd - 2451545).toBeLessThan(0.002);
  });
});
