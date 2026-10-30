// ── Approximate pañcāṅga ─────────────────────────────────────────────────────
// Tithi is the lunar day, defined by the Moon gaining 12° on the Sun.
// We compute the geocentric elongation with the leading periodic terms of the
// low-precision lunar theory (Meeus, Astronomical Algorithms, ch. 47/25).
// Accuracy is typically within ±20 minutes of the true tithi boundary — enough
// to *show* the lunar day and to schedule an observance window, but the native
// build swaps this for a proper ephemeris (Swiss Ephemeris / Drik Panchang API)
// and a location-aware sunrise for vrata rules.

import { TITHI_NAMES, type Frequency } from './types';

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const norm360 = (x: number) => ((x % 360) + 360) % 360;

function julianDay(date: Date): number {
  // UTC-based JD, good to ~1 minute for our purposes.
  const ms = date.getTime();
  return ms / 86_400_000 + 2440587.5;
}

function sunLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  return norm360(L0 + C);
}

function moonLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;
  return norm360(
    L +
      6.288774 * sin(Mp) +
      1.274027 * sin(2 * D - Mp) +
      0.658314 * sin(2 * D) +
      0.213618 * sin(2 * Mp) -
      0.185116 * sin(M) -
      0.114332 * sin(2 * F) +
      0.058793 * sin(2 * D - 2 * Mp) +
      0.057066 * sin(2 * D - M - Mp) +
      0.053322 * sin(2 * D + Mp) +
      0.045758 * sin(2 * D - M)
  );
}

/** 0–360 degrees of Moon ahead of Sun */
export function elongation(date: Date): number {
  const jd = julianDay(date);
  return norm360(moonLongitude(jd) - sunLongitude(jd));
}

/** 1–30, where 1–15 is Śukla (waxing) and 16–30 is Kṛṣṇa (waning). */
export function tithiIndex(date: Date): number {
  const e = elongation(date);
  return Math.min(30, Math.floor(e / 12) + 1);
}

export function tithiName(date: Date): string {
  const i = tithiIndex(date);
  const bright = i <= 15;
  return `${bright ? 'Śukla' : 'Kṛṣṇa'} ${TITHI_NAMES[i - 1]}`;
}

export function tithiShort(date: Date): string {
  return TITHI_NAMES[tithiIndex(date) - 1];
}

/** Illuminated fraction of the moon, 0–1. */
export function moonIllumination(date: Date): number {
  const e = elongation(date);
  return (1 - Math.cos(e * RAD)) / 2;
}

export function isEkadashi(date: Date): boolean {
  const i = tithiIndex(date);
  return i === 11 || i === 26;
}

export function isPurnima(date: Date): boolean {
  return tithiIndex(date) === 15;
}

export function isAmavasya(date: Date): boolean {
  return tithiIndex(date) === 30;
}

export function isAshtami(date: Date): boolean {
  const i = tithiIndex(date);
  return i === 8 || i === 23;
}

/**
 * Does a tithi-recurring practice land on this gregorian date?
 * A tithi can span two sunrises; we use "the tithi running at local noon",
 * which matches how most practitioners read a calendar day.
 */
export function tithiOccursOn(iso: string, tithi: number): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  return tithiIndex(new Date(y, m - 1, d, 12, 0, 0)) === tithi;
}

export function describeFrequency(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      if (f.days.length === 7) return 'Every day';
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Every ${f.days.map((d) => names[d]).join(', ')}`;
    }
    case 'monthly':
      return `Monthly on the ${ordinal(f.day)}`;
    case 'yearly':
      return 'Once a year';
    case 'tithi':
      return `Every ${TITHI_NAMES[f.tithi - 1]} tithi`;
    case 'once':
      return 'One-time anuṣṭhāna';
  }
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
