import { addDays, fromISO, todayISO, toISO } from './date';
import { completionId, occursOn } from './schedule';
import type { AppState, Completion, Note, Sankalp, Settings } from './types';

// deterministic demo data so the app looks lived-in on first open
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261030);

const T = todayISO();
const ago = (n: number) => addDays(T, -n);
const ahead = (n: number) => addDays(T, n);

export const defaultSettings: Settings = {
  name: 'Aditya',
  theme: 'system',
  weekStartsMonday: true,
  notifications: {
    enabled: true,
    defaultLeadMinutes: 15,
    snoozeMinutes: 30,
    quietStart: '22:30',
    quietEnd: '05:00',
  },
  onDeviceAi: 'auto',
  diaryPrompt: true,
};

const demo = (): Sankalp[] => [
  {
    id: 'sk-gayatri',
    name: 'Gāyatrī Japa',
    intention: 'One mālā at first light, before the house wakes.',
    category: 'japa',
    color: 'saffron',
    glyph: 'ॐ',
    startedOn: ago(96),
    endsOn: ahead(54),
    frequency: { kind: 'daily' },
    time: { start: '05:30', end: '06:15' },
    targetCount: 108,
    reminder: { enabled: true, leadMinutes: 15, snoozeMinutes: 30 },
    status: 'active',
    createdAt: Date.now() - 96 * 86_400_000,
  },
  {
    id: 'sk-vishnu',
    name: 'Viṣṇu Sahasranāma',
    intention: 'Friday evening pāṭha with the family.',
    category: 'path',
    color: 'indigo',
    glyph: '॥',
    startedOn: ago(201),
    endsOn: null,
    frequency: { kind: 'weekly', days: [5] },
    time: { start: '18:30' },
    targetCount: null,
    reminder: { enabled: true, leadMinutes: 60, snoozeMinutes: 30 },
    status: 'active',
    createdAt: Date.now() - 201 * 86_400_000,
  },
  {
    id: 'sk-yoga',
    name: 'Āsana & Prāṇāyāma',
    intention: 'Forty-five minutes, six mornings a week.',
    category: 'yoga',
    color: 'jade',
    glyph: '✶',
    startedOn: ago(78),
    endsOn: ahead(122),
    frequency: { kind: 'weekly', days: [1, 2, 3, 4, 5, 6] },
    time: { start: '06:30', end: '07:15' },
    targetCount: null,
    reminder: { enabled: true, leadMinutes: 10, snoozeMinutes: 15 },
    status: 'active',
    createdAt: Date.now() - 78 * 86_400_000,
  },
  {
    id: 'sk-ekadashi',
    name: 'Ekādaśī Upavāsa',
    intention: 'A light day, a quiet mind.',
    category: 'anusthana',
    color: 'plum',
    glyph: '✦',
    startedOn: ago(220),
    endsOn: null,
    frequency: { kind: 'tithi', tithi: 11 },
    time: null,
    targetCount: null,
    reminder: { enabled: true, leadMinutes: 720, snoozeMinutes: 120 },
    status: 'active',
    createdAt: Date.now() - 220 * 86_400_000,
  },
  {
    id: 'sk-shiva',
    name: 'Pañcākṣarī — 40 day anuṣṭhāna',
    intention: 'Forty days of ॐ नमः शिवाय, one mālā at dusk.',
    category: 'japa',
    color: 'terracotta',
    glyph: '❁',
    startedOn: ago(11),
    endsOn: ahead(28),
    frequency: { kind: 'daily' },
    time: { start: '19:45', end: '20:15' },
    targetCount: 108,
    reminder: { enabled: true, leadMinutes: 30, snoozeMinutes: 15 },
    status: 'active',
    createdAt: Date.now() - 11 * 86_400_000,
  },
  {
    id: 'sk-bhagavatam',
    name: 'Śrīmad Bhāgavatam svādhyāya',
    intention: 'One chapter, slowly.',
    category: 'svadhyaya',
    color: 'slate',
    glyph: '❋',
    startedOn: ago(150),
    endsOn: null,
    frequency: { kind: 'weekly', days: [0] },
    time: { start: '09:00' },
    targetCount: null,
    reminder: { enabled: false, leadMinutes: 15, snoozeMinutes: 30 },
    status: 'paused',
    createdAt: Date.now() - 150 * 86_400_000,
  },
];

const DONE_RATE: Record<string, number> = {
  'sk-gayatri': 0.87,
  'sk-vishnu': 0.79,
  'sk-yoga': 0.72,
  'sk-ekadashi': 0.83,
  'sk-shiva': 0.91,
  'sk-bhagavatam': 0.6,
};

