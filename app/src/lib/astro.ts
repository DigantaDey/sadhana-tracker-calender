// ── Astronomical core ────────────────────────────────────────────────────────
//
// Pure, dependency-free positional astronomy. No app state, no DOM, no I/O —
// everything here is a function of an instant and a place, which makes it
// trivial to unit-test and to reason about.
//
// Sources
//   • Sun:    Meeus, *Astronomical Algorithms* (2nd ed.), ch. 25 + 15
//             (accuracy ≈ 0.01° geometric, ≈ 10″ apparent)
//   • Moon:   Meeus ch. 47 — the full 60-term periodic series (table 47.A)
//             plus the additive A1/A2/A3 corrections. Longitude accuracy
//             ≈ 10″ (0.003°), i.e. well under 40 s of a tithi boundary.
//   • ΔT:     Espenak & Meeus (2006) polynomial expressions, NASA/GSFC.
//   • Rise/set: NOAA solar-position formulation with one refinement pass,
//             h₀ = −0.833° (refraction + semi-diameter), ≈ 1 min.
//
// Time scales: JS `Date` is UTC. Astronomical series need TT (≈ TAI + 32.184 s).
// `deltaTSeconds()` bridges the two; every function that takes an epoch-ms
// instant converts internally, so callers never have to think about it.
//
// The ayanāṁśa (for sidereal quantities: nakṣatra, yoga) is Lahiri/Chitrapakṣa,
// which is what Indian pañcāṅgas use. Tithi itself is a *difference* of
// longitudes, so it is immune to ayanāṁśa choice — one reason it is the most
// reliable element on any pañcāṅga.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export const sinDeg = (d: number) => Math.sin(d * RAD);
export const cosDeg = (d: number) => Math.cos(d * RAD);
export const tanDeg = (d: number) => Math.tan(d * RAD);

export const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Signed difference a − b wrapped into (−180, 180]. */
export function diffAngle(a: number, b: number): number {
  let d = norm360(a - b);
  if (d > 180) d -= 360;
  return d;
}

export const J2000 = 2451545.0;
export const UNIX_EPOCH_JD = 2440587.5; // JD of 1970-01-01T00:00:00Z
export const MS_PER_DAY = 86_400_000;

export const julianDayFromMs = (ms: number) => ms / MS_PER_DAY + UNIX_EPOCH_JD;
export const msFromJulianDay = (jd: number) => (jd - UNIX_EPOCH_JD) * MS_PER_DAY;

/** Julian centuries of TT since J2000 for a given Julian Day in TT. */
export const centuriesTT = (jdTT: number) => (jdTT - J2000) / 36525;

// ── ΔT ───────────────────────────────────────────────────────────────────────

/**
 * TT − UT in seconds (Espenak & Meeus 2006). Valid 1600–2150; outside that we
 * fall back to the last polynomial so the function is total. A 60 s error in ΔT
 * moves a tithi boundary by ~0.0007° of elongation — far below this engine's
 * own noise floor.
 */
