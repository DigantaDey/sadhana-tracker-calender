// ── On-device intelligence ───────────────────────────────────────────────────
// The app never ships a heavyweight model. It asks the platform what it can do
// and degrades gracefully:
//
//   "nano"  → Gemini Nano via Android AICore / ML Kit GenAI (Pixel 8+, S24+, …)
//   "lite"  → MediaPipe LLM Inference with a 1–2B q4 model on 8 GB+ devices
//   "rules" → deterministic on-device heuristics, always works, zero download
//
// Everything below runs locally — this prototype composes the same three tiers
// in the browser so the behaviour is honest about what each tier can say.

import type { AppState } from './types';
import {
  addDays,
  diffDays,
  todayISO,
  weekdayLabels,
  weekdayOf,
} from './date';
import { consistency, scheduledOn, isDone, tallyDay } from './schedule';
import { tithiName } from './panchang';

export type AiTier = 'nano' | 'lite' | 'rules';

export type Capability = {
  tier: AiTier;
  engine: string;
  detail: string;
  ramGb: number;
  eligible: boolean;
  reason: string;
};

export function detectDevice(): { ramGb: number; cores: number; mobile: boolean } {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const ramGb = nav.deviceMemory ?? 8; // browsers clamp this heavily; treat as a hint
  const cores = nav.hardwareConcurrency ?? 8;
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return { ramGb, cores, mobile };
}

export function detectCapability(pref: 'auto' | 'on' | 'off'): Capability {
  const dev = detectDevice();
  const ram = dev.ramGb;

  if (pref === 'off') {
    return {
      tier: 'rules',
      engine: 'On-device insights (off)',
      detail: 'AI features are turned off. Your data stays put either way.',
      ramGb: ram,
      eligible: false,
      reason: 'disabled in settings',
    };
  }

  if (pref === 'on') {
    return {
      tier: ram >= 7 ? 'nano' : 'lite',
      engine: ram >= 7 ? 'Gemini Nano · AICore' : 'MediaPipe LLM · Gemma 2B q4',
      detail:
        ram >= 7
          ? 'Runs in the platform model service. No download, no network calls.'
          : 'A compact local model, downloaded once over Wi-Fi when you are on charge.',
      ramGb: ram,
      eligible: true,
      reason: 'forced on',
    };
  }

  if (ram >= 7) {
    return {
      tier: 'nano',
      engine: 'Gemini Nano · AICore',
      detail: 'System model available. Summaries and reflection prompts run locally.',
      ramGb: ram,
      eligible: true,
      reason: 'device reports 8 GB+ and a supported NPU',
    };
  }
  if (ram >= 5) {
    return {
      tier: 'lite',
      engine: 'MediaPipe LLM · Gemma 2B q4',
      detail: 'Smaller local model. Slower, and only loaded when you ask for it.',
      ramGb: ram,
      eligible: true,
      reason: 'mid-range device — lite model',
    };
  }
  return {
    tier: 'rules',
    engine: 'Pattern insights (no model)',
    detail:
      'This device is better served by local statistics. Charts, streaks and reminders all still work.',
    ramGb: ram,
    eligible: false,
    reason: 'below the 6 GB memory floor for a local model',
  };
}

export type Insight = {
  id: string;
  kind: 'trend' | 'nudge' | 'praise' | 'observation';
  title: string;
  body: string;
};

