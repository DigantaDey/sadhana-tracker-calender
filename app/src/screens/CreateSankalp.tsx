import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Clock, Repeat, Target, Type } from 'lucide-react';
import { useStore, useToday } from '../lib/store';
import { CATEGORIES, COLORS, TITHI_NAMES, type ColorKey, type Sankalp } from '../lib/types';
import { addDays, MONTHS, prettyTime, todayISO, WEEKDAYS_SUN } from '../lib/date';
import { describeFrequency } from '../lib/format';
import { nextTithiDate, panchangFor } from '../lib/panchang';
import { Chip, Sheet, Switch, pc } from '../components/ui';

const GLYPHS = ['ॐ', '✦', '✶', '॥', '☸', '❋', '✿', '❂', '❁', '◈', '✧', '☀'];

const DURATIONS = [
  { label: '21 days', days: 21 },
  { label: '40 days', days: 40 },
  { label: '108 days', days: 108 },
  { label: 'One year', days: 365 },
];

const LEAD = [0, 10, 15, 30, 60, 120];
const SNOOZE = [5, 15, 30, 60];

type FreqKind = Sankalp['frequency']['kind'];

export function CreateSankalp({
  open,
  edit,
  onClose,
}: {
  open: boolean;
  edit?: Sankalp;
  onClose: () => void;
}) {
  const { addSankalp, updateSankalp, pushToast } = useStore();
  const today = useToday();

  const [name, setName] = useState('');
  const [intention, setIntention] = useState('');
  const [color, setColor] = useState<ColorKey>('saffron');
  const [glyph, setGlyph] = useState('ॐ');
  const [category, setCategory] = useState<Sankalp['category']>('japa');
  const [start, setStart] = useState(todayISO());
  const [duration, setDuration] = useState<number | 'custom' | 'open'>(40);
  const [customEnd, setCustomEnd] = useState(addDays(todayISO(), 40));
  const [fkind, setFkind] = useState<FreqKind>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDay, setMonthDay] = useState(1);
  const [yearMonth, setYearMonth] = useState(new Date().getMonth() + 1);
  const [yearDay, setYearDay] = useState(1);
  const [tithi, setTithi] = useState(11);
  const [onceDate, setOnceDate] = useState(todayISO());
  const [useTime, setUseTime] = useState(false);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('');
  const [useTarget, setUseTarget] = useState(false);
  const [target, setTarget] = useState(108);
  const [reminderOn, setReminderOn] = useState(true);
  const [lead, setLead] = useState(15);
  const [snoozeM, setSnoozeM] = useState(30);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setName(edit.name);
      setIntention(edit.intention ?? '');
      setColor(edit.color);
      setGlyph(edit.glyph);
      setCategory(edit.category);
      setStart(edit.startedOn);
      setDuration(edit.endsOn ? 'custom' : 'open');
      setCustomEnd(edit.endsOn ?? addDays(edit.startedOn, 40));
      setFkind(edit.frequency.kind);
      if (edit.frequency.kind === 'weekly') setWeekdays(edit.frequency.days);
      if (edit.frequency.kind === 'monthly') setMonthDay(edit.frequency.day);
      if (edit.frequency.kind === 'yearly') {
        setYearMonth(edit.frequency.month);
        setYearDay(edit.frequency.day);
      }
      if (edit.frequency.kind === 'tithi') setTithi(edit.frequency.tithi);
      if (edit.frequency.kind === 'once') setOnceDate(edit.frequency.date);
      setUseTime(!!edit.time);
      setStartTime(edit.time?.start ?? '06:00');
      setEndTime(edit.time?.end ?? '');
      setUseTarget(!!edit.targetCount);
      setTarget(edit.targetCount ?? 108);
      setReminderOn(edit.reminder.enabled);
      setLead(edit.reminder.leadMinutes);
      setSnoozeM(edit.reminder.snoozeMinutes);
    } else {
      setName('');
      setIntention('');
      setColor('saffron');
      setGlyph('ॐ');
      setCategory('japa');
      setStart(todayISO());
      setDuration(40);
      setCustomEnd(addDays(todayISO(), 40));
      setFkind('daily');
      setWeekdays([1, 2, 3, 4, 5]);
      setUseTime(true);
      setStartTime('06:00');
      setEndTime('06:30');
      setUseTarget(false);
      setTarget(108);
      setReminderOn(true);
      setLead(15);
      setSnoozeM(30);
    }
  }, [open, edit]);

  const frequency = useMemo<Sankalp['frequency']>(() => {
    switch (fkind) {
      case 'daily':
        return { kind: 'daily' };
      case 'weekly':
        return { kind: 'weekly', days: weekdays.length ? weekdays : [1] };
      case 'monthly':
        return { kind: 'monthly', day: monthDay };
      case 'yearly':
        return { kind: 'yearly', month: yearMonth, day: yearDay };
      case 'tithi':
        return { kind: 'tithi', tithi };
      case 'once':
        return { kind: 'once', date: onceDate };
    }
  }, [fkind, weekdays, monthDay, yearMonth, yearDay, tithi, onceDate]);

  const endsOn = useMemo(() => {
    if (fkind === 'once') return onceDate;
    if (duration === 'open') return null;
    if (duration === 'custom') return customEnd;
    return addDays(start, duration - 1);
  }, [duration, start, customEnd, fkind, onceDate]);

  const submit = () => {
    const finalName = name.trim() || `${CATEGORIES.find((c) => c.key === category)?.label} sādhana`;
    const payload = {
      name: finalName,
      intention: intention.trim() || undefined,
      category,
      color,
      glyph,
      startedOn: start,
      endsOn,
      frequency,
      time: useTime ? { start: startTime, end: endTime || undefined } : null,
      targetCount: useTarget ? target : null,
      reminder: { enabled: reminderOn, leadMinutes: lead, snoozeMinutes: snoozeM },
      status: 'active' as const,
    };

    if (edit) {
      updateSankalp(edit.id, payload);
      pushToast({ text: 'Saṅkalpa updated', sub: finalName, icon: 'check' });
    } else {
      addSankalp(payload);
      pushToast({
        text: 'Saṅkalpa taken',
        sub: endsOn ? `until ${endsOn}` : 'open-ended',
        icon: 'check',
      });
    }
    onClose();
  };

  const toggleDay = (d: number) =>
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? 'Edit saṅkalpa' : 'Take a saṅkalpa'}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={submit}
            type="button"
            style={{ flex: 1.6 }}
          >
            {edit ? 'Save changes' : 'Begin the vow'}
          </button>
        </>
      }
    >
      <p className="sub" style={{ marginTop: 0 }}>
        A vow with edges: when it starts, how often it returns, and when it rests.
      </p>

      {/* Name */}
      <div className="field">
        <label className="field__label" htmlFor="sk-name">
          <Type size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
          What is this practice called?
        </label>
        <input
          id="sk-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gāyatrī Japa"
          autoComplete="off"
        />
      </div>

      {/* Category */}
      <div className="field">
        <span className="field__label">Kind of practice</span>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              small
              active={category === c.key}
              onClick={() => {
                setCategory(c.key);
                setGlyph(c.glyph);
              }}
            >
              <span style={{ opacity: 0.8 }}>{c.glyph}</span> {c.label}
            </Chip>
          ))}
        </div>
        <p className="hint">{CATEGORIES.find((c) => c.key === category)?.hint}</p>
      </div>

      {/* Glyph + colour */}
      <div className="field">
        <span className="field__label">Mark</span>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <span className="glyph glyph--lg" style={pc(color)} aria-hidden>
            {glyph}
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="glyphpick">
              {GLYPHS.map((g) => (
                <button
                  key={g}
                  className="glyphopt"
                  data-active={glyph === g}
                  onClick={() => setGlyph(g)}
                  type="button"
                  aria-label={`Symbol ${g}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="colorpick" style={{ marginTop: 12 }}>
          {(Object.keys(COLORS) as ColorKey[]).map((k) => (
            <button
              key={k}
              className="swatch"
              data-active={color === k}
              style={pc(k)}
              onClick={() => setColor(k)}
              aria-label={COLORS[k].label}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Intention */}
      <div className="field">
        <label className="field__label" htmlFor="sk-int">
          The vow, in your own words <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          id="sk-int"
          className="textarea"
          rows={2}
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="One mālā at first light, before the house wakes."
        />
      </div>

      <div className="divider" />

      {/* Start + duration */}
      <div className="field" style={{ marginTop: 0 }}>
        <span className="field__label">
          <CalendarDays size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
          Saṅkalpa day
        </span>
        <input
          className="input"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="field__label">How long is the vow?</span>
        <div className="chips">
          {DURATIONS.map((d) => (
            <Chip
              key={d.days}
              small
              active={duration === d.days}
              onClick={() => setDuration(d.days)}
            >
              {d.label}
            </Chip>
          ))}
          <Chip small active={duration === 'custom'} onClick={() => setDuration('custom')}>
            Until a date
          </Chip>
          <Chip small active={duration === 'open'} onClick={() => setDuration('open')}>
            Ongoing
          </Chip>
        </div>
        {duration === 'custom' && (
          <input
            className="input mt-2"
            type="date"
            value={customEnd}
            min={start}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        )}
        <p className="hint">
          {endsOn ? `Runs until ${endsOn}.` : 'No end date — you can close it whenever you choose.'}
        </p>
      </div>

      {/* Frequency */}
      <div className="field">
        <span className="field__label">
          <Repeat size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
          Rhythm
        </span>
        <div className="chips">
          {(
            [
              ['daily', 'Every day'],
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
              ['tithi', 'By tithi'],
              ['once', 'Once'],
            ] as [FreqKind, string][]
          ).map(([k, label]) => (
            <Chip key={k} small active={fkind === k} onClick={() => setFkind(k)}>
              {label}
            </Chip>
          ))}
        </div>

        {fkind === 'weekly' && (
          <div className="chips" style={{ marginTop: 10 }}>
            {WEEKDAYS_SUN.map((d, i) => (
              <Chip key={d} small active={weekdays.includes(i)} onClick={() => toggleDay(i)}>
                {d.slice(0, 2)}
              </Chip>
            ))}
          </div>
        )}

        {fkind === 'monthly' && (
          <div className="row mt-2" style={{ gap: 10 }}>
            <span className="hint" style={{ margin: 0 }}>
              Day of month
            </span>
            <input
              className="input"
              type="number"
              min={1}
              max={31}
              value={monthDay}
              onChange={(e) => setMonthDay(Math.min(31, Math.max(1, Number(e.target.value))))}
              style={{ width: 82, height: 38 }}
            />
          </div>
        )}

        {fkind === 'yearly' && (
          <div className="split mt-2">
            <select
              className="input"
              value={yearMonth}
              onChange={(e) => setYearMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min={1}
              max={31}
              value={yearDay}
              onChange={(e) => setYearDay(Math.min(31, Math.max(1, Number(e.target.value))))}
            />
          </div>
        )}

        {fkind === 'tithi' && (
          <>
            <select
              className="input mt-2"
              value={tithi}
              onChange={(e) => setTithi(Number(e.target.value))}
            >
              {TITHI_NAMES.map((t, i) => (
                <option key={i} value={i + 1}>
                  {i < 15 ? 'Śukla' : 'Kṛṣṇa'} {t}
                </option>
              ))}
            </select>
            <div className="tithi-preview">
              <span className="tithi-preview__next">
                Next: {nextTithiDate(tithi, today)}
              </span>
              <span className="tithi-preview__meta">
                Tithi at sunrise · {panchangFor(today).sunriseLabel ?? '—'} sunrise
              </span>
            </div>
            <p className="hint">
              The lunar day is computed here from the Moon&rsquo;s elongation and your local
              sunrise. Vṛddhi and kṣaya days are handled the way a pañcāṅga does: a tithi that
              touches two sunrises is observed on the second.
            </p>
          </>
        )}

        {fkind === 'once' && (
          <input
            className="input mt-2"
            type="date"
            value={onceDate}
            onChange={(e) => setOnceDate(e.target.value)}
          />
        )}

        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--accent)' }}>◷</span>
          {describeFrequency(frequency)}
          {endsOn ? ` · until ${endsOn}` : ' · open-ended'}
          {name.trim() ? '' : ' · name it below'}
        </p>
      </div>

      {/* Time window */}
      <div className="field">
        <div className="row row--between">
          <span className="field__label" style={{ marginBottom: 0 }}>
            <Clock size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
            Practice window
          </span>
          <Switch on={useTime} onChange={setUseTime} label="Set a time window" />
        </div>
        {useTime ? (
          <>
            <div className="split mt-2">
              <label>
                <span className="hint" style={{ marginTop: 0, display: 'block', marginBottom: 4 }}>
                  Starts
                </span>
                <input
                  className="input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label>
                <span className="hint" style={{ marginTop: 0, display: 'block', marginBottom: 4 }}>
                  Ends (optional)
                </span>
                <input
                  className="input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
            </div>
            <p className="hint">
              {prettyTime(startTime)}
              {endTime ? ` – ${prettyTime(endTime)}` : ' · no fixed end'}
            </p>
          </>
        ) : (
          <p className="hint" style={{ marginTop: 8 }}>
            No fixed time — the practice can be kept at any point in the day.
          </p>
        )}
      </div>

      {/* Count */}
      <div className="field">
        <div className="row row--between">
          <span className="field__label" style={{ marginBottom: 0 }}>
            <Target size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
            Count target
          </span>
          <Switch on={useTarget} onChange={setUseTarget} label="Track a count" />
        </div>
        {useTarget && (
          <div className="chips mt-2">
            {[27, 54, 108, 1008].map((n) => (
              <Chip key={n} small active={target === n} onClick={() => setTarget(n)}>
                {n}
              </Chip>
            ))}
            <input
              className="input"
              type="number"
              value={target}
              onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
              style={{ width: 88, height: 30, padding: '0 10px' }}
            />
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="field">
        <div className="row row--between">
          <span className="field__label" style={{ marginBottom: 0 }}>
            <Bell size={10} style={{ marginRight: 4, verticalAlign: 1 }} />
            Remind me
          </span>
          <Switch on={reminderOn} onChange={setReminderOn} label="Reminder" />
        </div>
        {reminderOn && (
          <>
            <div className="hint" style={{ marginTop: 8 }}>How long before the window opens</div>
            <div className="chips" style={{ marginTop: 6 }}>
              {LEAD.map((m) => (
                <Chip key={m} small active={lead === m} onClick={() => setLead(m)}>
                  {m === 0 ? 'At start' : m < 60 ? `${m} min` : `${m / 60} hr`}
                </Chip>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 10 }}>Snooze for</div>
            <div className="chips" style={{ marginTop: 6 }}>
              {SNOOZE.map((m) => (
                <Chip key={m} small active={snoozeM === m} onClick={() => setSnoozeM(m)}>
                  {m < 60 ? `${m} min` : `${m / 60} hr`}
                </Chip>
              ))}
            </div>
            {!useTime && (
              <p className="hint" style={{ color: 'var(--accent)' }}>
                Add a time window above to make this reminder useful.
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ height: 8 }} />
    </Sheet>
  );
}
