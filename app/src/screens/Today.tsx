import { useMemo } from 'react';
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
  Target,
} from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import { COLORS, type Sankalp } from '../lib/types';
import {
  addDays,
  greeting,
  prettyTime,
  prettyWindow,
  todayISO,
  formatLong,
  WEEKDAYS_SUN,
  fromISO,
} from '../lib/date';
import {
  consistency,
  currentStreak,
  isDone,
  sankalpProgress,
  scheduledOn,
  tallyDay,
} from '../lib/schedule';
import { moonIllumination, tithiName } from '../lib/panchang';
import type { LiveReminder } from '../hooks/useReminders';
import { Empty, IconButton, PC_ACCENT, Ring, pc } from '../components/ui';

export function TodayScreen({ reminders }: { reminders: LiveReminder[] }) {
  const { state, toggleComplete, updateSettings, snooze, acknowledge, pushToast } = useStore();
  const nav = useNav();
  const today = useToday();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

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
  const active = state.sankalps.filter((s) => s.status === 'active');

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i)),
    [today]
  );
  const maxDue = Math.max(1, ...week.map((iso) => tallyDay(state.sankalps, state.completions, iso).due));

  const soonest = reminders[0];
  const todayNote = state.notes.find((n) => n.date === today);

  const cycleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    updateSettings({ theme: next });
    pushToast({ text: `${next === 'dark' ? 'Dark' : 'Light'} appearance`, icon: 'info' });
  };

  const noon = new Date();
  const moon = moonIllumination(noon);

  return (
    <main className="screen">
      <div className="topbar">
        <div className="eyebrow">{formatLong(today)}</div>
        <div className="topbar__actions">
          <IconButton label="Change appearance" onClick={cycleTheme}>
            {isDark ? <Sun /> : <Moon />}
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
          <span className="tithi">
            <span
              className="tithi__moon"
              style={{ ['--shadow-x' as string]: `${Math.round((1 - moon) * 100)}%` }}
            />
            {tithiName(noon)}
          </span>
          <span className="dotsep" />
          <span>
            {scheduled.length
              ? `${doneCount} of ${scheduled.length} kept`
              : 'Nothing scheduled today'}
          </span>
        </div>
      </header>

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
                pushToast({
                  text: 'Snoozed',
                  sub: `${soonest.snoozeMinutes} min`,
                  icon: 'bell',
                });
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

      <section className="stats rise">
        <div className="stat stat--accent">
          <div className="stat__label">Streak</div>
          <div className="stat__value">
            {streak}
            <small>days</small>
          </div>
          <div className="stat__sub">
            {streak > 1 ? 'keep it unbroken' : 'begin again today'}
          </div>
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
          <Empty glyph="◦">
            No practice is scheduled today.
            <br />
            Take a small vow and it will meet you here tomorrow.
            <div style={{ marginTop: 14 }}>
              <button className="btn btn--ghost" onClick={() => nav.openCreate()} type="button">
                <Plus /> New sankalp
              </button>
            </div>
          </Empty>
        ) : (
          <div className="daylist">
            {scheduled.map((s) => {
              const done = isDone(state.completions, s.id, today);
              return (
                <div
                  key={s.id}
                  className="pitem"
                  data-done={done}
                  style={pc(s.color)}
                >
                  <button
                    onClick={() => nav.openPractice(s.id)}
                    className="glyph glyph--lg"
                    aria-label={`Open ${s.name}`}
                    type="button"
                  >
                    {s.glyph}
                  </button>
                  <div className="pitem__body" onClick={() => nav.openPractice(s.id)}>
                    <div className="pitem__name">{s.name}</div>
                    <div className="pitem__meta">
                      {s.time ? (
                        <>
                          <Clock />
                          {prettyWindow(s.time)}
                        </>
                      ) : (
                        <>
                          <Sun />
                          Anytime today
                        </>
                      )}
                      {s.targetCount ? (
                        <>
                          <span className="dotsep" />
                          <Target />
                          {s.targetCount}
                        </>
                      ) : null}
                    </div>
                  </div>
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
                        pushToast({
                          text: 'Marked complete',
                          sub: s.name,
                          icon: 'check',
                        });
                    }}
                    aria-label={done ? `Unmark ${s.name}` : `Mark ${s.name} complete`}
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
            Calendar <ArrowUpRight />
          </button>
        </div>
        <div className="card card--pad" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {week.map((iso) => {
            const t = tallyDay(state.sankalps, state.completions, iso);
            const ratio = t.due ? t.done / t.due : 0;
            const h = 8 + Math.round((t.due ? ratio : 0) * 34);
            const isToday = iso === todayISO();
            return (
              <button
                key={iso}
                onClick={() => nav.openDay(iso)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  height: 78,
                  justifyContent: 'flex-end',
                }}
                type="button"
              >
                <span
                  style={{
                    width: '100%',
                    maxWidth: 22,
                    height: `${h}px`,
                    borderRadius: 6,
                    background:
                      ratio === 1
                        ? 'var(--accent)'
                        : ratio > 0
                        ? `color-mix(in oklab, var(--accent) ${25 + ratio * 55}%, var(--surface-3))`
                        : 'var(--surface-3)',
                    transition: 'height .5s cubic-bezier(.22,1,.36,1)',
                  }}
                />
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: isToday ? 700 : 550,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: isToday ? 'var(--accent)' : 'var(--muted-2)',
                  }}
                >
                  {WEEKDAYS_SUN[fromISO(iso).getDay()].slice(0, 1)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mono-note" style={{ marginTop: 8 }}>
          Taller bars are days you kept every vow. {maxDue} practice{maxDue === 1 ? '' : 's'} at most
          in a day.
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <div className="section__title">Sankalp in force</div>
          <button className="linkbtn" onClick={() => nav.setTab('practices')} type="button">
            All <ArrowUpRight />
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
                      <Flame /> {p.streak}
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
          className="card card--pad"
          style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}
          onClick={() => nav.openNote({ kind: 'date', date: today })}
          type="button"
        >
          <span className="glyph glyph--lg" style={PC_ACCENT}>
            <NotebookPen size={17} strokeWidth={1.7} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="section__title" style={{ marginBottom: 4 }}>
              Diary
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 520, letterSpacing: '-0.01em' }}>
              {todayNote
                ? `Continue “${todayNote.title}”`
                : 'Write today’s entry'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {todayNote
                ? 'Kept locally. Markdown, links and tags.'
                : 'A few honest lines are enough.'}
            </div>
          </div>
          <ArrowUpRight size={16} strokeWidth={1.9} color="var(--muted-2)" />
        </button>
      </section>

      <p
        className="center"
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 12.5,
          color: 'var(--muted-2)',
          marginTop: 30,
          lineHeight: 1.6,
        }}
      >
        A little, every day — that is the whole method.
      </p>
    </main>
  );
}
