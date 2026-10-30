import { useState } from 'react';
import { ArrowRight, Check, Moon, Sun, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { addDays, todayISO } from '../lib/date';
import { guessLocation } from '../lib/location';
import type { Category, ColorKey, Frequency, PanchangSettings, Sankalp } from '../lib/types';
import { LocationPicker } from '../components/LocationPicker';

type Draft = {
  name: string;
  glyph: string;
  category: Category;
  color: ColorKey;
  intention: string;
  frequency: Frequency;
  time: { start: string; end?: string } | null;
  targetCount: number | null;
  days: number | null;
};

const TEMPLATES: { id: string; title: string; sub: string; draft: Draft }[] = [
  {
    id: 'gayatri',
    title: 'Gāyatrī japa',
    sub: 'One mālā — 108 — at first light, for 40 days',
    draft: {
      name: 'Gāyatrī Japa',
      glyph: 'ॐ',
      category: 'japa',
      color: 'saffron',
      intention: 'One mālā at first light, before the house wakes.',
      frequency: { kind: 'daily' },
      time: { start: '05:30' },
      targetCount: 108,
      days: 40,
    },
  },
  {
    id: 'dhyana',
    title: 'Dhyāna',
    sub: 'Twenty quiet minutes, every morning, open-ended',
    draft: {
      name: 'Dhyāna',
      glyph: '☸',
      category: 'dhyana',
      color: 'indigo',
      intention: 'Sit for twenty minutes before the day begins.',
      frequency: { kind: 'daily' },
      time: { start: '06:00', end: '06:20' },
      targetCount: null,
      days: null,
    },
  },
  {
    id: 'ekadashi',
    title: 'Ekādaśī upavāsa',
    sub: 'A light day on both Ekādaśīs, by tithi',
    draft: {
      name: 'Ekādaśī Upavāsa',
      glyph: '✦',
      category: 'anusthana',
      color: 'plum',
      intention: 'A light day, a quiet mind.',
      frequency: { kind: 'tithi', tithi: 11 },
      time: null,
      targetCount: null,
      days: null,
    },
  },
];

export function Onboarding() {
  const { state, updateSettings, addSankalp, pushToast } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.settings.name);
  const [theme, setTheme] = useState(state.settings.theme);
  const [place, setPlace] = useState<PanchangSettings>(state.settings.panchang);
  const [chosen, setChosen] = useState<string | null>(null);

  const finish = (templateId: string | null) => {
    updateSettings({ name: name.trim(), theme, panchang: place, onboarded: true });

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const today = todayISO();
      const sankalp: Omit<Sankalp, 'id' | 'createdAt'> = {
        ...template.draft,
        startedOn: today,
        endsOn: template.draft.days ? addDays(today, template.draft.days - 1) : null,
        reminder: {
          enabled: true,
          leadMinutes: state.settings.notifications.defaultLeadMinutes,
          snoozeMinutes: state.settings.notifications.snoozeMinutes,
        },
        status: 'active',
      };
      addSankalp(sankalp);
      pushToast({ text: 'Saṅkalpa taken', sub: template.draft.name, icon: 'check' });
    }
  };

  return (
    <main className="onboard">
      <div className="onboard__top">
        <span className="onboard__brand">
          <SadhanaMark />
          Sādhana
        </span>
        {step > 0 && (
          <button className="linkbtn" onClick={() => finish(null)} type="button">
            Skip <X size={12} />
          </button>
        )}
      </div>

      {step === 0 && (
        <section className="onboard__body rise">
          <p className="eyebrow">A practice tracker for vows</p>
          <h1 className="onboard__title">
            A little,<br />
            <em>every day.</em>
          </h1>
          <p className="onboard__lede">
            Take a saṅkalpa — a vow with a beginning, a rhythm and an end — keep it on a calendar,
            and write your way through it. Nothing leaves this device.
          </p>

          <ul className="onboard__points">
            <li>
              <Check /> Real pañcāṅga: tithi, nakṣatra and sunrise computed on your phone, for your
              city.
            </li>
            <li>
              <Check /> No account, no cloud, no analytics. Room / local storage is the only copy.
            </li>
            <li>
              <Check /> A missed day is data, never a verdict. There is no shame in this app.
            </li>
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="onboard__body rise">
          <p className="eyebrow">Step 1 of 2</p>
          <h1 className="onboard__title onboard__title--sm">Make it yours</h1>

          <label className="field">
            <span className="field__label">What may I call you?</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              autoComplete="given-name"
              maxLength={40}
            />
          </label>

          <div className="field">
            <span className="field__label">Appearance</span>
            <div className="chips">
              {(
                [
                  { v: 'system', label: 'System', Icon: Moon },
                  { v: 'light', label: 'Paper', Icon: Sun },
                  { v: 'dark', label: 'Night', Icon: Moon },
                ] as const
              ).map(({ v, label, Icon }) => (
                <button
                  key={v}
                  className="chip"
                  data-active={theme === v}
                  onClick={() => setTheme(v)}
                  type="button"
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>

          <LocationPicker value={place} onChange={setPlace} />

          <p className="mono-note">
            The tithi changes at sunrise, so Sādhana needs a place. Detected:{' '}
            {guessLocation().label}. You can change it any time in Settings.
          </p>
        </section>
      )}

      {step === 2 && (
        <section className="onboard__body rise">
          <p className="eyebrow">Step 2 of 2</p>
          <h1 className="onboard__title onboard__title--sm">Begin with one vow</h1>
          <p className="sub" style={{ marginTop: 6 }}>
            Small enough to keep on your worst day. You can add more later — or start with nothing.
          </p>

          <div className="onboard__templates">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="template"
                data-active={chosen === t.id}
                onClick={() => setChosen(t.id)}
                type="button"
              >
                <span className="glyph glyph--lg">{t.draft.glyph}</span>
                <span className="template__body">
                  <span className="template__title">{t.title}</span>
                  <span className="template__sub">{t.sub}</span>
                </span>
                <span className="template__tick">{chosen === t.id ? <Check size={13} /> : null}</span>
              </button>
            ))}
          </div>

          <button className="linkbtn" onClick={() => setChosen(null)} type="button">
            {chosen ? 'Start with nothing instead' : 'Starting with nothing'}
          </button>
        </section>
      )}

      <div className="onboard__foot">
        <div className="onboard__dots" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} data-active={i === step} />
          ))}
        </div>
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            if (step < 2) setStep(step + 1);
            else finish(chosen);
          }}
          type="button"
        >
          {step === 0 ? 'Begin' : step === 1 ? 'Continue' : chosen ? 'Take the vow' : 'Enter Sādhana'}
          <ArrowRight size={15} />
        </button>
        <p className="onboard__fine">Local-first · no account · works offline</p>
      </div>
    </main>
  );
}

function SadhanaMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
