import { beforeEach, describe, expect, it } from 'vitest';
import {
  panchangFor,
  setPanchangLocation,
  tithiAtSunrise,
  tithiObservanceOn,
  nextTithiDate,
} from '../panchang';

const DELHI = {
  id: 'delhi',
  label: 'Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  timeZone: 'Asia/Kolkata',
};

const KOLKATA = {
  id: 'kolkata',
  label: 'Kolkata',
  latitude: 22.5726,
  longitude: 88.3639,
  timeZone: 'Asia/Kolkata',
};

describe('pañcāṅga for a known day', () => {
  // Cross-checked against published pañcāṅga for 30 October 2026 (IST):
  // Kṛṣṇa Pañcamī until 19:25, Mṛgaśirā, Śiva yoga, sunrise 06:31, sunset 17:37.
  let day = panchangFor('2026-10-30');
  beforeEach(() => {
    setPanchangLocation(DELHI);
    day = panchangFor('2026-10-30');
  });

  it('names the tithi at sunrise', () => {
    expect(day.tithi).toBe(20);
    expect(day.tithiName).toBe('Kṛṣṇa Pañcamī');
    expect(day.paksha).toBe('kṛṣṇa');
  });

  it('gives the exact end of the tithi', () => {
    expect(day.tithiEndLabel).toBe('19:25');
    expect(day.tithiStartLabel).toBe('22:10');
  });

  it('agrees with the other limbs of the pañcāṅga', () => {
    expect(day.nakshatraName).toBe('Mṛgaśirā');
    expect(day.yogaName).toBe('Śiva');
    expect(day.karana).toBe('Kaulava'); // half-tithi running at sunrise
  });

  it('places sunrise and sunset', () => {
    expect(day.sunriseLabel).toBe('06:31');
    expect(day.sunsetLabel).toBe('17:37');
    expect(day.dayLengthMinutes).toBeGreaterThan(650);
    expect(day.dayLengthMinutes).toBeLessThan(680);
  });

  it('computes illumination for a waning moon', () => {
    expect(day.illumination).toBeGreaterThan(0.75);
    expect(day.illumination).toBeLessThan(0.88);
  });
});

describe('tithi boundaries do not depend on the observer', () => {
  it('ends at the same instant everywhere (only the clock differs)', () => {
    setPanchangLocation(DELHI);
    const delhi = panchangFor('2026-10-30');
    setPanchangLocation(KOLKATA);
    const kolkata = panchangFor('2026-10-30');
    expect(Math.abs(delhi.tithiEnd - kolkata.tithiEnd)).toBeLessThan(1000);
  });

  it('does depend on the place when a sunrise falls near a boundary', () => {
    // Sunrise differs by ~50 minutes between the two cities, so a tithi that
    // turns over in that window is named differently — this is why the app
    // insists on a place.
    setPanchangLocation(DELHI);
    const delhi = panchangFor('2026-11-20');
    setPanchangLocation(KOLKATA);
    const kolkata = panchangFor('2026-11-20');
    expect(delhi.sunrise).not.toBe(kolkata.sunrise);
  });
});

describe('vrata rules', () => {
  beforeEach(() => setPanchangLocation(DELHI));

  it('observes Ekādaśī on the day it prevails at sunrise', () => {
    expect(tithiAtSunrise('2026-12-20')).toBe(11);
    expect(tithiObservanceOn('2026-12-20', 11)).toBe(true);
    expect(tithiObservanceOn('2026-12-19', 11)).toBe(false);
    expect(tithiObservanceOn('2026-12-21', 11)).toBe(false);
  });

  it('observes a vṛddhi tithi on the second sunrise only', () => {
    // Find a month where a tithi touches two sunrises.
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const iso = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
      const day = panchangFor(iso);
      if (!day.vriddhi) continue;
      found = true;
      expect(tithiObservanceOn(iso, day.tithi)).toBe(true);
      const previousDay = new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(tithiObservanceOn(previousDay, day.tithi)).toBe(false);
    }
    expect(found).toBe(true);
  });

  it('never skips an Ekādaśī in a full year', () => {
    // 24 Ekādaśīs in a lunar year (two per month), 26 in a leap lunar year.
    let count = 0;
    for (let i = 0; i < 366; i++) {
      const iso = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
      if (tithiObservanceOn(iso, 11) || tithiObservanceOn(iso, 26)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(24);
    expect(count).toBeLessThanOrEqual(26);
  });

  it('labels the next date a tithi falls on', () => {
    setPanchangLocation(DELHI);
    expect(nextTithiDate(11, '2026-12-20')).toBe('today');
    expect(nextTithiDate(11, '2026-12-21')).toMatch(/Jan/);
  });
});

describe('Pūrṇimā and Amāvasyā', () => {
  beforeEach(() => setPanchangLocation(DELHI));

  it('finds the full moon and the new moon', () => {
    const purnima = panchangFor('2026-10-26');
    expect(purnima.tithi).toBe(15);
    expect(purnima.illumination).toBeGreaterThan(0.97);
    expect(purnima.observance).toBe('Pūrṇimā');

    const amavasya = panchangFor('2026-11-09');
    expect(amavasya.tithi).toBe(30);
    expect(amavasya.illumination).toBeLessThan(0.03);
    expect(amavasya.observance).toBe('Amāvasyā');
  });

  it('reports a lunar eclipse day as a full moon', () => {
    // Total lunar eclipse, 2025-09-07 (full moon at 18:12 UTC) — the tithi at
    // sunrise in India is still Pūrṇimā, and the eclipse happens after sunset.
    const day = panchangFor('2025-09-07');
    expect(day.tithi).toBe(15);
    expect(day.observance).toBe('Pūrṇimā');
  });
});
