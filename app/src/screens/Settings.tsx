import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BrainCog,
  ChevronRight,
  Download,
  Info,
  MapPin,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { prettyTime } from '../lib/date';
import { detectCapability } from '../lib/ai';
import { normaliseState } from '../lib/initialState';
import { panchangFor } from '../lib/panchang';
import { requestNotificationPermission } from '../hooks/useReminders';
import { Chip, PC_ACCENT, Segmented, ToggleRow } from '../components/ui';
import { LocationPicker } from '../components/LocationPicker';

const APP_VERSION = __APP_VERSION__;

const LEAD_OPTIONS = [0, 10, 15, 30, 60, 120];
const SNOOZE_OPTIONS = [5, 10, 15, 30, 60];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { state, updateSettings, eraseAll, replaceState, pushToast } = useStore();
  const s = state.settings;
  const cap = detectCapability(s.onDeviceAi);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sadhana-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ text: 'Export downloaded', sub: 'JSON', icon: 'check' });
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normaliseState(JSON.parse(String(reader.result)));
        if (!parsed) throw new Error('bad file');
        replaceState(parsed);
        pushToast({
          text: 'Backup restored',
          sub: `${parsed.sankalps.length} vows · ${parsed.notes.length} entries`,
          icon: 'check',
        });
      } catch {
        pushToast({ text: 'That file was not a Sādhana backup', icon: 'info' });
      }
    };
    reader.readAsText(file);
  };

  const tithi = panchangFor(new Date().toISOString().slice(0, 10));

  return (
    <main className="screen">
      <div className="topbar" style={{ paddingTop: 4 }}>
        <button className="iconbtn" onClick={onBack} aria-label="Back" type="button">
          <ArrowLeft />
        </button>
        <div className="eyebrow">Settings</div>
        <span style={{ width: 36 }} />
      </div>

      <div className="screen__head" style={{ paddingBottom: 12 }}>
        <h1 className="title title--sm">Make it yours</h1>
      </div>

      {/* Appearance */}
      <div className="section" style={{ marginTop: 6 }}>
        <div className="section__head">
          <div className="section__title">Appearance</div>
        </div>
        <Segmented
          value={s.theme}
          onChange={(v) => updateSettings({ theme: v })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <div className="row gap-2" style={{ marginTop: 10, gap: 10 }}>
          <div className="card card--pad" style={{ flex: 1, padding: 12 }}>
            <div className="row" style={{ gap: 6 }}>
              <Sun size={13} color="var(--accent)" />
              <span style={{ fontSize: 11.5, fontWeight: 560 }}>Paper</span>
            </div>
            <div
              style={{
                marginTop: 8,
                height: 34,
                borderRadius: 8,
                background: '#F2EFE9',
                border: '1px solid #E0D9CB',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 6,
                gap: 4,
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#B5741F' }} />
              <span style={{ flex: 1, height: 5, borderRadius: 3, background: '#DCD4C6' }} />
            </div>
          </div>
          <div className="card card--pad" style={{ flex: 1, padding: 12 }}>
            <div className="row" style={{ gap: 6 }}>
              <Moon size={13} color="var(--accent)" />
              <span style={{ fontSize: 11.5, fontWeight: 560 }}>Night</span>
            </div>
            <div
              style={{
                marginTop: 8,
                height: 34,
                borderRadius: 8,
                background: '#0F0F11',
                border: '1px solid #26262A',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 6,
                gap: 4,
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#E7B273' }} />
              <span style={{ flex: 1, height: 5, borderRadius: 3, background: '#2A2A2E' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="section">
        <div className="section__head">
          <div className="section__title">You</div>
        </div>
        <div className="listgroup">
          <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row" style={{ gap: 9, marginBottom: 8 }}>
              <User size={13} color="var(--muted)" />
              <span className="toggle-row__title">Name used in the greeting</span>
            </div>
            <input
              className="input"
              value={s.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              placeholder="Your name"
              style={{ height: 40 }}
            />
          </div>
          <ToggleRow
            title="Week starts on Monday"
            sub="Affects the calendar and week view"
            on={s.weekStartsMonday}
            onChange={(v) => updateSettings({ weekStartsMonday: v })}
          />
          <ToggleRow
            title="Suggest a diary entry each evening"
            sub="One gentle prompt, not a notification storm"
            on={s.diaryPrompt}
            onChange={(v) => updateSettings({ diaryPrompt: v })}
          />
        </div>
      </div>

      {/* Pañcāṅga */}
      <div className="section">
        <div className="section__head">
          <div className="section__title">Pañcāṅga</div>
          <span className="badge">
            <MapPin size={9} /> {s.panchang.label}
          </span>
        </div>
        <div className="listgroup" style={{ paddingTop: 12 }}>
          <LocationPicker value={s.panchang} onChange={(next) => updateSettings({ panchang: next })} compact />
          <div className="panch-mini" style={{ marginTop: 4 }}>
            <div className="panch-mini__row">
              <span>Today’s tithi</span>
              <strong>{tithi.tithiName}</strong>
            </div>
            <div className="panch-mini__row">
              <span>Until</span>
              <strong>{tithi.tithiEndLabel}</strong>
            </div>
          </div>
          <p className="mono-note">
            Tithi is the Moon gaining 12° on the Sun; the day takes the tithi prevailing at local
            sunrise. Everything is computed on this device for the place above.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="section">
        <div className="section__head">
          <div className="section__title">Reminders</div>
          <span className="badge">
            <Bell size={9} /> {s.notifications.enabled ? 'on' : 'off'}
          </span>
        </div>
        <div className="listgroup">
          <ToggleRow
            title="Practice reminders"
            sub="Fires before each practice window opens"
            on={s.notifications.enabled}
            onChange={(v) => {
              updateSettings({ notifications: { ...s.notifications, enabled: v } });
              if (v) {
                requestNotificationPermission().then((p) => {
                  setPermission(p);
                  if (p === 'granted')
                    pushToast({ text: 'Reminders allowed', icon: 'bell' });
                  else if (p === 'denied')
                    pushToast({ text: 'Blocked in browser settings', icon: 'info' });
                });
              }
            }}
          />

          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="toggle-row__title">Default lead time</div>
            <div className="toggle-row__sub" style={{ marginBottom: 9 }}>
              How long before the window opens — each vow can override this
            </div>
            <div className="chips">
              {LEAD_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  small
                  active={s.notifications.defaultLeadMinutes === m}
                  onClick={() =>
                    updateSettings({
                      notifications: { ...s.notifications, defaultLeadMinutes: m },
                    })
                  }
                >
                  {m === 0 ? 'At start' : m < 60 ? `${m} min` : `${m / 60} hr`}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="toggle-row__title">Snooze length</div>
            <div className="toggle-row__sub" style={{ marginBottom: 9 }}>
              One tap on the reminder card, then it comes back
            </div>
            <div className="chips">
              {SNOOZE_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  small
                  active={s.notifications.snoozeMinutes === m}
                  onClick={() =>
                    updateSettings({ notifications: { ...s.notifications, snoozeMinutes: m } })
                  }
                >
                  {m < 60 ? `${m} min` : `${m / 60} hr`}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 0 4px' }}>
            <div className="toggle-row__title">Quiet hours</div>
            <div className="toggle-row__sub" style={{ marginBottom: 9 }}>
              Nothing rings between these times
            </div>
            <div className="split">
              <label>
                <span className="field__label">From</span>
                <input
                  className="input"
                  type="time"
                  value={s.notifications.quietStart}
                  onChange={(e) =>
                    updateSettings({
                      notifications: { ...s.notifications, quietStart: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                <span className="field__label">To</span>
                <input
                  className="input"
                  type="time"
                  value={s.notifications.quietEnd}
                  onChange={(e) =>
                    updateSettings({
                      notifications: { ...s.notifications, quietEnd: e.target.value },
                    })
                  }
                />
              </label>
            </div>
            <p className="mono-note">
              Quiet from {prettyTime(s.notifications.quietStart)} to{' '}
              {prettyTime(s.notifications.quietEnd)}. Permission: {String(permission)}.
            </p>
          </div>
        </div>
      </div>

      {/* On-device AI */}
      <div className="section">
        <div className="section__head">
          <div className="section__title">On-device intelligence</div>
        </div>
        <div className="listgroup">
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <Segmented
              value={s.onDeviceAi}
              onChange={(v) => updateSettings({ onDeviceAi: v })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'on', label: 'Always' },
                { value: 'off', label: 'Off' },
              ]}
            />
            <div className="row gap-2 mt-3" style={{ gap: 10 }}>
              <span className="navrow__icon" style={PC_ACCENT}>
                <BrainCog />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 560 }}>{cap.engine}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {cap.reason} · {cap.ramGb} GB reported
                </div>
              </div>
            </div>
            <p className="mono-note">
              The app asks the platform for a model and never downloads a 2 GB blob on a connection
              you did not choose. If nothing is available, every insight falls back to local
              statistics — same screens, no dead ends.
            </p>
          </div>
          <div className="navrow" style={{ borderBottom: 0 }}>
            <span className="navrow__icon">
              <Monitor />
            </span>
            <div style={{ flex: 1 }}>
              <div className="navrow__title">Model tiers</div>
              <div className="navrow__sub">
                AICore / Gemini Nano · MediaPipe LLM · local statistics
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="section">
        <div className="section__head">
          <div className="section__title">Your data</div>
        </div>
        <div className="listgroup">
          <button className="navrow" onClick={exportData} type="button">
            <span className="navrow__icon">
              <Download />
            </span>
            <div style={{ flex: 1 }}>
              <div className="navrow__title">Export everything</div>
              <div className="navrow__sub">Vows, marks and diary as one JSON file</div>
            </div>
            <ChevronRight className="chev" />
          </button>
          <button className="navrow" onClick={() => fileRef.current?.click()} type="button">
            <span className="navrow__icon">
              <Upload />
            </span>
            <div style={{ flex: 1 }}>
              <div className="navrow__title">Restore a backup</div>
              <div className="navrow__sub">Replaces what is on this device</div>
            </div>
            <ChevronRight className="chev" />
          </button>
          <button
            className="navrow"
            onClick={() => {
              if (window.confirm('Erase every vow, mark and diary entry on this device? This cannot be undone.')) {
                eraseAll();
                pushToast({ text: 'Everything erased', icon: 'info' });
              }
            }}
            type="button"
          >
            <span className="navrow__icon" style={{ color: 'var(--rose)' }}>
              <Trash2 />
            </span>
            <div style={{ flex: 1 }}>
              <div className="navrow__title" style={{ color: 'var(--rose)' }}>
                Erase all data
              </div>
              <div className="navrow__sub">Vows, marks and entries on this device</div>
            </div>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hide"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
          }}
        />
      </div>

      <div className="section">
        <div className="card card--pad" style={{ background: 'var(--surface-2)' }}>
          <div className="row" style={{ gap: 9 }}>
            <Palette size={14} color="var(--accent)" />
            <div style={{ fontSize: 12.5, fontWeight: 560 }}>Sādhana {APP_VERSION}</div>
          </div>
          <p className="mono-note" style={{ marginTop: 6 }}>
            A local-first practice tracker. No account, no cloud, no analytics, no third-party SDKs.
          </p>
          <div className="row" style={{ gap: 7, marginTop: 10, alignItems: 'flex-start' }}>
            <ShieldCheck size={12} color="var(--jade)" style={{ flex: 'none', marginTop: 2 }} />
            <span style={{ fontSize: 11, color: 'var(--muted-2)', lineHeight: 1.5 }}>
              Your data never leaves this device unless you export it yourself.
            </span>
          </div>
          <div className="row" style={{ gap: 7, marginTop: 6, alignItems: 'flex-start' }}>
            <Info size={12} color="var(--muted-2)" style={{ flex: 'none', marginTop: 2 }} />
            <span style={{ fontSize: 11, color: 'var(--muted-2)', lineHeight: 1.5 }}>
              Pañcāṅga uses the full Meeus lunar series and your local sunrise — see the Pañcāṅga
              sheet for the method.
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 30 }} />
    </main>
  );
}
