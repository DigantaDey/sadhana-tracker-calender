// ── Pañcāṅga: the five limbs of the day, computed locally ────────────────────
//
// A tithi is a lunar day: the time it takes the Moon to gain 12° of elongation
// on the Sun. There are thirty in a synodic month. The traditional rule — the
// one every printed pañcāṅga follows — is that the tithi **prevailing at local
// sunrise** gives the day its name. So a correct implementation needs three
// things, and this file has all three:
//
//   1. a real ephemeris (see astro.ts: 60-term lunar series, Meeus ch. 47),
//   2. the sunrise at your latitude and longitude (NOAA formulation),
//   3. the exact instants the current tithi begins and ends (root-finding on
//      the elongation), so the app can say "ends 19:42" and mean it.
//
// Everything is computed on the device, from a place you choose. Nothing is
// fetched, because nothing needs to be.
//
// Accuracy: the elongation is good to ≈10″. That is ≈20 s of time on a tithi
// boundary — two orders of magnitude better than a phone user can perceive,
// and comfortably inside the ~1 min uncertainty of the sunrise itself.

import {
  diffAngle,
  elongationAt,
  findElongationCrossing,
  moonIlluminationAt,
  moonRiseSet,
  riseSet,
  siderealMoonLongitude,
  siderealSunLongitude,
  solarNoon,
  jdTT,
  norm360,
} from './astro';
import { addDays } from './date';
import {
  guessLocation,
  instantOf,
  timeIn,
  type GeoLocation,
} from './location';
import { TITHI_NAMES, type Frequency } from './types';

export { TITHI_NAMES };

export const NAKSHATRA_NAMES = [
  'Aśvinī', 'Bharaṇī', 'Kṛttikā', 'Rohiṇī', 'Mṛgaśirā', 'Ārdrā',
  'Punarvasu', 'Puṣya', 'Āśleṣā', 'Maghā', 'Pūrva Phalguṇī', 'Uttara Phalguṇī',
  'Hasta', 'Citrā', 'Svātī', 'Viśākhā', 'Anurādhā', 'Jyeṣṭhā',
  'Mūla', 'Pūrvāṣāḍhā', 'Uttarāṣāḍhā', 'Śravaṇa', 'Dhaniṣṭhā', 'Śatabhiṣā',
  'Pūrva Bhādrapadā', 'Uttara Bhādrapadā', 'Revatī',
];

export const YOGA_NAMES = [
  'Viṣkambha', 'Prīti', 'Āyuṣmān', 'Saubhāgya', 'Śobhana', 'Atigaṇḍa',
  'Sukarman', 'Dhṛti', 'Śūla', 'Gaṇḍa', 'Vṛddhi', 'Dhruva',
  'Vyāghāta', 'Harṣaṇa', 'Vajra', 'Siddhi', 'Vyatipāta', 'Varīyān',
  'Parigha', 'Śiva', 'Siddha', 'Sādhya', 'Śubha', 'Śukla',
  'Brahma', 'Indra', 'Vaidhṛti',
];

const KARANA_MOVABLE = ['Bava', 'Bālava', 'Kaulava', 'Taitila', 'Gara', 'Vaṇija', 'Viṣṭi'];

/** 1–60 → karana name (a karana is half a tithi). */
export function karanaName(k: number): string {
  if (k === 1) return 'Kiṁstughna';
  if (k >= 58) return ['Śakuni', 'Catuṣpāda', 'Nāga'][k - 58] ?? 'Nāga';
  return KARANA_MOVABLE[(k - 2) % 7];
}

// ── Small ordered caches (a calendar year is 365 look-ups) ───────────────────

const CACHE_LIMIT = 768;

/** Per-day memo tables. A calendar year view touches ~365 keys, each once. */
const dayCache = new Map<string, PanchangDay>();
const sunriseCache = new Map<string, number | null>();
const sunriseTithiCache = new Map<string, number>();

function remember<K, V>(map: Map<K, V>, key: K, value: V): V {
  map.set(key, value);
  if (map.size > CACHE_LIMIT) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  return value;
}

// ── The active place ─────────────────────────────────────────────────────────

let activeLocation: GeoLocation | null = null;
let locationSignature = '';

export function getPanchangLocation(): GeoLocation {
  if (!activeLocation) {
    activeLocation = guessLocation();
    locationSignature = signatureOf(activeLocation);
  }
  return activeLocation;
}

/** Called once by the store whenever the chosen place changes. */
export function setPanchangLocation(place: GeoLocation): void {
  const sig = signatureOf(place);
  if (sig === locationSignature) return;
  activeLocation = place;
  locationSignature = sig;
  dayCache.clear();
  sunriseCache.clear();
  sunriseTithiCache.clear();
}

const signatureOf = (p: GeoLocation) =>
  `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)},${p.timeZone}`;

// ── Core quantities ──────────────────────────────────────────────────────────

