import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BellRing,
  Clock,
  Flame,
  Moon,
  NotebookPen,
  Plus,
  Settings2,
  Sun,
  Sunrise,
  Sunset,
  Target,
} from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import { useResolvedTheme } from '../hooks/useTheme';
import type { Sankalp } from '../lib/types';
import {
  addDays,
  formatLong,
  fromISO,
  greeting,
  prettyTime,
  prettyWindow,
  WEEKDAYS_SUN,
} from '../lib/date';
import {
  consistency,
  currentStreak,
  isDone,
  sankalpProgress,
  scheduledOn,
  tallyDay,
} from '../lib/schedule';
import { panchangFor } from '../lib/panchang';
import { prettyDuration } from '../lib/location';
import type { LiveReminder } from '../hooks/useReminders';
import { Empty, IconButton, PC_ACCENT, Ring, pc } from '../components/ui';
import { MoonGlyph } from '../components/MoonGlyph';
import { PanchangSheet } from './PanchangSheet';

export function TodayScreen({ reminders }: { reminders: LiveReminder[] }) {
  const { state, toggleComplete, updateSettings, snooze, acknowledge, pushToast } = useStore();
  const nav = useNav();
  const today = useToday();
  const theme = useResolvedTheme(state.settings.theme);
  const [panchangOpen, setPanchangOpen] = useState(false);

  const day = useMemo(() => panchangFor(today), [today]);
  const scheduled = useMemo(() => scheduledOn(state.sankalps, today), [state.sankalps, today]);
  const doneCount = scheduled.filter((s) => isDone(state.completions, s.id, today)).length;
  const progress = scheduled.length ? doneCount / scheduled.length : 0;

  const streak = useMemo(
    () => currentStreak(state.sankalps, state.completions, today),
    [state.sankalps, state.completions, today]
  );
  const weekRate = useMemo(
    () => consistency(state.sankalps, state.completions, addDays(today, -6), today),
    [state.sankalps, state.completions, today]
  );
  const active = useMemo(
    () => state.sankalps.filter((s) => s.status === 'active'),
    [state.sankalps]
  );
  const hasAnyVow = state.sankalps.length > 0;

  const week = useMemo(() => {
    const out: { date: string; due: number; done: number }[] = [];
    for (let i = -6; i <= 0; i++) {
      out.push(tallyDay(state.sankalps, state.completions, addDays(today, i)));
    }
    return out;
  }, [state.sankalps, state.completions, today]);

  const soonest = reminders[0];
  const todayNote = state.notes.find((n) => n.date === today);
  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
    pushToast({ text: `${next === 'dark' ? 'Night' : 'Paper'} appearance`, icon: 'info' });
  };

  const phase = day.paksha === 'śukla' ? day.tithi / 60 : 1 - (day.tithi - 15) / 60;

  return (
    <>
      <main className="screen">
        <div className="topbar">
          <div className="eyebrow">{formatLong(today)}</div>
          <div className="topbar__actions">
            <IconButton label="Change appearance" onClick={cycleTheme}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </IconButton>
            <IconButton label="Settings" onClick={nav.openSettings}>
              <Settings2 />
            </IconButton>
          </div>
        </div>

        <header className="greet rise">
          <div className="eyebrow">{greeting()}</div>
          <h1 className="greet__name">
            {state.settings.name ? (
              <>
                {greeting() === 'Still awake' ? 'Rest soon, ' : ''}
                <em>{state.settings.name}</em>
              </>
            ) : (
              <>Your practice</>
            )}
          </h1>
          <div className="greet__meta">
            <span>
              {scheduled.length
                ? `${doneCount} of ${scheduled.length} kept`
                : 'Nothing scheduled today'}
            </span>
            <span className="dotsep" />
            <span>{active.length} {active.length === 1 ? 'vow' : 'vows'} in force</span>
          </div>
        </header>

        {/* ── Pañcāṅga ─────────────────────────────────────────────── */}
        <button
          className="panchcard rise"
          onClick={() => setPanchangOpen(true)}
          aria-label={`Pañcāṅga: ${day.tithiName}. Open details.`}
          type="button"
        >
          <span className="panchcard__moon">
            <Ring value={day.illumination} size={38} stroke={2.5} color="var(--accent)" track="var(--surface-3)">
              <MoonGlyph phase={phase} size={20} className="tithi__moon" />
            </Ring>
          </span>
          <span className="panchcard__body">
            <span className="panchcard__tithi">{day.tithiName}</span>
            <span className="panchcard__meta">
              until {day.tithiEndLabel} · {day.nakshatraName}
              {day.observance ? ` · ${day.observance}` : ''}
            </span>
          </span>
          <span className="panchcard__sun">
            <span>
              <Sunrise size={11} /> {day.sunriseLabel ?? '—'}
            </span>
            <span>
              <Sunset size={11} /> {day.sunsetLabel ?? '—'}
            </span>
          </span>
          <ArrowUpRight size={14} className="panchcard__chev" />
        </button>

        {soonest && (
          <div className="reminder">
            <span className="reminder__icon">
              <BellRing />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="reminder__title">
                {prettyTime(
                  `${String(soonest.startsAt.getHours()).padStart(2, '0')}:${String(
                    soonest.startsAt.getMinutes()
                  ).padStart(2, '0')}`
                )}{' '}
                · {soonest.name}
              </div>
              <div className="reminder__body">
                Starts in{' '}
                {Math.max(0, Math.round((soonest.startsAt.getTime() - Date.now()) / 60000))} min
              </div>
            </div>
            <div className="reminder__actions">
              <button
                className="minibtn"
                onClick={() => {
                  snooze(soonest.key, soonest.snoozeMinutes);
                  pushToast({ text: 'Snoozed', sub: `${soonest.snoozeMinutes} min`, icon: 'bell' });
                }}
                type="button"
              >
                Snooze
              </button>
              <button
                className="minibtn"
                onClick={() => {
                  toggleComplete(soonest.sankalpId, today);
                  acknowledge(soonest.key);
                }}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <section className="stats rise" aria-label="At a glance">
          <div className="stat stat--accent">
            <div className="stat__label">Streak</div>
            <div className="stat__value">
              {streak}
              <small>{streak === 1 ? 'day' : 'days'}</small>
            </div>
            <div className="stat__sub">{streak > 1 ? 'unbroken' : 'a beginning'}</div>
          </div>
          <div className="stat">
            <div className="stat__label">7 days</div>
            <div className="stat__value">
              {Math.round(weekRate * 100)}
              <small>%</small>
            </div>
            <div className="stat__sub">kept</div>
          </div>
          <div className="stat">
            <div className="stat__label">Vows</div>
            <div className="stat__value">{active.length}</div>
            <div className="stat__sub">in force</div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div className="section__title">Today&rsquo;s practice</div>
            {scheduled.length > 0 && (
              <Ring value={progress} size={26} stroke={2.6}>
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 650,
                    fontVariantNumeric: 'tabular-nums',
                    color: progress === 1 ? 'var(--jade)' : 'var(--ink)',
                  }}
                >
                  {doneCount}/{scheduled.length}
                </span>
              </Ring>
            )}
          </div>

          {scheduled.length === 0 ? (
            hasAnyVow ? (
              <Empty glyph="◦">
                Nothing falls today. A clear day is part of the rhythm — rest is also a practice.
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn--ghost" onClick={() => nav.openCreate()} type="button">
                    <Plus size={15} /> Add an anuṣṭhāna
                  </button>
                </div>
              </Empty>
            ) : (
              <div className="firstvow">
                <div className="firstvow__glyph">ॐ</div>
                <h2>Take your first saṅkalpa</h2>
                <p>
                  A vow with edges: a day it begins, a rhythm, and a day it rests. Ten minutes,
                  daily, is enough to start.
                </p>
                <button className="btn btn--primary" onClick={() => nav.openCreate()} type="button">
                  <Plus size={15} /> Take a vow
                </button>
              </div>
            )
          ) : (
            <div className="daylist">
              {scheduled.map((s) => {
                const done = isDone(state.completions, s.id, today);
                const count = state.completions[`${s.id}::${today}`]?.count ?? 0;
                return (
                  <div key={s.id} className="pitem" data-done={done} style={pc(s.color)}>
                    <button
                      onClick={() => nav.openPractice(s.id)}
                      className="glyph glyph--lg"
                      aria-label={`Open ${s.name}`}
                      type="button"
                    >
                      {s.glyph}
                    </button>
                    <button className="pitem__body" onClick={() => nav.openPractice(s.id)} type="button">
                      <span className="pitem__name">{s.name}</span>
                      <span className="pitem__meta">
                        {s.time ? (
                          <>
                            <Clock /> {prettyWindow(s.time)}
                          </>
                        ) : (
                          <>
                            <Sun /> Anytime today
                          </>
                        )}
                        {s.targetCount ? (
                          <>
                            <span className="dotsep" />
                            <Target />
                            {count > 0 ? `${count} / ${s.targetCount}` : s.targetCount}
                          </>
                        ) : null}
                      </span>
                    </button>
                    {s.reminder.enabled && (
                      <button
                        className="pitem__bell"
                        data-active={s.reminder.enabled}
                        aria-label="Reminder is on"
                        onClick={() =>
                          pushToast({
                            text: `${s.reminder.leadMinutes} min before`,
                            sub: s.name,
                            icon: 'bell',
                          })
                        }
                        type="button"
                      >
                        <Bell />
                      </button>
                    )}
                    <button
                      className="check"
                      data-done={done}
                      onClick={() => {
                        toggleComplete(s.id, today);
                        if (!done)
                          pushToast({ text: 'Marked kept', sub: s.name, icon: 'check' });
                      }}
                      aria-label={done ? `Unmark ${s.name}` : `Mark ${s.name} kept`}
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section__head">
            <div className="section__title">This week</div>
            <button className="linkbtn" onClick={() => nav.setTab('calendar')} type="button">
              Calendar <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="card card--pad weekbars">
            {week.map(({ date: iso, due, done }) => {
              const ratio = due ? done / due : 0;
              const h = 8 + Math.round(ratio * 34);
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  onClick={() => nav.openDay(iso)}
                  className="weekbars__col"
                  aria-label={`${iso}: ${done} of ${due} kept`}
                  type="button"
                >
                  <span
                    className="weekbars__bar"
                    style={{
                      height: `${h}px`,
                      background:
                        ratio === 1
                          ? 'var(--accent)'
                          : ratio > 0
                          ? `color-mix(in oklab, var(--accent) ${25 + ratio * 55}%, var(--surface-3))`
                          : 'var(--surface-3)',
                    }}
                  />
                  <span className="weekbars__day" data-today={isToday}>
                    {WEEKDAYS_SUN[fromISO(iso).getDay()].slice(0, 1)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mono-note" style={{ marginTop: 8 }}>
            Taller bars are days you kept every vow. A day with nothing due stays blank.
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div className="section__title">Saṅkalpa in force</div>
            <button className="linkbtn" onClick={() => nav.setTab('practices')} type="button">
              All <ArrowUpRight size={12} />
            </button>
          </div>
          {active.length === 0 ? (
            <Empty glyph="✦">No vows in force. Begin with one that fits your worst day.</Empty>
          ) : (
            <div className="strip">
              {active.map((s) => {
                const p = sankalpProgress(s, state.completions, today);
                return (
                  <button
                    key={s.id}
                    className="stripecard"
                    style={pc(s.color)}
                    onClick={() => nav.openPractice(s.id)}
                    type="button"
                  >
                    <div className="stripecard__top">
                      <span className="glyph">{s.glyph}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="stripecard__name">{s.name}</div>
                        <div className="stripecard__meta">
                          Day {p.dayNumber}
                          {s.endsOn ? ` of ${p.totalDays}` : ' · ongoing'}
                        </div>
                      </div>
                    </div>
                    <div className="stripecard__bar">
                      <div
                        className="stripecard__fill"
                        style={{ width: `${Math.round(p.rate * 100)}%` }}
                      />
                    </div>
                    <div className="stripecard__foot">
                      <span>{Math.round(p.rate * 100)}% kept</span>
                      <span className="stripecard__streak">
                        <Flame size={10} /> {p.streak}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="section">
          <button
            className="card card--pad diarycard"
            onClick={() => nav.openNote({ kind: 'date', date: today })}
            type="button"
          >
            <span className="glyph glyph--lg" style={PC_ACCENT}>
              <NotebookPen size={17} strokeWidth={1.7} />
            </span>
            <span className="diarycard__body">
              <span className="section__title">Diary</span>
              <span className="diarycard__title">
                {todayNote ? `Continue “${todayNote.title}”` : 'Write today’s entry'}
              </span>
              <span className="diarycard__sub">
                {day.dayLengthMinutes
                  ? `${prettyDuration(day.dayLengthMinutes)} of daylight · a few honest lines are enough`
                  : 'A few honest lines are enough.'}
              </span>
            </span>
            <ArrowUpRight size={16} strokeWidth={1.9} color="var(--muted-2)" />
          </button>
        </section>

        <p className="today__quote">A little, every day — that is the whole method.</p>
      </main>

      <PanchangSheet date={panchangOpen ? today : null} onClose={() => setPanchangOpen(false)} />
    </>
  );
}
