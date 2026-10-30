// ── The state a real install starts from: none ───────────────────────────────
//
// Sādhana ships with an empty journal, an empty calendar and an onboarding
// flow — not with somebody else's vows. Every number the app shows is a fact
// about your practice, so there is nothing to seed and nothing to demo.

import { guessLocation, locationById } from './location';
import type {
  AppState,
  Completion,
  Note,
  PanchangSettings,
  Sankalp,
  Settings,
} from './types';

export function defaultSettings(): Settings {
  const place = guessLocation();
  return {
    name: '',
    theme: 'system',
    weekStartsMonday: true,
    notifications: {
      enabled: false,
      defaultLeadMinutes: 15,
      snoozeMinutes: 30,
      quietStart: '22:30',
      quietEnd: '05:00',
    },
    onDeviceAi: 'auto',
    diaryPrompt: true,
    panchang: toPanchangSettings(place),
    onboarded: false,
  };
}

function toPanchangSettings(place: {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}): PanchangSettings {
  return {
    presetId: place.id,
    label: place.label,
    latitude: place.latitude,
    longitude: place.longitude,
    timeZone: place.timeZone,
  };
}

export function createInitialState(): AppState {
  return {
    version: 2,
    sankalps: [],
    completions: {},
    notes: [],
    settings: defaultSettings(),
    snoozedUntil: {},
    acknowledged: {},
  };
}

/** Resolve the stored pañcāṅga place into coordinates the engine can use. */
export function resolvePanchangPlace(settings: Settings) {
  const stored = settings.panchang;
  const isPreset = stored.presetId !== 'auto';
  if (isPreset) {
    const city = locationById(stored.presetId, guessLocation());
    return { ...city, id: stored.presetId };
  }
  // `auto` follows the device zone, but honours manual coordinates the user
  // may have set without picking a preset.
  const auto = guessLocation();
  return {
    ...auto,
    latitude: Number.isFinite(stored.latitude) ? stored.latitude : auto.latitude,
    longitude: Number.isFinite(stored.longitude) ? stored.longitude : auto.longitude,
    timeZone: stored.timeZone || auto.timeZone,
    label: stored.label || auto.label,
  };
}

// ── Migration & validation ───────────────────────────────────────────────────

/**
 * Prototype builds (state v1) shipped a lived-in sample journal. It is not part
 * of this product any more, and it must not survive an upgrade — so a v1
 * payload is carried over only if it contains nothing from that sample.
 */
const RETIRED_SAMPLE_SANKALPS = new Set([
  'sk-gayatri',
  'sk-vishnu',
  'sk-yoga',
  'sk-ekadashi',
  'sk-shiva',
  'sk-bhagavatam',
]);

const RETIRED_SAMPLE_NOTES = new Set([
  'note-morning-before-the-worl',
  'note-on-steadiness',
  'note-day-40-the-mind-wanders',
  'note-ekadasi-notes',
  'note-a-dull-week',
  'note-starting-pancakari',
  'note-consistency-not-intensit',
  'note-why-write-the-sankalp-d',
  'note-notes-from-the-friday-pa',
  'note-the-dip',
]);

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/** Coerce anything that came out of storage into a valid state, or null. */
export function normaliseState(raw: unknown): AppState | null {
  if (!isObj(raw)) return null;
  const base = createInitialState();

  const legacy = raw.version === 1;
  const sankalps = Array.isArray(raw.sankalps)
    ? (raw.sankalps as Sankalp[]).filter(
        (s) => isObj(s) && typeof s.id === 'string' && !(legacy && RETIRED_SAMPLE_SANKALPS.has(s.id))
      )
    : [];

  const notes = Array.isArray(raw.notes)
    ? (raw.notes as Note[]).filter(
        (n) => isObj(n) && typeof n.id === 'string' && !(legacy && RETIRED_SAMPLE_NOTES.has(n.id))
      )
    : [];

  const completions: Record<string, Completion> = {};
  if (isObj(raw.completions)) {
    const live = new Set(sankalps.map((s) => s.id));
    for (const [key, value] of Object.entries(raw.completions)) {
      if (!isObj(value)) continue;
      const c = value as unknown as Completion;
      if (typeof c.sankalpId !== 'string' || !live.has(c.sankalpId)) continue;
      if (typeof c.date !== 'string') continue;
      completions[key] = c;
    }
  }

  const stored = isObj(raw.settings) ? (raw.settings as Partial<Settings>) : {};
  const defaults = defaultSettings();
  const settings: Settings = {
    ...defaults,
    ...stored,
    notifications: { ...defaults.notifications, ...(stored.notifications ?? {}) },
    panchang: { ...defaults.panchang, ...(stored.panchang ?? {}) },
    name: typeof stored.name === 'string' ? stored.name : defaults.name,
  };

  // Anyone with real content has already been through a first run.
  if (sankalps.length || notes.length) settings.onboarded = true;

  return {
    version: 2,
    sankalps,
    notes,
    completions,
    settings,
    snoozedUntil: isObj(raw.snoozedUntil) ? (raw.snoozedUntil as Record<string, number>) : {},
    acknowledged: isObj(raw.acknowledged) ? (raw.acknowledged as Record<string, number>) : {},
  };
}
