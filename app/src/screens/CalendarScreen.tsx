import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sun,
} from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import { COLORS, type Sankalp } from '../lib/types';
import {
  addDays,
  addMonths,
  daysInMonth,
  fromISO,
  isoWeekdayLabels,
  monthLabel,
  MONTHS,
  MONTHS_SHORT,
  prettyWindow,
  startOfWeek,
  toISO,
  WEEKDAYS_SUN,
  weekdayOf,
} from '../lib/date';
import { isDone, sankalpProgress, scheduledOn, tallyDay } from '../lib/schedule';
import { tithiName } from '../lib/panchang';
import { Segmented, Empty, PC_ACCENT, pc } from '../components/ui';

type View = 'day' | 'week' | 'month' | 'year';

export function CalendarScreen() {
  const { state, toggleComplete, pushToast } = useStore();
  const nav = useNav();
  const today = useToday();
  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);

  const monthDate = fromISO(anchor);
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();

  const shift = (dir: number) => {
    if (view === 'day') {
      const next = addDays(anchor, dir);
      setAnchor(next);
      setSelected(next);
    } else if (view === 'week') {
      const next = addDays(anchor, dir * 7);
      setAnchor(next);
      setSelected(next);
    } else if (view === 'month') {
      setAnchor(addMonths(anchor, dir));
    } else {
      setAnchor(addMonths(anchor, dir * 12));
    }
  };

  const heading =
    view === 'year'
      ? String(y)
      : view === 'day'
      ? `${WEEKDAYS_SUN[weekdayOf(anchor)]}, ${fromISO(anchor).getDate()} ${MONTHS_SHORT[m]} ${y}`
      : monthLabel(anchor);

  const monthCells = useMemo(() => {
    const first = toISO(new Date(y, m, 1));
    const start = startOfWeek(first, state.settings.weekStartsMonday);
    const cells: { iso: string; outside: boolean }[] = [];
    const total = 42;
    for (let i = 0; i < total; i++) {
      const iso = addDays(start, i);
      cells.push({ iso, outside: fromISO(iso).getMonth() !== m });
    }
    return cells;
  }, [y, m, state.settings.weekStartsMonday]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, state.settings.weekStartsMonday);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor, state.settings.weekStartsMonday]);

  const dayList = scheduledOn(state.sankalps, selected);

  return (
    <main className="screen">
      <div className="screen__head" style={{ paddingBottom: 10 }}>
        <div className="eyebrow">The long view</div>
        <h1 className="title">Calendar</h1>
      </div>

      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
      />

      <div className="calhead">
        <div className="calhead__month">{heading}</div>
        <div className="calhead__nav">
          <button className="iconbtn" onClick={() => shift(-1)} aria-label="Previous" type="button">
            <ChevronLeft />
          </button>
          <button
            className="iconbtn"
            style={{ fontSize: 11, fontWeight: 620, width: 'auto', padding: '0 10px', borderRadius: 999 }}
            onClick={() => {
              setAnchor(today);
              setSelected(today);
            }}
            type="button"
          >
            Today
          </button>
          <button className="iconbtn" onClick={() => shift(1)} aria-label="Next" type="button">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* ── Month ─────────────────────────────────────────────────────── */}
      {view === 'month' && (
        <>
          <div className="weekrow">
            {isoWeekdayLabels(state.settings.weekStartsMonday).map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="month">
            {monthCells.map(({ iso, outside }) => {
              const list = scheduledOn(state.sankalps, iso);
              const done = list.filter((s) => isDone(state.completions, s.id, iso)).length;
              const shown = list.slice(0, 3);
              return (
                <button
                  key={iso}
                  className="day"
                  data-outside={outside}
                  data-today={iso === today}
                  data-selected={iso === selected}
                  onClick={() => {
                    setSelected(iso);
                    if (outside) setAnchor(iso);
                  }}
                  type="button"
                >
                  <span className="day__num">{fromISO(iso).getDate()}</span>
                  <span className="day__dots">
                    {shown.map((s) => (
                      <span
                        key={s.id}
                        className="pm-dot"
                        data-done={isDone(state.completions, s.id, iso)}
                        style={{
                          ...pc(s.color),
                          opacity: isDone(state.completions, s.id, iso) ? 1 : 0.42,
                        }}
                      />
                    ))}
                    {list.length > 3 && <span className="pm-dot pm-dot--more" />}
                    {list.length === 0 && outside === false && null}
                  </span>
                  {list.length > 0 && done === list.length && iso !== selected ? (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 11,
                        background: 'color-mix(in oklab, var(--jade) 9%, transparent)',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="legend">
            <span>
              <i className="legend__sq" style={{ background: 'var(--accent)', opacity: 0.42 }} />
              scheduled
            </span>
            <span>
              <i className="legend__sq" style={{ background: 'var(--accent)' }} />
              kept
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <i className="legend__sq" style={{ background: 'var(--jade-soft)' }} />
              all kept
            </span>
          </div>
        </>
      )}

      {/* ── Week ──────────────────────────────────────────────────────── */}
      {view === 'week' && (
        <div className="weekgrid">
          {weekDays.map((iso) => {
            const list = scheduledOn(state.sankalps, iso);
            return (
              <button
                key={iso}
                className="weekcol"
                data-selected={iso === selected}
                data-today={iso === today}
                onClick={() => setSelected(iso)}
                type="button"
              >
                <span className="weekcol__wd">{WEEKDAYS_SUN[weekdayOf(iso)].slice(0, 2)}</span>
                <span className="weekcol__num">{fromISO(iso).getDate()}</span>
                <div className="weekcol__bars">
                  {list.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="wbar"
                      data-done={isDone(state.completions, s.id, iso)}
                      style={pc(s.color)}
                    />
                  ))}
                  {list.length === 0 && (
                    <span style={{ fontSize: 9, color: 'var(--muted-2)' }}>—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Day timeline ──────────────────────────────────────────────── */}
      {view === 'day' && (
        <>
          {dayList.length === 0 ? (
            <div className="mt-3">
              <Empty glyph="◦">A clear day. Rest is also a practice.</Empty>
            </div>
          ) : (
            <div className="timeline">
              {dayList.map((s) => {
                const done = isDone(state.completions, s.id, anchor);
                return (
                  <div
                    key={s.id}
                    className="tlrow"
                    data-done={done}
                    style={pc(s.color)}
                  >
                    <span className="tlrow__time">{s.time ? prettyWindow(s.time).split(' – ')[0] : '·'}</span>
                    <span className="tlrow__dot" />
                    <div className="pitem" style={{ border: '1px solid var(--line)' }}>
                      <span className="glyph">{s.glyph}</span>
                      <div className="pitem__body">
                        <div className="pitem__name">{s.name}</div>
                        <div className="pitem__meta">
                          {s.time ? (
                            <>
                              <Clock /> {prettyWindow(s.time)}
                            </>
                          ) : (
                            <>
                              <Sun /> Anytime
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        className="check"
                        data-done={done}
                        onClick={() => toggleComplete(s.id, anchor)}
                        aria-label="Toggle"
                        type="button"
                      >
                        <Check />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Year ──────────────────────────────────────────────────────── */}
      {view === 'year' && (
        <div className="yeargrid">
          {MONTHS.map((label, mi) => {
            const last = daysInMonth(y, mi);
            const offset = (new Date(y, mi, 1).getDay() + (state.settings.weekStartsMonday ? 6 : 0)) % 7;
            return (
              <button
                key={label}
                className="minimonth"
                data-current={mi === m}
                onClick={() => {
                  setAnchor(toISO(new Date(y, mi, 1)));
                  setView('month');
                }}
                type="button"
              >
                <div className="minimonth__label">{MONTHS_SHORT[mi]}</div>
                <div className="minimonth__grid">
                  {Array.from({ length: offset }, (_, i) => (
                    <span key={`b${i}`} className="mini" data-blank="true" />
                  ))}
                  {Array.from({ length: last }, (_, i) => {
                    const iso = toISO(new Date(y, mi, i + 1));
                    const t = tallyDay(state.sankalps, state.completions, iso);
                    const ratio = t.due ? t.done / t.due : 0;
                    const level = t.due === 0 ? 0 : ratio === 1 ? 4 : ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
                    return (
                      <span
                        key={iso}
                        className="mini"
                        data-level={level}
                        title={`${iso}${t.due ? ` · ${t.done}/${t.due}` : ''}`}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Selected day preview ──────────────────────────────────────── */}
      {view !== 'day' && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">
              {selected === today ? 'Today' : WEEKDAYS_SUN[weekdayOf(selected)]}
            </div>
            <button className="linkbtn" onClick={() => nav.openDay(selected)} type="button">
              Details <ArrowUpRight />
            </button>
          </div>

          <div className="card card--pad" style={{ paddingBottom: 14 }}>
            <div className="row row--between" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, letterSpacing: '-0.02em' }}>
                  {fromISO(selected).getDate()} {MONTHS[fromISO(selected).getMonth()]}
                </div>
                <div className="tithi" style={{ marginTop: 3 }}>
                  <span className="tithi__moon" />
                  {tithiName(fromISO(selected))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color:
                      dayList.length && dayList.every((s) => isDone(state.completions, s.id, selected))
                        ? 'var(--jade)'
                        : 'var(--ink)',
                  }}
                >
                  {dayList.filter((s) => isDone(state.completions, s.id, selected)).length}
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>/{dayList.length}</span>
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  kept
                </div>
              </div>
            </div>

            {dayList.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '6px 0 2px' }}>
                Nothing scheduled. You can add a one-time anuṣṭhāna for this day.
              </div>
            ) : (
              <div className="stack gap-2">
                {dayList.map((s) => {
                  const done = isDone(state.completions, s.id, selected);
                  const p = sankalpProgress(s, state.completions, selected);
                  return (
                    <div key={s.id} className="row" style={pc(s.color)}>
                      <span className="glyph" style={{ width: 26, height: 26, fontSize: 12 }}>
                        {s.glyph}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 520,
                            letterSpacing: '-0.01em',
                            color: done ? 'var(--muted)' : 'var(--ink)',
                            textDecoration: done ? 'none' : 'none',
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                          {s.time ? prettyWindow(s.time) : 'Anytime'} · {Math.round(p.rate * 100)}%
                        </div>
                      </div>
                      <button
                        className="check"
                        style={{ width: 26, height: 26 }}
                        data-done={done}
                        onClick={() => {
                          toggleComplete(s.id, selected);
                          if (!done) pushToast({ text: 'Marked complete', sub: s.name, icon: 'check' });
                        }}
                        aria-label="Toggle"
                        type="button"
                      >
                        <Check />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="btn btn--quiet btn--block"
              style={{ marginTop: 10, height: 34, justifyContent: 'flex-start', paddingLeft: 0 }}
              onClick={() => nav.openCreate()}
              type="button"
            >
              <Plus size={14} /> Add a special anuṣṭhāna
            </button>
          </div>
        </section>
      )}

      <div style={{ height: 12 }} />
    </main>
  );
}