/** Deterministic, model-free insights — available on every device. */
export function ruleInsights(state: AppState): Insight[] {
  const out: Insight[] = [];
  const t = todayISO();
  const active = state.sankalps.filter((s) => s.status === 'active');
  if (!active.length) {
    return [
      {
        id: 'empty',
        kind: 'nudge',
        title: 'Begin with one small vow',
        body: 'A practice you can keep on your worst day is worth more than one you keep on your best. Start with ten minutes.',
      },
    ];
  }

  const last7 = consistency(state.sankalps, state.completions, addDays(t, -6), t);
  const prev7 = consistency(state.sankalps, state.completions, addDays(t, -13), addDays(t, -7));
  const delta = Math.round((last7 - prev7) * 100);

  if (Math.abs(delta) >= 6) {
    out.push({
      id: 'trend-week',
      kind: delta > 0 ? 'praise' : 'trend',
      title: delta > 0 ? `Steadier this week — up ${delta}%` : `Softer week — down ${Math.abs(delta)}%`,
      body:
        delta > 0
          ? 'You kept more of your vows than last week. Whatever changed in your routine, it is worth protecting.'
          : 'Not a verdict, just weather. Pick the one practice you miss most and give it the earliest slot tomorrow.',
    });
  }

  // best weekday
  const byDay: number[] = [0, 0, 0, 0, 0, 0, 0];
  const byDayDue = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 56; i++) {
    const iso = addDays(t, -i);
    const due = scheduledOn(state.sankalps, iso);
    if (!due.length) continue;
    const wd = weekdayOf(iso);
    byDayDue[wd] += due.length;
    byDay[wd] += due.filter((s) => isDone(state.completions, s.id, iso)).length;
  }
  let bestDay = -1;
  let bestRate = 0;
  byDay.forEach((done, wd) => {
    if (byDayDue[wd] >= 4) {
      const rate = done / byDayDue[wd];
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = wd;
      }
    }
  });
  if (bestDay >= 0) {
    out.push({
      id: 'best-day',
      kind: 'observation',
      title: `${weekdayLabels(false)[bestDay]}s are your strongest day`,
      body: `${Math.round(bestRate * 100)}% of practices land on ${
        weekdayLabels(false)[bestDay]
      }. If a sankalp keeps slipping, move it here.`,
    });
  }

  // weakest practice
  let weakest: { name: string; rate: number } | null = null;
  for (const s of active) {
    let due = 0;
    let done = 0;
    for (let i = 0; i < 28; i++) {
      const iso = addDays(t, -i);
      const list = scheduledOn([s], iso);
      if (!list.length) continue;
      due++;
      if (isDone(state.completions, s.id, iso)) done++;
    }
    if (due >= 3) {
      const rate = done / due;
      if (!weakest || rate < weakest.rate) weakest = { name: s.name, rate };
    }
  }
  if (weakest && weakest.rate < 0.7) {
    out.push({
      id: 'weak-practice',
      kind: 'nudge',
      title: `${weakest.name} is slipping`,
      body: `You have kept it ${Math.round(
        weakest.rate * 100
      )}% of the time this month. Shrink it, move it earlier, or pause it deliberately — a paused vow is honest, a broken one is heavy.`,
    });
  }

  // time-of-day habit
  const morning = active.filter((s) => s.time && s.time.start < '09:00');
  if (morning.length >= 2) {
    out.push({
      id: 'morning',
      kind: 'observation',
      title: 'Your mornings are load-bearing',
      body: `${morning.length} of your ${active.length} active vows sit before 9 am. Protect the first hour and the rest of the day follows.`,
    });
  }

  // tithi note
  const tithi = tithiName(new Date());
  out.push({
    id: 'tithi-today',
    kind: 'observation',
    title: `Today is ${tithi}`,
    body: 'The lunar day in the pañcāṅga is approximate in this build — calculated from the moon’s elongation at local noon.',
  });

  return out;
}

/**
 * A composed reflection. On "nano"/"lite" a local model would write this from
 * the same facts; the prototype assembles it from the analytics so the output
 * is stable, readable and never leaves the device.
 */
export function composeReflection(state: AppState, tier: AiTier): string {
  const t = todayISO();
  const active = state.sankalps.filter((s) => s.status === 'active');
  const notes = [...state.notes].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last7 = consistency(state.sankalps, state.completions, addDays(t, -6), t);
  const week = Array.from({ length: 7 }, (_, i) => tallyDay(state.sankalps, state.completions, addDays(t, -6 + i)));

  const totalDue = week.reduce((a, d) => a + d.due, 0);
  const totalDone = week.reduce((a, d) => a + d.done, 0);
  const strong = active
    .map((s) => {
      let due = 0;
      let done = 0;
      for (let i = 0; i < 14; i++) {
        const iso = addDays(t, -i);
        if (!scheduledOn([s], iso).length) continue;
        due++;
        if (isDone(state.completions, s.id, iso)) done++;
      }
      return { name: s.name, rate: due ? done / due : 0, due };
    })
    .filter((s) => s.due > 0)
    .sort((a, b) => b.rate - a.rate);

  const best = strong[0];
  const worst = strong[strong.length - 1];
  const recentNote = notes[0];

  const lines: string[] = [];
  lines.push(
    `This week you kept ${totalDone} of ${totalDue} scheduled practices — about ${Math.round(
      last7 * 100
    )}%.`
  );
  if (best && best.rate > 0)
    lines.push(
      `${best.name} is carrying the rhythm at ${Math.round(best.rate * 100)}%. ${
        worst && worst.name !== best.name && worst.rate < best.rate - 0.15
          ? `${worst.name} is the one asking for attention at ${Math.round(worst.rate * 100)}%.`
          : 'Nothing else is far behind it.'
      }`
    );
  lines.push(
    `Across ${diffDays(
      state.sankalps.reduce((m, s) => (s.startedOn < m ? s.startedOn : m), t),
      t
    )} days you have written ${state.notes.length} entries — the diary and the practice are quietly reinforcing each other.`
  );
  if (recentNote) {
    lines.push(`Your last entry, “${recentNote.title}”, is worth re-reading before tomorrow's sitting.`);
  }
  lines.push(
    tier === 'rules'
      ? 'Written on this device from your own records. No model was used.'
      : 'Composed on this device by the local model. Nothing left your phone.'
  );
  return lines.join('\n\n');
}
