import { Check, Clock, NotebookPen, Plus, Sun } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { COLORS, type Sankalp } from '../lib/types';
import { formatLong, fromISO, MONTHS, prettyWindow, WEEKDAYS_SUN } from '../lib/date';
import { isDone, scheduledOn, tallyDay } from '../lib/schedule';
import { moonIllumination, tithiName } from '../lib/panchang';
import { Sheet, pc } from '../components/ui';

export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { state, toggleComplete } = useStore();
  const nav = useNav();

  if (!date) return null;
  const list = scheduledOn(state.sankalps, date);
  const tally = tallyDay(state.sankalps, state.completions, date);
  const note = state.notes.find((n) => n.date === date);
  const moon = moonIllumination(fromISO(date));

  return (
    <Sheet
      open={!!date}
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
          <div className="tithi" style={{ marginTop: 6 }}>
            <span
              className="tithi__moon"
              style={{ ['--shadow-x' as string]: `${Math.round((1 - moon) * 100)}%` }}
            />
            {tithiName(fromISO(date))}
          </div>
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
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginTop: 4,
            }}
          >
            kept
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div
          style={{
            padding: '26px 18px',
            border: '1px dashed var(--line-2)',
            borderRadius: 14,
            textAlign: 'center',
            fontSize: 12.5,
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          Nothing was scheduled on this day.
          <br />
          Rest is also a practice.
        </div>
      ) : (
        <div className="stack gap-2">
          {list.map((s) => {
            const done = isDone(state.completions, s.id, date);
            return (
              <div
                key={s.id}
                className="pitem"
                data-done={done}
                style={{ ...pc(s.color), boxShadow: 'none' }}
              >
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
                  aria-label="Toggle completion"
                  type="button"
                >
                  <Check />
                </button>
              </div>
            );
          })}
        </div>
      )}

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
  );
}