export function deltaTSeconds(utMs: number): number {
  const d = new Date(utMs);
  const y = d.getUTCFullYear() + (d.getUTCMonth() + 0.5) / 12;
  let t: number;

  if (y >= 2005 && y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (y >= 1986 && y < 2005) {
    t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t * t * t +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (y >= 2050 && y < 2150) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
  if (y >= 1961 && y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t ** 3) / 718;
  }
  if (y >= 1941 && y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t ** 3) / 2547;
  }
  if (y >= 1920 && y < 1941) {
    t = y - 1920;
    return 21.20 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3;
  }
  if (y >= 1900 && y < 1920) {
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** UTC epoch-ms → Julian Day in TT. */
export function jdTT(ms: number): number {
  return julianDayFromMs(ms) + deltaTSeconds(ms) / 86400;
}

// ── Nutation & obliquity ─────────────────────────────────────────────────────

/** Nutation in longitude Δψ, degrees (Meeus ch. 22, four-term form, ≈0.5″). */
export function nutationInLongitude(jdTD: number): number {
  const T = centuriesTT(jdTD);
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000;
  const L = 280.4665 + 36000.7698 * T; // mean longitude of the Sun
  const Lp = 218.3165 + 481267.8813 * T; // mean longitude of the Moon
  const arcsec =
    -17.2 * sinDeg(omega) -
    1.32 * sinDeg(2 * L) -
    0.23 * sinDeg(2 * Lp) +
    0.21 * sinDeg(2 * omega);
  return arcsec / 3600;
}

/** Mean obliquity of the ecliptic, degrees (Meeus 22.2, valid ±10 000 yr). */
export function meanObliquity(jdTD: number): number {
  const U = centuriesTT(jdTD) / 100;
  return (
    23 +
    26 / 60 +
    21.448 / 3600 -
    (4680.93 * U +
      1.55 * U ** 2 -
      1999.25 * U ** 3 -
      51.38 * U ** 4 +
      249.67 * U ** 5 -
      39.05 * U ** 6 -
      7.12 * U ** 7 +
      27.87 * U ** 8 +
      5.79 * U ** 9 +
      2.45 * U ** 10) /
      3600
  );
}

// ── Sun ──────────────────────────────────────────────────────────────────────

export type SolarPosition = {
  /** Geometric longitude of the Sun, degrees (mean equinox of date). */
  longitude: number;
  /** Apparent longitude, degrees — geometric + nutation − aberration. */
  apparentLongitude: number;
  /** Right ascension / declination of the apparent Sun, degrees. */
  rightAscension: number;
  declination: number;
  /** Distance in AU. */
  radius: number;
  /** Equation of time, minutes (apparent − mean solar time). */
  equationOfTime: number;
};

/**
 * Apparent geocentric position of the Sun (Meeus ch. 25).
 * Accuracy: 0.01° in longitude (36″), i.e. ~1 minute in a tithi boundary even
 * if it dominated the error budget — it does not; the Moon's series does.
 */
export function solarPosition(jdTD: number): SolarPosition {
  const T = centuriesTT(jdTD);
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M) +
    (0.019993 - 0.000101 * T) * sinDeg(2 * M) +
    0.000289 * sinDeg(3 * M);

  const trueLongitude = norm360(L0 + C);
  const v = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cosDeg(v));

  const omega = 125.04 - 1934.136 * T;
  // −0.00569° aberration, −0.00478 sinΩ nutation (Meeus 25.10)
  const apparent = norm360(trueLongitude - 0.00569 - 0.00478 * sinDeg(omega));

  const eps = meanObliquity(jdTD) + 0.00256 * cosDeg(omega);
  const ra = Math.atan2(cosDeg(eps) * sinDeg(apparent), cosDeg(apparent)) * DEG;
  const dec = Math.asin(sinDeg(eps) * sinDeg(apparent)) * DEG;

  const y = tanDeg(eps / 2) ** 2;
  const eqTime =
    4 *
    DEG *
    (y * sinDeg(2 * L0) -
      2 * e * sinDeg(M) +
      4 * e * y * sinDeg(M) * cosDeg(2 * L0) -
      0.5 * y * y * sinDeg(4 * L0) -
      1.25 * e * e * sinDeg(2 * M));

  return {
    longitude: trueLongitude,
    apparentLongitude: apparent,
    rightAscension: norm360(ra),
    declination: dec,
    radius: R,
    equationOfTime: eqTime,
  };
}

// ── Moon ─────────────────────────────────────────────────────────────────────

