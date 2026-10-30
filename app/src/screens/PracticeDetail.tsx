import { useMemo } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Pause,
  Pencil,
  Play,
  Target,
  Trash2,
} from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { useNav } from '../lib/nav';
import { COLORS, type Sankalp } from '../lib/types';
import { addDays, formatShort, prettyWindow } from '../lib/date';
import { describeFrequency } from '../lib/format';
import { isDone, occKey, sankalpProgress, scheduledOn } from '../lib/schedule';
import { PC_ACCENT, Sheet } from '../components/ui';

export function PracticeDetail({
  sankalp,
  onClose,
}: {
  sankalp: Sankalp | null;
  onClose: () => void;
}) {
  const { state, setStatus, deleteSankalp, toggleComplete, setCount, pushToast } = useStore();
  const nav = useNav();
  const today = useToday();

  const p = useMemo(
    () => (sankalp ? sankalpProgress(sankalp, state.completions, today) : null),
    [sankalp, state.completions, today]
  );

  const last14 = useMemo(() => {
    if (!sankalp) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const iso = addDays(today, -13 + i);
      const due = scheduledOn([sankalp], iso).length > 0;
      return { iso, due, done: due && isDone(state.completions, sankalp.id, iso) };
    });
  }, [sankalp, state.completions, today]);

  if (!sankalp || !p) return null;
  const accent = `light-dark(${COLORS[sankalp.color].light}, ${COLORS[sankalp.color].dark})`;
  const doneToday = isDone(state.completions, sankalp.id, today);
  const todayCount = state.completions[occKey(sankalp.id, today)]?.count ?? 0;
  const active = sankalp.status === 'active';

  return (
    <Sheet open={!!sankalp} onClose={onClose} title="" footer={undefined}>
      <div style={{ ['--pc' as string]: accent, marginTop: -8 }}>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span className="glyph glyph--lg">{sankalp.glyph}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                fontWeight: 400,
                letterSpacing: '-0.025em',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {sankalp.name}
            </h2>
            <div className="practice__meta" style={{ marginTop: 5 }}>
              <span>{describeFrequency(sankalp.frequency)}</span>
              <span className="dotsep" />
              <span>{prettyWindow(sankalp.time)}</span>
              {sankalp.targetCount ? (
                <>
                  <span className="dotsep" />
                  <span className="row" style={{ gap: 3 }}>
                    <Target size={10} /> {sankalp.targetCount}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <span className={'badge ' + (active ? 'badge--jade' : '')}>
            {sankalp.status === 'active' ? 'In force' : sankalp.status}
          </span>
        </div>

        {sankalp.intention && (
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 14.5,
              color: 'var(--muted)',
              lineHeight: 1.6,
              margin: '16px 0 0',
              paddingLeft: 12,
              borderLeft: '2px solid var(--accent-line)',
            }}
          >
            {sankalp.intention}
          </p>
        )}

        {/* stats */}
        <div className="stats" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 18 }}>
          <div className="stat" style={{ background: 'var(--surface-2)' }}>
            <div className="stat__label">Streak</div>
            <div className="stat__value" style={{ color: accent }}>
              {p.streak}
              <small>d</small>
            </div>
          </div>
          <div className="stat" style={{ background: 'var(--surface-2)' }}>
            <div className="stat__label">Kept</div>
            <div className="stat__value">
              {Math.round(p.rate * 100)}
              <small>%</small>
            </div>
          </div>
          <div className="stat" style={{ background: 'var(--surface-2)' }}>
            <div className="stat__label">Days</div>
            <div className="stat__value" style={{ fontSize: 20 }}>
              {p.done}
              <small>/{p.due}</small>
            </div>
          </div>
        </div>

        {/* 14 day strip */}
        <div className="mt-4">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Last fourteen days
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {last14.map(({ iso, due, done }) => (
              <div
                key={iso}
                title={iso}
                style={{
                  flex: 1,
                  height: 26,
                  borderRadius: 6,
                  background: !due
                    ? 'var(--surface-3)'
                    : done
                    ? accent
                    : 'color-mix(in oklab, var(--line-2) 60%, transparent)',
                  opacity: !due ? 0.5 : 1,
                }}
              />
            ))}
          </div>
          <div className="row row--between" style={{ marginTop: 6, fontSize: 10, color: 'var(--muted-2)' }}>
            <span>{formatShort(last14[0]?.iso ?? today)}</span>
            <span>today</span>
          </div>
        </div>

        {/* schedule details */}
        <div className="card card--pad" style={{ marginTop: 18, background: 'var(--surface-2)' }}>
          <div className="kv">
            <span>Saṅkalpa day</span>
            <span>{formatShort(sankalp.startedOn)}</span>
          </div>
          <div className="kv">
            <span>Ends</span>
            <span>{sankalp.endsOn ? formatShort(sankalp.endsOn) : 'Ongoing'}</span>
          </div>
          <div className="kv">
            <span>Rhythm</span>
            <span>{describeFrequency(sankalp.frequency)}</span>
          </div>
          <div className="kv">
            <span>Window</span>
            <span>{prettyWindow(sankalp.time)}</span>
          </div>
          <div className="kv">
            <span>Reminder</span>
            <span>
              {sankalp.reminder.enabled
                ? `${sankalp.reminder.leadMinutes} min before · snooze ${
                    sankalp.reminder.snoozeMinutes
                  }m`
                : 'Off'}
            </span>
          </div>
          <div className="kv">
            <span>Next</span>
            <span>{p.nextDue ? formatShort(p.nextDue) : '—'}</span>
          </div>
        </div>

        {/* repetition counter */}
        {sankalp.targetCount && active && (
          <div className="card card--pad" style={{ marginTop: 14, background: 'var(--surface-2)', paddingBottom: 12 }}>
            <div className="row row--between">
              <div>
                <div className="eyebrow">Repetitions today</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 23, letterSpacing: '-0.02em', marginTop: 2 }}>
                  {todayCount}
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}> / {sankalp.targetCount}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn btn--ghost"
                  style={{ width: 40, height: 40, padding: 0, borderRadius: 999 }}
                  onClick={() => setCount(sankalp.id, today, Math.max(0, todayCount - 9))}
                  aria-label="Remove nine"
                  type="button"
                >
                  −
                </button>
                <button
                  className="btn btn--accent"
                  style={{ height: 40, padding: '0 14px' }}
                  onClick={() => setCount(sankalp.id, today, todayCount + 1)}
                  type="button"
                >
                  +1
                </button>
              </div>
            </div>
            <div className="practice__bar" style={{ marginTop: 10 }}>
              <div
                className="practice__fill"
                style={{ width: `${Math.min(100, (todayCount / sankalp.targetCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* today toggle */}
        {active && (
          <button
            className={doneToday ? 'btn btn--ghost btn--block mt-4' : 'btn btn--primary btn--block mt-4'}
            onClick={() => {
              toggleComplete(sankalp.id, today);
              pushToast({
                text: doneToday ? 'Mark removed' : 'Marked complete',
                sub: sankalp.name,
                icon: doneToday ? 'info' : 'check',
              });
            }}
            style={doneToday ? { color: 'var(--jade)', borderColor: 'var(--jade)' } : undefined}
            type="button"
          >
            {doneToday ? <Check /> : <CheckCircle2 />}
            {doneToday ? 'Kept today — undo' : 'Mark today as kept'}
          </button>
        )}

        {/* actions */}
        <div className="row gap-2 mt-3" style={{ gap: 8 }}>
          <button
            className="btn btn--ghost"
            style={{ flex: 1, height: 40, fontSize: 12.5 }}
            onClick={() => {
              onClose();
              nav.openCreate(sankalp);
            }}
            type="button"
          >
            <Pencil size={13} /> Edit
          </button>
          {active ? (
            <button
              className="btn btn--ghost"
              style={{ flex: 1, height: 40, fontSize: 12.5 }}
              onClick={() => {
                setStatus(sankalp.id, 'paused');
                pushToast({ text: 'Paused', sub: 'no new days scheduled', icon: 'info' });
                onClose();
              }}
              type="button"
            >
              <Pause size={13} /> Pause
            </button>
          ) : sankalp.status === 'paused' ? (
            <button
              className="btn btn--ghost"
              style={{ flex: 1, height: 40, fontSize: 12.5 }}
              onClick={() => {
                setStatus(sankalp.id, 'active');
                pushToast({ text: 'Resumed', icon: 'check' });
                onClose();
              }}
              type="button"
            >
              <Play size={13} /> Resume
            </button>
          ) : null}
        </div>

        {active && (
          <div className="row gap-2 mt-2" style={{ gap: 8 }}>
            <button
              className="btn btn--ghost"
              style={{ flex: 1, height: 40, fontSize: 12.5 }}
              onClick={() => {
                if (confirm(`Close “${sankalp.name}” as completed? Your marks stay.`)) {
                  setStatus(sankalp.id, 'completed');
                  pushToast({ text: 'Vow completed', sub: 'well kept', icon: 'check' });
                  onClose();
                }
              }}
              type="button"
            >
              <CheckCircle2 size={13} /> Complete
            </button>
            <button
              className="btn btn--ghost"
              style={{ flex: 1, height: 40, fontSize: 12.5, color: 'var(--rose)' }}
              onClick={() => {
                if (confirm(`Stop “${sankalp.name}”? It will no longer be scheduled.`)) {
                  setStatus(sankalp.id, 'stopped');
                  pushToast({ text: 'Stopped', icon: 'info' });
                  onClose();
                }
              }}
              type="button"
            >
              <Ban size={13} /> Stop
            </button>
          </div>
        )}

        <button
          className="btn btn--quiet mt-3"
          style={{ color: 'var(--muted-2)', fontSize: 11.5, height: 30 }}
          onClick={() => {
            if (confirm('Delete this vow and all its marks? This cannot be undone.')) {
              deleteSankalp(sankalp.id);
              pushToast({ text: 'Deleted', icon: 'info' });
              onClose();
            }
          }}
          type="button"
        >
          <Trash2 size={12} /> Delete permanently
        </button>

        {!active && (
          <p className="mono-note" style={{ textAlign: 'center' }}>
            Marks recorded before {sankalp.status === 'paused' ? 'pausing' : 'closing'} are kept in
            your history.
          </p>
        )}
      </div>
      <div style={{ height: 10 }} />
    </Sheet>
  );
}
