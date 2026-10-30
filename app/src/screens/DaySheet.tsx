import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Clock, NotebookPen, Plus, Sun } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { formatLong, fromISO, MONTHS, prettyWindow, WEEKDAYS_SUN } from '../lib/date';
import { isDone, scheduledOn, tallyDay } from '../lib/schedule';
import { panchangFor } from '../lib/panchang';
import { Sheet, pc } from '../components/ui';
import { MoonGlyph } from '../components/MoonGlyph';
import { PanchangSheet } from './PanchangSheet';

export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { state, toggleComplete } = useStore();
  const nav = useNav();
  const [panchang, setPanchang] = useState(false);

  const list = useMemo(
    () => (date ? scheduledOn(state.sankalps, date) : []),
    [state.sankalps, date]
  );
  const tally = useMemo(
    () => (date ? tallyDay(state.sankalps, state.completions, date) : { due: 0, done: 0, date: '' }),
    [state.sankalps, state.completions, date]
  );
  const day = useMemo(() => (date ? panchangFor(date) : null), [date]);
  const note = date ? state.notes.find((n) => n.date === date) : undefined;

  if (!date || !day) return null;
  const phase = day.paksha === 'śukla' ? day.tithi / 60 : 1 - (day.tithi - 15) / 60;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={`${fromISO(date).getDate()} ${MONTHS[fromISO(date).getMonth()]}`}
        footer={
          <>
            <button
              className="btn btn--ghost"
              style={{ flex: 1 }}
              onClick={() => {
                onClose();
                nav.openCreate();
              }}
              type="button"
            >
              <Plus size={15} /> Anuṣṭhāna
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1.4 }}
              onClick={() => {
                onClose();
                nav.openNote({ kind: 'date', date });
              }}
              type="button"
            >
              <NotebookPen size={15} /> {note ? 'Open entry' : 'Write entry'}
            </button>
          </>
        }
      >
        <div className="row row--between" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow">{formatLong(date)}</div>
            <button
              className="tithi tithi--link"
              style={{ marginTop: 6 }}
              onClick={() => setPanchang(true)}
              type="button"
            >
              <MoonGlyph phase={phase} />
              {day.tithiName}
              <span className="tithi__end">until {day.tithiEndLabel}</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                lineHeight: 1,
                color: tally.due > 0 && tally.done === tally.due ? 'var(--jade)' : 'var(--ink)',
              }}
            >
              {tally.done}
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>/{tally.due}</span>
            </div>
            <div className="mini-label">kept</div>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="dayempty">
            Nothing was scheduled on this day.
            <br />
            Rest is also a practice.
          </div>
        ) : (
          <div className="stack gap-2">
            {list.map((s) => {
              const done = isDone(state.completions, s.id, date);
              return (
                <div key={s.id} className="pitem" data-done={done} style={{ ...pc(s.color), boxShadow: 'none' }}>
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
                      {s.targetCount ? <span className="dotsep" /> : null}
                      {s.targetCount ? `${s.targetCount} reps` : ''}
                    </div>
                  </div>
                  <button
                    className="check"
                    data-done={done}
                    onClick={() => toggleComplete(s.id, date)}
                    aria-label={done ? `Unmark ${s.name}` : `Mark ${s.name} kept`}
                    type="button"
                  >
                    <Check />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="panch-mini">
          <button className="panch-mini__row" onClick={() => setPanchang(true)} type="button">
            <span>Nakṣatra</span>
            <strong>{day.nakshatraName}</strong>
          </button>
          <button className="panch-mini__row" onClick={() => setPanchang(true)} type="button">
            <span>Sunrise · sunset</span>
            <strong>
              {day.sunriseLabel ?? '—'} · {day.sunsetLabel ?? '—'}
            </strong>
          </button>
          <button className="panch-mini__row" onClick={() => setPanchang(true)} type="button">
            <span>Yoga · karaṇa</span>
            <strong>
              {day.yogaName} · {day.karana}
            </strong>
          </button>
          {day.observance && (
            <div className="panch-mini__row panch-mini__row--obs">
              <span>Observance</span>
              <strong>{day.observance}</strong>
            </div>
          )}
        </div>

        {note && (
          <div className="card card--pad" style={{ marginTop: 16, background: 'var(--surface-2)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              From the diary
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-0.02em' }}>
              {note.title}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.6 }}>
              {note.body.replace(/[#*>`[\]]/g, '').slice(0, 150)}
              {note.body.length > 150 ? '…' : ''}
            </p>
          </div>
        )}

        <div className="mono-note" style={{ textAlign: 'center', marginTop: 14 }}>
          {WEEKDAYS_SUN[fromISO(date).getDay()]} · marks are kept even if a vow is later paused
        </div>
      </Sheet>

      <PanchangSheet date={panchang ? date : null} onClose={() => setPanchang(false)} />
    </>
  );
}