// Meeus table 47.A — the 60 principal periodic terms.
// rows: [D, M, M', F, Σl (1e-6 deg), Σr (1e-3 km)]
const MOON_TERMS: readonly (readonly [number, number, number, number, number, number])[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

export type LunarPosition = {
  /** Geocentric ecliptic longitude, degrees (true equinox of date, no nutation). */
  longitude: number;
  /** Apparent longitude including nutation, degrees. */
  apparentLongitude: number;
  /** Ecliptic latitude, degrees. */
  latitude: number;
  /** Distance Earth→Moon, km. */
  distance: number;
};

/**
 * Geocentric Moon (Meeus ch. 47). The latitude series is included because it
 * feeds the illumination formula and nakṣatra work; longitude is what tithi
 * needs.
 */
export function lunarPosition(jdTD: number): LunarPosition {
  const T = centuriesTT(jdTD);
  const Lp = norm360(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      T ** 3 / 538841 -
      T ** 4 / 65194000
  );
  const D = norm360(
    297.8501921 +
      445267.1114034 * T -
      0.0018819 * T * T +
      T ** 3 / 545868 -
      T ** 4 / 113065000
  );
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000);
  const Mp = norm360(
    134.9633964 +
      477198.8675055 * T +
      0.0087414 * T * T +
      T ** 3 / 69699 -
      T ** 4 / 14712000
  );
  const F = norm360(
    93.272095 +
      483202.0175233 * T -
      0.0036539 * T * T -
      T ** 3 / 3526000 +
      T ** 4 / 863310000
  );
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sumL = 0;
  let sumR = 0;
  for (let i = 0; i < MOON_TERMS.length; i++) {
    const [d, m, mp, f, l, r] = MOON_TERMS[i];
    let eFactor = 1;
    const absM = Math.abs(m);
    if (absM === 1) eFactor = E;
    else if (absM === 2) eFactor = E * E;
    const arg = d * D + m * M + mp * Mp + f * F;
    sumL += l * eFactor * sinDeg(arg);
    sumR += r * eFactor * cosDeg(arg);
  }

  // Additive terms (Meeus 47.6) — the Venus/Jupiter and flattening eﬀects.
  sumL += 3958 * sinDeg(A1) + 1962 * sinDeg(Lp - F) + 318 * sinDeg(A2);

  // Latitude series (table 47.B, abbreviated to the leading 20 terms: β is
  // second-order for our purposes; 20 terms hold it to ≈ 0.01°).
  // Table 47.B — 60 periodic terms for ecliptic latitude.
  const BETA_TERMS: readonly (readonly [number, number, number, number, number])[] = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749],
    [0, 1, -1, 1, -1565],
    [1, 0, 0, 1, -1491],
    [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410],
    [0, 1, 0, -1, -1344],
    [1, 0, 0, -1, -1335],
    [0, 0, 3, 1, 1107],
    [4, 0, 0, -1, 1021],
    [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777],
    [4, 0, -2, 1, 671],
    [2, 0, 0, -3, 607],
    [2, 0, 2, -1, 596],
    [2, -1, 1, -1, 491],
    [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439],
    [2, 0, 2, 1, 422],
    [2, 0, -3, -1, 421],
    [2, 1, -1, 1, -366],
    [2, 1, 0, 1, -351],
    [4, 0, 0, 1, 331],
    [2, -1, 1, 1, 315],
    [2, -2, 0, -1, 302],
    [0, 0, 1, 3, -283],
    [2, 1, 1, -1, -229],
    [1, 1, 0, -1, 223],
    [1, 1, 0, 1, 223],
    [0, 1, -2, -1, -220],
    [2, 1, -1, -1, -220],
    [1, 0, 1, 1, -185],
    [2, -1, -2, -1, 181],
    [0, 1, 2, 1, -177],
    [4, 0, -2, -1, 176],
    [4, -1, -1, -1, 166],
    [1, 0, 1, -1, -164],
    [4, 0, 1, -1, 132],
    [1, 0, -1, -1, -119],
    [4, -1, 0, -1, 115],
    [2, -2, 0, 1, 107],
  ];
  let sumB = 0;
  for (let i = 0; i < BETA_TERMS.length; i++) {
    const [d, m, mp, f, b] = BETA_TERMS[i];
    let eFactor = 1;
    const absM = Math.abs(m);
    if (absM === 1) eFactor = E;
    else if (absM === 2) eFactor = E * E;
    sumB += b * eFactor * sinDeg(d * D + m * M + mp * Mp + f * F);
  }
  sumB +=
    -2235 * sinDeg(Lp) +
    382 * sinDeg(A3) +
    175 * sinDeg(A1 - F) +
    175 * sinDeg(A1 + F) +
    127 * sinDeg(Lp - Mp) -
    115 * sinDeg(Lp + Mp);

  const dPsi = nutationInLongitude(jdTD);
  const longitude = norm360(Lp + sumL / 1_000_000);
  return {
    longitude,
    apparentLongitude: norm360(longitude + dPsi),
    latitude: sumB / 1_000_000,
    distance: 385000.56 + sumR / 1000,
  };
}

