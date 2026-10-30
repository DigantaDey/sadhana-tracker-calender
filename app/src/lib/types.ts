// ── Core domain model ────────────────────────────────────────────────────────

export type Category =
  | 'japa'
  | 'path'
  | 'dhyana'
  | 'yoga'
  | 'puja'
  | 'seva'
  | 'svadhyaya'
  | 'anusthana';

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekly'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'monthly'; day: number } // 1–31 (clamped to month length)
  | { kind: 'yearly'; month: number; day: number }
  | { kind: 'tithi'; tithi: number } // 1–30 lunar day
  | { kind: 'once'; date: string };

export type Reminder = {
  enabled: boolean;
  leadMinutes: number; // how long before the practice window opens
  snoozeMinutes: number;
};

export type SankalpStatus = 'active' | 'paused' | 'completed' | 'stopped';

export interface Sankalp {
  id: string;
  name: string;
  intention?: string; // the vow, in the practitioner's own words
  category: Category;
  color: ColorKey;
  glyph: string;
  /** The day the vow was taken. */
  startedOn: string;
  /** Last day the vow runs for. `null` = open-ended. */
  endsOn: string | null;
  frequency: Frequency;
  /** Optional practice window. */
  time: { start: string; end?: string } | null;
  /** Optional japa/mala count target. */
  targetCount: number | null;
  reminder: Reminder;
  status: SankalpStatus;
  /** epoch ms */
  createdAt: number;
  archivedAt?: string | null;
}

export interface Completion {
  /** `${sankalpId}::${date}` */
  id: string;
  sankalpId: string;
  date: string;
  done: boolean;
  count?: number;
  note?: string;
  /** epoch ms of the last change — lets the sync layer resolve conflicts */
  updatedAt: number;
}

export interface Note {
  id: string;
  /** ISO date the note belongs to (daily notes), or the creation date. */
  date: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export type ColorKey =
  | 'saffron'
  | 'indigo'
  | 'jade'
  | 'terracotta'
  | 'plum'
  | 'slate';

export const COLORS: Record<ColorKey, { light: string; dark: string; label: string }> = {
  saffron: { light: '#B5741F', dark: '#E7B273', label: 'Saffron' },
  indigo: { light: '#4C5C8F', dark: '#9AABDE', label: 'Indigo' },
  jade: { light: '#3F755C', dark: '#7FB89C', label: 'Jade' },
  terracotta: { light: '#A9553B', dark: '#D89179', label: 'Terracotta' },
  plum: { light: '#7A4A6E', dark: '#C08FB4', label: 'Plum' },
  slate: { light: '#4E5A63', dark: '#9DAAB3', label: 'Slate' },
};

export const CATEGORIES: {
  key: Category;
  label: string;
  glyph: string;
  hint: string;
}[] = [
  { key: 'japa', label: 'Japa', glyph: 'ॐ', hint: 'Mantra repetition' },
  { key: 'path', label: 'Pāṭha', glyph: '॥', hint: 'Recitation & study of scripture' },
  { key: 'dhyana', label: 'Dhyāna', glyph: '☸', hint: 'Meditation & stillness' },
  { key: 'yoga', label: 'Āsana', glyph: '✶', hint: 'Asana, pranayama, movement' },
  { key: 'puja', label: 'Pūjā', glyph: '❂', hint: 'Ritual & offering' },
  { key: 'seva', label: 'Sevā', glyph: '✿', hint: 'Selfless service' },
  { key: 'svadhyaya', label: 'Svādhyāya', glyph: '❋', hint: 'Self-study & reflection' },
  { key: 'anusthana', label: 'Anuṣṭhāna', glyph: '✦', hint: 'Special observance or vrata' },
];

export const TITHI_NAMES = [
  'Pratipadā', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī', 'Ṣaṣṭhī',
  'Saptamī', 'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī',
  'Trayodaśī', 'Caturdaśī', 'Pūrṇimā', 'Pratipadā', 'Dvitīyā', 'Tṛtīyā',
  'Caturthī', 'Pañcamī', 'Ṣaṣṭhī', 'Saptamī', 'Aṣṭamī', 'Navamī',
  'Daśamī', 'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Amāvasyā',
];

/** The place the pañcāṅga is cast for. Sunrise — and therefore the tithi —
 *  is local, so this is not optional. */
export type PanchangSettings = {
  /** `auto` = derived from the device's zone, or a city id from `CITIES`. */
  presetId: string;
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export type Settings = {
  name: string;
  theme: 'system' | 'light' | 'dark';
  weekStartsMonday: boolean;
  notifications: {
    enabled: boolean;
    defaultLeadMinutes: number;
    snoozeMinutes: number;
    quietStart: string;
    quietEnd: string;
  };
  onDeviceAi: 'auto' | 'on' | 'off';
  diaryPrompt: boolean;
  panchang: PanchangSettings;
  /** First-run flow completed. Until true the app shows onboarding. */
  onboarded: boolean;
};

export type AppState = {
  version: 2;
  sankalps: Sankalp[];
  completions: Record<string, Completion>;
  notes: Note[];
  settings: Settings;
  snoozedUntil: Record<string, number>; // occurrence key → epoch ms
  acknowledged: Record<string, number>; // reminder key → epoch ms it was shown
};