function demoCompletions(sankalps: Sankalp[]): Record<string, Completion> {
  const out: Record<string, Completion> = {};
  for (const s of sankalps) {
    const rate = DONE_RATE[s.id] ?? 0.8;
    for (let i = 0; i <= 220; i++) {
      const iso = ago(i);
      if (!occursOn(s, iso)) continue;
      if (s.status === 'paused' && i < 20) continue;
      // leave today's practices open so the home screen has something to do,
      // and keep the six days before it complete so the demo shows a live streak
      if (i === 0) continue;
      if (i <= 6) {
        out[completionId(s.id, iso)] = {
          id: completionId(s.id, iso),
          sankalpId: s.id,
          date: iso,
          done: true,
          count: s.targetCount ?? undefined,
          updatedAt: fromISO(iso).getTime() + 6 * 3600_000,
        };
        continue;
      }
      // a believable dip around a "busy week"
      const dip = i > 26 && i < 34 ? -0.35 : 0;
      if (rand() < rate + dip) {
        out[completionId(s.id, iso)] = {
          id: completionId(s.id, iso),
          sankalpId: s.id,
          date: iso,
          done: true,
          count: s.targetCount ?? undefined,
          updatedAt: fromISO(iso).getTime() + 6 * 3600_000,
        };
      }
    }
  }
  return out;
}

const demoNotes = (): Note[] => {
  const mk = (daysAgo: number, title: string, body: string, pinned = false): Note => ({
    id: `note-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
    date: ago(daysAgo),
    title,
    body,
    createdAt: fromISO(ago(daysAgo)).getTime() + 20 * 3600_000,
    updatedAt: fromISO(ago(daysAgo)).getTime() + 21 * 3600_000,
    pinned,
  });

  return [
    mk(
      0,
      'Morning, before the world',
      `Woke at 5:10 without the alarm. The street was still dark and the only sound was the pigeons.\n\nJapa felt **quiet** today — not ecstatic, just steady, which I am learning to prefer. Counted one mālā on the rudrākṣa, then sat for five minutes without counting anything at all.\n\n> The mind does not need to be empty. It needs to be *attending*.\n\n#japa #steadiness`,
      true
    ),
    mk(
      2,
      'On steadiness',
      `Read a line in [[Day 40 — the mind wanders]] that stayed: the practice is not the feeling, the practice is the returning.\n\nI keep expecting a good sitting to feel like something. Mostly it feels like brushing teeth for the mind.\n\n#svadhyaya`,
      true
    ),
    mk(
      4,
      'Day 40 — the mind wanders',
      `Forty days ago I started [[Pañcākṣarī — 40 day anuṣṭhāna]] with the idea that by now it would be automatic.\n\nIt is not automatic. But the *resistance* has thinned. I sit down faster. I argue with myself less.\n\nThree things I notice:\n- I am less reactive in the morning\n- My sleep has moved earlier by about forty minutes\n- I miss the practice on days I travel, and I now *plan around* it\n\n#anusthana #milestone`,
    ),
    mk(
      6,
      'Ekādaśī notes',
      `Kept it light — fruit and water until sunset. The [[Ekādaśī Upavāsa]] day is easier when I plan the afternoon. Around 4pm the body asked for food and the mind asked for a distraction. Both passed.\n\nEvening pāṭha was short. Felt clear.\n\n#vrata`,
    ),
    mk(
      8,
      'A dull week',
      `Honest entry: four days of going through the motions. The [[Yoga & Prāṇāyāma]] sequence happened, but I was somewhere else the whole time.\n\nWhat I want to remember: a dull week is data, not a verdict. The graph in [[Consistency, not intensity]] says the same thing.\n\n#honesty`,
    ),
    mk(
      11,
      'Starting Pañcākṣarī',
      `Today the saṅkalpa: forty days, one mālā at dusk, no exceptions for travel.\n\nI chose 19:45 because the house quiets after dinner and before sleep. Wrote the vow down instead of keeping it in my head — [[Why write the sankalp down]].\n\n#sankalpa #japa`
    ),
    mk(
      14,
      'Consistency, not intensity',
      `I used to practise for two hours on a Sunday and skip the rest of the week. That is not a practice, it is a performance.\n\nTwenty minutes daily beats two hours weekly, every time. The streak counter is a mirror, not a scoreboard.\n\n#svadhyaya #steadiness`,
    ),
    mk(
      17,
      'Why write the sankalp down',
      `A vow that stays in the head is a wish. A vow written with a date, a time and an end is a *saṅkalpa*.\n\nPutting it in the app gives it edges: when it starts, when it ends, what counts as done. Edges are mercy.\n\n#sankalpa`,
    ),
    mk(
      21,
      'Notes from the Friday pāṭha',
      `[[Viṣṇu Sahasranāma]] with Appa on the phone. He corrected my pronunciation of the fourth śloka — again. I have decided to be glad about it.\n\n#path #family`,
    ),
    mk(
      26,
      'The dip',
      `Travel, late nights, and the practice collapsed for a week. I am not going to write a paragraph of self-criticism. I am going to set a 15-minute reminder and start again tomorrow.\n\n#return`,
    ),
  ];
};

export function createInitialState(): AppState {
  const sankalps = demo();
  return {
    version: 1,
    sankalps,
    completions: demoCompletions(sankalps),
    notes: demoNotes(),
    settings: defaultSettings,
    snoozedUntil: {},
    acknowledged: {},
  };
}

export function seedEmptyState(): AppState {
  return {
    version: 1,
    sankalps: [],
    completions: {},
    notes: [],
    settings: defaultSettings,
    snoozedUntil: {},
    acknowledged: {},
  };
}

export const demoTodayISO = T;
export const demoDateLabel = toISO(new Date());