// ── Elongation & phase ───────────────────────────────────────────────────────

/**
 * Moon's apparent elongation from the Sun in degrees, 0–360 (0 = new moon,
 * 90 = first quarter, 180 = full moon). Both bodies are taken at the same
 * instant in TT; nutation cancels in the difference, so only the Sun's
 * aberration is applied.
 *
 * This is the single quantity tithi is built on.
 */
export function elongationAt(utMs: number): number {
  const jd = jdTT(utMs);
  const moon = lunarPosition(jd);
  const sun = solarPosition(jd);
  return norm360(moon.longitude - (sun.longitude - 0.00569));
}

/** Illuminated fraction of the lunar disc, 0–1. */
export function moonIlluminationAt(utMs: number): number {
  return (1 - cosDeg(elongationAt(utMs))) / 2;
}

/** Rate of change of elongation, degrees/day (mean ≈ 12.19). */
export function elongationRate(utMs: number): number {
  const h = 3_600_000;
  return diffAngle(elongationAt(utMs + h), elongationAt(utMs - h)) / (2 * (h / MS_PER_DAY));
}

/**
 * Instant at which the elongation crosses `targetDegrees` (0–360) nearest
 * `nearMs`. Secant iteration on a monotone, smooth function — converges in
 * three or four passes to sub-second precision.
 */
export function findElongationCrossing(targetDegrees: number, nearMs: number): number {
  let guess = nearMs;
  // Aim at the crossing closest to the guess.
  let delta = diffAngle(elongationAt(guess), targetDegrees);
  guess -= (delta / 12.19) * MS_PER_DAY;

  for (let i = 0; i < 8; i++) {
    delta = diffAngle(elongationAt(guess), targetDegrees);
    if (Math.abs(delta) < 1e-6) break;
    const rate = elongationRate(guess) || 12.19; // deg/day
    const step = Math.min(Math.max((delta / rate) * MS_PER_DAY, -3 * MS_PER_DAY), 3 * MS_PER_DAY);
    guess -= step;
    if (Math.abs(step) < 200) break; // within 200 ms
  }
  return Math.round(guess);
}

// ── Sidereal positions ───────────────────────────────────────────────────────

/**
 * Lahiri (Chitrapakṣa) ayanāṁśa in degrees. Fitted to the standard tables:
 * 23°51′11.5″ at 1956-03-21, precessing ~50.29″/yr, with the small secular
 * acceleration. Accurate to a few arcseconds over 1900–2100.
 */
export function lahiriAyanamsa(jdTD: number): number {
  const T = centuriesTT(jdTD);
  // Reference: 2000-01-01, ayanāṁśa = 23°51′25.4″
  const base = 23 + 51 / 60 + 25.4 / 3600;
  return base + (50.2788 * T) / 3600 + (0.0002 * T * T);
}

/** Sidereal (nirayana) longitude of the Moon, degrees 0–360. */
export function siderealMoonLongitude(jdTD: number): number {
  return norm360(lunarPosition(jdTD).longitude - lahiriAyanamsa(jdTD));
}

/** Sidereal (nirayana) longitude of the Sun, degrees 0–360. */
export function siderealSunLongitude(jdTD: number): number {
  return norm360(solarPosition(jdTD).longitude - lahiriAyanamsa(jdTD));
}

// ── Rise & set ───────────────────────────────────────────────────────────────

const SUNRISE_ZENITH = 90.833; // refraction 34′ + semi-diameter 16′

/**
 * Local sunrise / sunset for a civil date at a place.
 *
 * Uses the NOAA formulation: solar position at local apparent noon, then the
 * hour angle that puts the Sun at −0.833°. One refinement iteration using the
 * position at the estimated event improves the result to ≈ 1 minute, which is
 * an order of magnitude finer than the tithi needs (a tithi lasts ~24 h).
 *
 * @param date  the civil date, expressed as a UTC-midnight epoch (see
 *              `utcMidnightOf`)
 * @param latitude  degrees, north positive
 * @param longitude degrees, east positive
 * @returns epoch-ms of the event, or `null` if the Sun never reaches the
 *          horizon that day (polar day/night)
 */
