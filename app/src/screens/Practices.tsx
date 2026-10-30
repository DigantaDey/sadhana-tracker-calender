import { useMemo, useState } from 'react';
import { ArrowRight, Clock, Flame, Pause, Play, Plus, Sparkles, Target } from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import type { Sankalp } from '../lib/types';
import { describeFrequency } from '../lib/format';
import { formatShort, prettyWindow } from '../lib/date';
import { sankalpProgress } from '../lib/schedule';
import { Empty, PC_ACCENT, Segmented, pc } from '../components/ui';

type Filter = 'active' | 'paused' | 'completed' | 'all';

export function PracticesScreen() {
  const { state } = useStore();
  const nav = useNav();
  const today = useToday();
  const [filter, setFilter] = useState<Filter>('active');

  const counts = useMemo(() => {
    const by = { active: 0, paused: 0, completed: 0, all: state.sankalps.length };
    for (const s of state.sankalps) {
      if (s.status === 'active') by.active++;
      if (s.status === 'paused') by.paused++;
      if (s.status === 'completed' || s.status === 'stopped') by.completed++;
    }
    return by;
  }, [state.sankalps]);

  const list = state.sankalps
    .filter((s) =>
      filter === 'all'
        ? true
        : filter === 'completed'
        ? s.status === 'completed' || s.status === 'stopped'
        : s.status === filter
    )
    .sort((a, b) => {
      const rank = (s: Sankalp) => (s.status === 'active' ? 0 : s.status === 'paused' ? 1 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return (
    <main className="screen">
      <div className="screen__head">
        <div className="row row--between">
          <div>
            <div className="eyebrow">Vows</div>
            <h1 className="title">Sankalp</h1>
          </div>
          <button className="btn btn--ghost" style={{ height: 38 }} onClick={() => nav.openCreate()} type="button">
            <Plus /> New
          </button>
        </div>
        <p className="sub">
          A saṅkalpa is a vow with edges — a day it begins, a rhythm, and a day it rests.
        </p>
      </div>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        small
        options={[
          { value: 'active', label: `Active ${counts.active}` },
          { value: 'paused', label: `Paused ${counts.paused}` },
          { value: 'completed', label: `Ended ${counts.completed}` },
          { value: 'all', label: 'All' },
        ]}
      />

      <div className="stack gap-2" style={{ marginTop: 16 }}>
        {list.length === 0 && (
          <Empty glyph="✦">
            {state.sankalps.length === 0
              ? 'No saṅkalpa yet. Start with ten minutes — small enough to keep on your worst day.'
              : filter === 'active'
              ? 'No vow in force right now. You can resume a paused one, or take a new vow.'
              : 'Nothing in this list yet.'}
            {filter === 'active' && (
              <div style={{ marginTop: 14 }}>
                <button className="btn btn--ghost" onClick={() => nav.openCreate()} type="button">
                  <Plus size={14} /> Take a vow
                </button>
              </div>
            )}
          </Empty>
        )}

        {list.map((s) => {
          const p = sankalpProgress(s, state.completions, today);
          const dim = s.status !== 'active';
          return (
            <button
              key={s.id}
              className="practice"
              data-dim={dim}
              style={pc(s.color)}
              onClick={() => nav.openPractice(s.id)}
              type="button"
            >
              <div className="practice__top">
                <span className="glyph glyph--lg">{s.glyph}</span>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                  <div className="practice__name">{s.name}</div>
                  <div className="practice__meta">
                    <span>{describeFrequency(s.frequency)}</span>
                    <span className="dotsep" />
                    <span>{prettyWindow(s.time)}</span>
                    {s.targetCount ? (
                      <>
                        <span className="dotsep" />
                        <span className="row" style={{ gap: 3 }}>
                          <Target size={10} /> {s.targetCount}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                {s.status === 'active' ? (
                  <span className="badge badge--jade">
                    <Flame size={9} /> {p.streak}
                  </span>
                ) : s.status === 'paused' ? (
                  <span className="badge">
                    <Pause size={8} /> Paused
                  </span>
                ) : (
                  <span className="badge">{s.status === 'completed' ? 'Completed' : 'Stopped'}</span>
                )}
              </div>

              {s.intention && <div className="practice__intention">“{s.intention}”</div>}

              <div className="practice__progress">
                <div className="practice__barrow">
                  <div className="practice__bar">
                    <div className="practice__fill" style={{ width: `${Math.round(p.rate * 100)}%` }} />
                  </div>
                  <span className="practice__pct">{Math.round(p.rate * 100)}%</span>
                </div>
                <div
                  className="row row--between"
                  style={{ marginTop: 8, fontSize: 10.5, color: 'var(--muted)' }}
                >
                  <span>
                    {s.endsOn
                      ? `Day ${p.dayNumber} of ${p.totalDays} · ends ${formatShort(s.endsOn)}`
                      : `Ongoing since ${formatShort(s.startedOn)}`}
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    {s.status === 'active' && p.nextDue && s.reminder.enabled ? (
                      <>
                        <Clock size={10} /> next {formatShort(p.nextDue)}
                      </>
                    ) : null}
                    <ArrowRight size={11} style={{ opacity: 0.6 }} />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="card card--pad"
        style={{
          width: '100%',
          marginTop: 14,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderStyle: 'dashed',
          background: 'transparent',
          boxShadow: 'none',
          textAlign: 'left',
        }}
        onClick={() => nav.openCreate()}
        type="button"
      >
        <span className="glyph glyph--lg" style={PC_ACCENT}>
          <Plus size={19} />
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 540 }}>Take a new saṅkalpa</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            Daily, weekly, monthly, by tithi, or a single anuṣṭhāna.
          </div>
        </div>
      </button>

      <div className="card card--pad" style={{ marginTop: 22 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="glyph" style={PC_ACCENT}>
            <Sparkles size={14} />
          </span>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>
            How a sankalp works
          </div>
        </div>
        <div className="prose" style={{ fontSize: 12.5, marginTop: 10, color: 'var(--muted)' }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Start</strong> on the day you take the vow, choose an end — 21, 40, 108 days or
            open-ended — and a frequency.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Keep</strong> it by marking each day from the home screen or the calendar.
            Missing a day never erases what you have done.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Close</strong> it deliberately: completed, paused for a season, or stopped. A
            vow you end on purpose is lighter than one you quietly abandon.
          </p>
        </div>
      </div>
    </main>
  );
}