/** Moon's elongation from the Sun at an instant, 0–360°. */
export function elongation(date: Date): number {
  return elongationAt(date.getTime());
}

/** Tithi number (1–30) at an instant: 1–15 śukla, 16–30 kṛṣṇa. */
export function tithiAt(date: Date): number {
  return Math.min(30, Math.floor(elongationAt(date.getTime()) / 12) + 1);
}

export function pakshaOf(tithi: number): 'śukla' | 'kṛṣṇa' {
  return tithi <= 15 ? 'śukla' : 'kṛṣṇa';
}

export function tithiLabel(tithi: number): string {
  return `${pakshaOf(tithi) === 'śukla' ? 'Śukla' : 'Kṛṣṇa'} ${TITHI_NAMES[tithi - 1]}`;
}

/** Tithi at local sunrise on a civil date — the traditional day-name. */
export function tithiAtSunrise(iso: string): number {
  const key = `${iso}|${locationSignature}`;
  const hit = sunriseTithiCache.get(key);
  if (hit !== undefined) return hit;
  const sunrise = sunriseOn(iso);
  const ref = sunrise ?? noonOn(iso);
  return remember(sunriseTithiCache, key, tithiAt(new Date(ref)));
}

function utcMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The instant the Sun clears the horizon on a civil date, or null. */
export function sunriseOn(iso: string): number | null {
  const key = `${iso}|${locationSignature}`;
  if (sunriseCache.has(key)) return sunriseCache.get(key) ?? null;
  const p = getPanchangLocation();
  const value = riseSet(utcMidnight(iso), p.latitude, p.longitude, true);
  remember(sunriseCache, key, value);
  return value;
}

function noonOn(iso: string): number {
  return solarNoon(utcMidnight(iso), getPanchangLocation().longitude);
}

// ── The full pañcāṅga for a day ───────────────────────────────────────────────

export type PanchangDay = {
  iso: string;
  place: GeoLocation;
  /** Tithi prevailing at sunrise (the traditional determination). */
  tithi: number;
  tithiName: string;
  paksha: 'śukla' | 'kṛṣṇa';
  /** Exact instants the prevailing tithi begins and ends. */
  tithiStart: number;
  tithiEnd: number;
  nextTithi: number;
  /** Sun. */
  sunrise: number | null;
  sunset: number | null;
  solarNoon: number;
  dayLengthMinutes: number | null;
  /** Moon. */
  illumination: number;
  nakshatra: number;
  nakshatraName: string;
  yoga: number;
  yogaName: string;
  karana: string;
  /** The same tithi prevails at two consecutive sunrises (vṛddhi). */
  vriddhi: boolean;
  /** The tithi *after* this one is skipped entirely (kṣaya) — no sunrise
   *  sees it, so a vow tied to it is observed on this day instead. */
  kshaya: boolean;
  /** Named observance for the day, if any. */
  observance: string | null;
  /** Clock strings in the place's own zone. */
  sunriseLabel: string | null;
  sunsetLabel: string | null;
  tithiStartLabel: string;
  tithiEndLabel: string;
};

export function panchangFor(iso: string): PanchangDay {
  const key = `${iso}|${locationSignature}`;
  const hit = dayCache.get(key);
  if (hit) return hit;

  const place = getPanchangLocation();
  const anchor = utcMidnight(iso);
  const sunrise = riseSet(anchor, place.latitude, place.longitude, true);
  const sunset = riseSet(anchor, place.latitude, place.longitude, false);
  const noon = solarNoon(anchor, place.longitude);
  const reference = sunrise ?? noon;

  const tithi = tithiAt(new Date(reference));
  const start = findElongationCrossing(((tithi - 1) * 12) % 360, reference);
  const end = findElongationCrossing((tithi * 12) % 360, reference);

  const jd = jdTT(reference);
  const nak = Math.min(27, Math.floor(siderealMoonLongitude(jd) / (360 / 27)) + 1);
  const yoga = Math.min(27, Math.floor(norm360(siderealMoonLongitude(jd) + siderealSunLongitude(jd)) / (360 / 27)) + 1);
  const karana = karanaName(Math.min(60, Math.floor(elongationAt(reference) / 6) + 1));

  const prev = tithiAtSunrise(addDays(iso, -1));
  const next = tithiAtSunrise(addDays(iso, 1));

  const value: PanchangDay = {
    iso,
    place,
    tithi,
    tithiName: tithiLabel(tithi),
    paksha: pakshaOf(tithi),
    tithiStart: start,
    tithiEnd: end,
    nextTithi: tithi === 30 ? 1 : tithi + 1,
    sunrise,
    sunset,
    solarNoon: noon,
    dayLengthMinutes:
      sunrise != null && sunset != null ? Math.round((sunset - sunrise) / 60_000) : null,
    illumination: moonIlluminationAt(reference),
    nakshatra: nak,
    nakshatraName: NAKSHATRA_NAMES[nak - 1],
    yoga,
    yogaName: YOGA_NAMES[yoga - 1],
    karana,
    vriddhi: prev === tithi,
    kshaya: next === ((tithi + 1) % 30) + 1,
    observance: observanceFor(tithi),
    sunriseLabel: sunrise != null ? timeIn(sunrise, place.timeZone) : null,
    sunsetLabel: sunset != null ? timeIn(sunset, place.timeZone) : null,
    tithiStartLabel: timeIn(start, place.timeZone),
    tithiEndLabel: timeIn(end, place.timeZone),
  };
  return remember(dayCache, key, value);
}

