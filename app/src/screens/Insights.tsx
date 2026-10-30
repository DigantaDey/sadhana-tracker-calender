import { useMemo, useState } from 'react';
import {
  BrainCog,
  CircleCheck,
  Cpu,
  Flame,
  Info,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import type { Sankalp } from '../lib/types';
import { addDays, prettyWindow, startOfWeek, weekdayLabels } from '../lib/date';
import {
  consistency,
  currentStreak,
  isDone,
  longestStreak,
  scheduledOn,
  tallyDay,
} from '../lib/schedule';
import { composeReflection, detectCapability, ruleInsights } from '../lib/ai';
import { PC_ACCENT, pc } from '../components/ui';

const KIND_ICON = {
  praise: CircleCheck,
  nudge: Lightbulb,
  trend: TrendingDown,
  observation: Info,
} as const;

export function InsightsScreen() {
  const { state } = useStore();
  const nav = useNav();
  const today = useToday();
  const [reflection, setReflection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cap = useMemo(() => detectCapability(state.settings.onDeviceAi), [state.settings.onDeviceAi]);
  const insights = useMemo(() => ruleInsights(state), [state]);
  const hasHistory = state.sankalps.length > 0;
  const streak = useMemo(
    () => currentStreak(state.sankalps, state.completions, today),
    [state.sankalps, state.completions, today]
  );
  const best = useMemo(
    () => longestStreak(state.sankalps, state.completions, addDays(today, -140), today),
    [state.sankalps, state.completions, today]
  );
  const totalKept = Object.values(state.completions).filter((c) => c.done).length;

  const weeks = useMemo(() => {
    const start = startOfWeek(addDays(today, -83), state.settings.weekStartsMonday);
    const days: string[] = [];
    for (let i = 0; i < 91; i++) days.push(addDays(start, i));
    return days;
  }, [today, state.settings.weekStartsMonday]);

  const perPractice = state.sankalps
    .filter((s) => s.status !== 'stopped')
    .map((s) => {
      let due = 0;
      let done = 0;
      for (let i = 0; i < 30; i++) {
        const iso = addDays(today, -i);
        if (!scheduledOn([s], iso).length) continue;
        due++;
        if (isDone(state.completions, s.id, iso)) done++;
      }
      return { s, rate: due ? done / due : 0, due };
    })
    .filter((x) => x.due > 0)
    .sort((a, b) => b.rate - a.rate);

  const generate = () => {
    setBusy(true);
    setReflection(null);
    window.setTimeout(() => {
      setReflection(composeReflection(state, cap.tier));
      setBusy(false);
    }, cap.tier === 'rules' ? 350 : 1100);
  };

  return (
    <main className="screen">
      <div className="screen__head" style={{ paddingBottom: 4 }}>
        <div className="eyebrow">Patterns</div>
        <h1 className="title">Insights</h1>
      </div>

      <div className="aicard" style={{ marginTop: 14 }}>
        <div className="aicard__glow" />
        <div className="row row--between">
          <div className="aicard__engine">
            <span className="pulse" />
            On-device patterns
          </div>
          <span className="badge badge--accent">
            <Cpu size={9} /> no upload
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, marginTop: 8, letterSpacing: '-0.02em' }}>
          {cap.engine}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '5px 0 0', lineHeight: 1.55 }}>
          {cap.detail}
        </p>

        {reflection ? (
          <div className="aicard__body">{reflection}</div>
        ) : (
          <div className="aicard__body" style={{ color: 'var(--muted)' }}>
            {busy
              ? 'Reading your last few weeks…'
              : 'A reflection written from your own records — practice kept, weeks missed, and what your diary keeps returning to.'}
          </div>
        )}

        <button
          className="btn btn--accent"
          style={{ marginTop: 14, height: 38 }}
          onClick={generate}
          disabled={busy}
          type="button"
        >
          {busy ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
          {reflection ? 'Write another' : 'Compose a reflection'}
        </button>
        <p className="mono-note" style={{ marginTop: 8 }}>
          Nothing is uploaded and no model is downloaded. In the Android build this same card binds
          to the platform model when one is present; the words are always composed from your own
          records.
        </p>
      </div>

      <section className="section">
        <div className="stats" style={{ marginTop: 0 }}>
          <div className="stat stat--accent">
            <div className="stat__label">Current</div>
            <div className="stat__value">
              {streak}
              <small>d</small>
            </div>
            <div className="stat__sub">unbroken</div>
          </div>
          <div className="stat">
            <div className="stat__label">Longest</div>
            <div className="stat__value">
              {best}
              <small>d</small>
            </div>
            <div className="stat__sub">run</div>
          </div>
          <div className="stat">
            <div className="stat__label">Practices</div>
            <div className="stat__value">{totalKept}</div>
            <div className="stat__sub">kept</div>
          </div>
        </div>
      </section>

      {!hasHistory && (
        <div className="firstvow" style={{ marginTop: 16 }}>
          <div className="firstvow__glyph">✦</div>
          <h2>Insights need a few kept days</h2>
          <p>
            Nothing here is invented. Charts, streaks and reflections appear once you have taken a
            vow and marked a day.
          </p>
          <button className="btn btn--primary" onClick={() => nav.openCreate()} type="button">
            Take a vow
          </button>
        </div>
      )}

      {hasHistory && (
      <section className="section">
        <div className="section__head">
          <div className="section__title">Thirteen weeks</div>
          <span className="mono-note" style={{ margin: 0 }}>
            {Math.round(consistency(state.sankalps, state.completions, weeks[0], today) * 100)}% kept
          </span>
        </div>
        <div className="card card--pad">
          <div className="heatmap">
            {weeks.map((iso) => {
              const t = tallyDay(state.sankalps, state.completions, iso);
              const ratio = t.due ? t.done / t.due : 0;
              const level = iso > today ? 0 : t.due === 0 ? 0 : ratio === 1 ? 4 : ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
              return (
                <span
                  key={iso}
                  className="hm"
                  data-level={level}
                  title={`${iso} · ${t.done}/${t.due}`}
                  style={{ opacity: iso > today ? 0.35 : 1 }}
                />
              );
            })}
          </div>
          <div className="legend">
            <span style={{ marginRight: 'auto' }}>{weekdayLabels(state.settings.weekStartsMonday)[0]} →</span>
            <span>less</span>
            {[1, 2, 3, 4].map((l) => (
              <i key={l} className="hm" data-level={l} style={{ width: 9, height: 9 }} />
            ))}
            <span>more</span>
          </div>
        </div>
      </section>
      )}

      {hasHistory && (
      <section className="section">
        <div className="section__head">
          <div className="section__title">Last 30 days by practice</div>
        </div>
        <div className="card card--pad bars">
          {perPractice.length === 0 && (
            <p className="mono-note" style={{ margin: 0 }}>
              No scheduled practice in the last 30 days.
            </p>
          )}
          {perPractice.map(({ s, rate }) => (
            <div key={s.id} className="barrow" style={pc(s.color)}>
              <div>
                <div className="barrow__label">
                  <span className="glyph" style={{ width: 20, height: 20, fontSize: 10, borderRadius: 6 }}>
                    {s.glyph}
                  </span>
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {s.time ? prettyWindow(s.time) : 'Anytime'}
                  </span>
                </div>
                <div className="barrow__track">
                  <div className="barrow__fill" style={{ width: `${Math.round(rate * 100)}%` }} />
                </div>
              </div>
              <span className="barrow__val">{Math.round(rate * 100)}%</span>
            </div>
          ))}
        </div>
      </section>
      )}

      <section className="section">
        <div className="section__head">
          <div className="section__title">What the data says</div>
          <span className="badge">
            <BrainCog size={9} /> {cap.tier === 'rules' ? 'local' : 'nano'}
          </span>
        </div>
        <div className="stack gap-2">
          {insights.map((ins) => {
            const Icon = KIND_ICON[ins.kind] ?? Info;
            return (
              <div key={ins.id} className="insight" data-kind={ins.kind}>
                <span className="insight__icon">
                  <Icon />
                </span>
                <div>
                  <div className="insight__title">{ins.title}</div>
                  <div className="insight__text">{ins.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <button
          className="card card--pad"
          style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}
          onClick={() => nav.openSettings()}
          type="button"
        >
          <span className="glyph glyph--lg" style={PC_ACCENT}>
            <Cpu size={17} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 540 }}>Reflection settings</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {cap.engine} · {cap.reason}
            </div>
          </div>
          <TrendingUp size={15} color="var(--muted-2)" />
        </button>
        <p className="mono-note">
          This is deliberately small: summaries, gentle nudges and search over your own notes. No
          advice that pretends to be a guru, and it never invents a practice for you.
        </p>
      </section>

      <div style={{ height: 8 }} />
      <div className="card card--pad" style={{ background: 'var(--surface-2)' }}>
        <div className="row" style={{ gap: 8 }}>
          <Flame size={14} color="var(--accent)" />
          <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
            Streaks are a mirror, not a scoreboard. A break is information — the app never shames a
            gap.
          </span>
        </div>
      </div>
    </main>
  );
}