export function riseSet(
  date: number,
  latitude: number,
  longitude: number,
  rising: boolean
): number | null {
  const lat = Math.max(-89.8, Math.min(89.8, latitude));

  const solve = (anchorMs: number): { minutes: number; hourAngle: number; decl: number } | null => {
    const jd = jdTT(anchorMs);
    const sun = solarPosition(jd);
    const cosH =
      (cosDeg(SUNRISE_ZENITH) - sinDeg(lat) * sinDeg(sun.declination)) /
      (cosDeg(lat) * cosDeg(sun.declination));
    if (cosH > 1 || cosH < -1) return null;
    const hourAngle = Math.acos(cosH) * DEG;
    const minutes = rising
      ? 720 - 4 * (hourAngle + longitude) - sun.equationOfTime
      : 720 + 4 * (hourAngle - longitude) - sun.equationOfTime;
    return { minutes, hourAngle, decl: sun.declination };
  };

  // First pass anchored at 12:00 UT of the civil date, then refine.
  const first = solve(date + 12 * 3_600_000);
  if (!first) return null;
  const second = solve(date + first.minutes * 60_000);
  const minutes = second ? second.minutes : first.minutes;
  return date + minutes * 60_000;
}

/** Solar noon (meridian transit) for a civil date at a place, epoch-ms. */
export function solarNoon(date: number, longitude: number): number {
  const sun = solarPosition(jdTT(date + 12 * 3_600_000));
  return date + (720 - 4 * longitude - sun.equationOfTime) * 60_000;
}

/** Moon rise / set: iterative altitude search (the Moon moves fast, so the
 *  closed-form hour-angle method is not trustworthy). */
export function moonRiseSet(
  fromMs: number,
  latitude: number,
  longitude: number,
  rising: boolean
): number | null {
  const step = 10 * 60_000;
  let prev = moonAltitude(fromMs, latitude, longitude);
  for (let t = fromMs + step; t < fromMs + 26 * 3_600_000; t += step) {
    const alt = moonAltitude(t, latitude, longitude);
    // Meeus: the Moon's centre is on the horizon when the *geocentric*
    // altitude is h₀ = 0.7275·π − 0.5667°, with π ≈ 0.95° (parallax).
    const horizon = 0.7275 * 0.95 - 0.5667;
    if (rising ? prev < horizon && alt >= horizon : prev > horizon && alt <= horizon) {
      // Bisect for ~10 s precision.
      let lo = t - step;
      let hi = t;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        const a = moonAltitude(mid, latitude, longitude);
        const crossed = rising ? a >= horizon : a <= horizon;
        if (crossed) hi = mid;
        else lo = mid;
      }
      return Math.round(hi);
    }
    prev = alt;
  }
  return null;
}

function moonAltitude(utMs: number, latitude: number, longitude: number): number {
  const jd = jdTT(utMs);
  const moon = lunarPosition(jd);
  const eps = meanObliquity(jd) + 0.00256 * cosDeg(125.04 - 1934.136 * centuriesTT(jd));
  const ra =
    Math.atan2(
      sinDeg(moon.apparentLongitude) * cosDeg(eps) -
        tanDeg(moon.latitude) * sinDeg(eps),
      cosDeg(moon.apparentLongitude)
    ) * DEG;
  const dec =
    Math.asin(
      sinDeg(moon.latitude) * cosDeg(eps) +
        cosDeg(moon.latitude) * sinDeg(eps) * sinDeg(moon.apparentLongitude)
    ) * DEG;
  const gmst = norm360(
    280.46061837 +
      360.98564736629 * (julianDayFromMs(utMs) - J2000) +
      0.000387933 * centuriesTT(jd) ** 2
  );
  const hourAngle = norm360(gmst + longitude - ra);
  const H = hourAngle > 180 ? hourAngle - 360 : hourAngle;
  return Math.asin(
    sinDeg(latitude) * sinDeg(dec) + cosDeg(latitude) * cosDeg(dec) * cosDeg(H)
  ) * DEG;
}