function observanceFor(tithi: number): string | null {
  switch (tithi) {
    case 11:
    case 26:
      return 'Ekādaśī';
    case 15:
      return 'Pūrṇimā';
    case 30:
      return 'Amāvasyā';
    case 8:
    case 23:
      return 'Aṣṭamī';
    case 4:
    case 19:
      return 'Caturthī';
    case 13:
    case 28:
      return 'Pradoṣa';
    case 29:
      return 'Śivarātri';
    default:
      return null;
  }
}

/** Moonrise / moonset on a civil date. Computed on demand — it is the most
 *  expensive quantity in the module and only the day detail needs it. */
export function moonTimesFor(iso: string): { rise: number | null; set: number | null } {
  const place = getPanchangLocation();
  const from = instantOf(iso, place.timeZone, 0, 0);
  return {
    rise: moonRiseSet(from, place.latitude, place.longitude, true),
    set: moonRiseSet(from, place.latitude, place.longitude, false),
  };
}

// ── Is a tithi "on" today? ───────────────────────────────────────────────────

/**
 * Vrata rule for a tithi-recurring practice.
 *
 * A lunar day can be *vṛddhi* (touch two sunrises) or *kṣaya* (touch none).
 * The convention every pañcāṅga follows, and the one people actually observe:
 *
 *   • normal — the tithi prevails at sunrise: observe that day;
 *   • vṛddhi — observe on the **second** sunrise, not the first;
 *   • kṣaya — the tithi never sees a sunrise: observe on the day it begins.
 *
 * Getting this wrong is how Ekādaśī gets missed, so it is worth the six lines.
 */
export function tithiObservanceOn(iso: string, tithi: number): boolean {
  const here = tithiAtSunrise(iso);
  const prev = tithiAtSunrise(addDays(iso, -1));
  const next = tithiAtSunrise(addDays(iso, 1));

  if (here === tithi) {
    // vṛddhi: the same tithi at two sunrises → the second one is the observance
    if (next === tithi && prev !== tithi) return false;
    return true;
  }
  // kṣaya: prev = tithi−1 and next = tithi+1 → the tithi is skipped entirely
  if (here === tithi - 1 && next === (tithi % 30) + 1) return true;
  return false;
}

/** Back-compat helper used by the schedule engine. */
export function tithiOccursOn(iso: string, tithi: number): boolean {
  return tithiObservanceOn(iso, tithi);
}

// ── Convenience predicates (instant-based) ───────────────────────────────────

export const isEkadashi = (date: Date) => {
  const t = tithiAt(date);
  return t === 11 || t === 26;
};
export const isPurnima = (date: Date) => tithiAt(date) === 15;
export const isAmavasya = (date: Date) => tithiAt(date) === 30;
export const isAshtami = (date: Date) => {
  const t = tithiAt(date);
  return t === 8 || t === 23;
};

export function tithiName(date: Date): string {
  return tithiLabel(tithiAt(date));
}

export function tithiShort(date: Date): string {
  return TITHI_NAMES[tithiAt(date) - 1];
}

export function moonIllumination(date: Date): number {
  return moonIlluminationAt(date.getTime());
}

/** Fraction of the tithi elapsed at an instant, 0–1 (nice for a thin ring). */
export function tithiProgress(iso: string, now = Date.now()): number {
  const day = panchangFor(iso);
  const span = day.tithiEnd - day.tithiStart;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (now - day.tithiStart) / span));
}

/** How far the Moon is from the Sun, as a 0–1 phase for the moon glyph. */
export function phaseFraction(date: Date): number {
  return norm360(elongationAt(date.getTime())) / 360;
}

export { diffAngle };

/** The next civil date on which a tithi-vow is due, as a short label. */
export function nextTithiDate(tithi: number, fromISO: string): string {
  for (let i = 0; i < 40; i++) {
    const iso = addDays(fromISO, i);
    if (tithiObservanceOn(iso, tithi)) {
      const [y, m, d] = iso.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return i === 0 ? 'today' : i === 1 ? `tomorrow, ${d} ${months[m - 1]}` : `${d} ${months[m - 1]} ${y}`;
    }
  }
  return '—';
}
