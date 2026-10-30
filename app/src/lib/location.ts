// ── Place, time zone and clock formatting ────────────────────────────────────
//
// The pañcāṅga is a *local* instrument: a tithi runs from sunrise to sunrise at
// your latitude and longitude. So the app stores a place, not just a date.
//
// We deliberately avoid a time-zone library: `Intl` already knows every IANA
// zone, and the two conversions we need (instant → civil date/time in a zone,
// and civil time in a zone → instant) are a dozen lines each. Everything is
// cached, because a calendar view formats a few hundred timestamps.

export type GeoLocation = {
  /** stable id — `auto` means "derived from this device" */
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. `Asia/Kolkata` */
  timeZone: string;
};

/** A short, curated list — enough to cover where practitioners actually live. */
export const CITIES: GeoLocation[] = [
  { id: 'delhi', label: 'Delhi', latitude: 28.6139, longitude: 77.209, timeZone: 'Asia/Kolkata' },
  { id: 'mumbai', label: 'Mumbai', latitude: 19.076, longitude: 72.8777, timeZone: 'Asia/Kolkata' },
  { id: 'kolkata', label: 'Kolkata', latitude: 22.5726, longitude: 88.3639, timeZone: 'Asia/Kolkata' },
  { id: 'chennai', label: 'Chennai', latitude: 13.0827, longitude: 80.2707, timeZone: 'Asia/Kolkata' },
  { id: 'bengaluru', label: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timeZone: 'Asia/Kolkata' },
  { id: 'hyderabad', label: 'Hyderabad', latitude: 17.385, longitude: 78.4867, timeZone: 'Asia/Kolkata' },
  { id: 'ahmedabad', label: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, timeZone: 'Asia/Kolkata' },
  { id: 'pune', label: 'Pune', latitude: 18.5204, longitude: 73.8567, timeZone: 'Asia/Kolkata' },
  { id: 'jaipur', label: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timeZone: 'Asia/Kolkata' },
  { id: 'lucknow', label: 'Lucknow', latitude: 26.8467, longitude: 80.9462, timeZone: 'Asia/Kolkata' },
  { id: 'patna', label: 'Patna', latitude: 25.5941, longitude: 85.1376, timeZone: 'Asia/Kolkata' },
  { id: 'bhubaneswar', label: 'Bhubaneswar', latitude: 20.2961, longitude: 85.8245, timeZone: 'Asia/Kolkata' },
  { id: 'guwahati', label: 'Guwahati', latitude: 26.1445, longitude: 91.7362, timeZone: 'Asia/Kolkata' },
  { id: 'varanasi', label: 'Varanasi', latitude: 25.3176, longitude: 82.9739, timeZone: 'Asia/Kolkata' },
  { id: 'haridwar', label: 'Haridwar', latitude: 29.9457, longitude: 78.1642, timeZone: 'Asia/Kolkata' },
  { id: 'amritsar', label: 'Amritsar', latitude: 31.634, longitude: 74.8723, timeZone: 'Asia/Kolkata' },
  { id: 'kochi', label: 'Kochi', latitude: 9.9312, longitude: 76.2673, timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', label: 'Kathmandu', latitude: 27.7172, longitude: 85.324, timeZone: 'Asia/Kathmandu' },
  { id: 'colombo', label: 'Colombo', latitude: 6.9271, longitude: 79.8612, timeZone: 'Asia/Colombo' },
  { id: 'dhaka', label: 'Dhaka', latitude: 23.8103, longitude: 90.4125, timeZone: 'Asia/Dhaka' },
  { id: 'karachi', label: 'Karachi', latitude: 24.8607, longitude: 67.0011, timeZone: 'Asia/Karachi' },
  { id: 'dubai', label: 'Dubai', latitude: 25.2048, longitude: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'singapore', label: 'Singapore', latitude: 1.3521, longitude: 103.8198, timeZone: 'Asia/Singapore' },
  { id: 'london', label: 'London', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  { id: 'berlin', label: 'Berlin', latitude: 52.52, longitude: 13.405, timeZone: 'Europe/Berlin' },
  { id: 'paris', label: 'Paris', latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris' },
  { id: 'zurich', label: 'Zürich', latitude: 47.3769, longitude: 8.5417, timeZone: 'Europe/Zurich' },
  { id: 'newyork', label: 'New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { id: 'toronto', label: 'Toronto', latitude: 43.6532, longitude: -79.3832, timeZone: 'America/Toronto' },
  { id: 'chicago', label: 'Chicago', latitude: 41.8781, longitude: -87.6298, timeZone: 'America/Chicago' },
  { id: 'losangeles', label: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, timeZone: 'America/Los_Angeles' },
  { id: 'sydney', label: 'Sydney', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
  { id: 'auckland', label: 'Auckland', latitude: -36.8485, longitude: 174.7633, timeZone: 'Pacific/Auckland' },
  { id: 'tokyo', label: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' },
  { id: 'johannesburg', label: 'Johannesburg', latitude: -26.2041, longitude: 28.0473, timeZone: 'Africa/Johannesburg' },
  { id: 'mauritius', label: 'Mauritius', latitude: -20.3484, longitude: 57.5522, timeZone: 'Indian/Mauritius' },
];

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The best guess we can make without asking for permission: the zone's city. */
export function guessLocation(): GeoLocation {
  const tz = deviceTimeZone();
  const match = CITIES.find((c) => c.timeZone === tz);
  if (match) return { ...match, id: 'auto' };

  // No preset for this zone — approximate the meridian from the UTC offset.
  // Sunrise is then only meaningful to the nearest half hour, so the label
  // says so and Settings invites a precise city.
  const offset = -new Date().getTimezoneOffset() / 60; // hours east of UTC
  return {
    id: 'auto',
    label: `Your time zone (${tz})`,
    latitude: 20,
    longitude: Math.max(-180, Math.min(180, offset * 15)),
    timeZone: tz,
  };
}

export function locationById(id: string, fallback: GeoLocation): GeoLocation {
  if (id === 'auto') {
    const auto = guessLocation();
    return { ...auto, id: 'auto' };
  }
  return CITIES.find((c) => c.id === id) ?? fallback;
}

// ── Intl helpers (cached) ────────────────────────────────────────────────────

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export type ZoneParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zoneParts(ms: number, timeZone: string): ZoneParts {
  const out = partsFormatter(timeZone).formatToParts(new Date(ms));
  const get = (t: string) => Number(out.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset of `timeZone` from UTC at a given instant, in ms (east positive). */
export function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = zoneParts(ms, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(ms / 1000) * 1000;
}

/** Civil date (`YYYY-MM-DD`) of an instant in a zone. */
export function civilDateIn(ms: number, timeZone: string): string {
  const p = zoneParts(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Wall-clock `HH:MM` of an instant in a zone. */
export function timeIn(ms: number, timeZone: string): string {
  const p = zoneParts(ms, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Instant of a civil date + wall-clock time in a zone. */
export function instantOf(
  civilDate: string,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0
): number {
  const [y, m, d] = civilDate.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute, second);
  const off1 = zoneOffsetMs(guess, timeZone);
  let utc = guess - off1;
  const off2 = zoneOffsetMs(utc, timeZone);
  if (off2 !== off1) utc = guess - off2;
  return utc;
}

/** `06:30` → `6:30 am`; `18:05` → `6:05 pm`. */
export function prettyClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hr} ${suffix}` : `${hr}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Rounded duration, e.g. `7 h 12 m`. */
export function prettyDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}
