import { Component, Suspense, lazy, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Bell, Check, Info } from 'lucide-react';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { NavCtx, type NoteRequest, type Nav, type Tab } from './lib/nav';
import { useStore } from './lib/store';
import { useTheme } from './hooks/useTheme';
import { useReminders } from './hooks/useReminders';
import type { Sankalp } from './lib/types';
import { TodayScreen } from './screens/Today';
import { Onboarding } from './screens/Onboarding';

// Secondary surfaces are split out of the entry chunk: first paint should not
// pay for the diary editor, the graph or the export sheet.
const CalendarScreen = lazy(() =>
  import('./screens/CalendarScreen').then((m) => ({ default: m.CalendarScreen }))
);
const PracticesScreen = lazy(() =>
  import('./screens/Practices').then((m) => ({ default: m.PracticesScreen }))
);
const DiaryScreen = lazy(() => import('./screens/Diary').then((m) => ({ default: m.DiaryScreen })));
const InsightsScreen = lazy(() =>
  import('./screens/Insights').then((m) => ({ default: m.InsightsScreen }))
);
const SettingsScreen = lazy(() =>
  import('./screens/Settings').then((m) => ({ default: m.SettingsScreen }))
);
const CreateSankalp = lazy(() =>
  import('./screens/CreateSankalp').then((m) => ({ default: m.CreateSankalp }))
);
const DaySheet = lazy(() => import('./screens/DaySheet').then((m) => ({ default: m.DaySheet })));
const PracticeDetail = lazy(() =>
  import('./screens/PracticeDetail').then((m) => ({ default: m.PracticeDetail }))
);

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="stage">
        <div className="crash">
          <div className="crash__glyph">ॐ</div>
          <h1>Something interrupted this view</h1>
          <p>
            Your vows and entries are stored on this device and were not touched. Reloading usually
            settles it.
          </p>
          <button className="btn btn--primary" onClick={() => window.location.reload()} type="button">
            Reload Sādhana
          </button>
          <details>
            <summary>Technical detail</summary>
            <pre>{String(this.state.error?.message ?? this.state.error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}

export default function App() {
  const { state, toasts, dismissToast } = useStore();
  useTheme(state.settings.theme);
  const { live: reminders } = useReminders();

  const [tab, setTab] = useState<Tab>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [create, setCreate] = useState<{ edit?: Sankalp } | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [noteRequest, setNoteRequest] = useState<NoteRequest | null>(null);

  const openNote = useCallback((req: NoteRequest) => {
    setSettingsOpen(false);
    setTab('diary');
    setNoteRequest(req);
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      tab,
      setTab,
      openCreate: (edit) => setCreate({ edit }),
      openDay: (iso) => setDay(iso),
      openPractice: (id) => setPracticeId(id),
      openNote,
      openSettings: () => setSettingsOpen(true),
    }),
    [tab, openNote]
  );

  const practice = practiceId ? state.sankalps.find((s) => s.id === practiceId) ?? null : null;

  if (!state.settings.onboarded) {
    return (
      <AppErrorBoundary>
        <div className="stage">
          <div className="device">
            <StatusBar />
            <Onboarding />
          </div>
        </div>
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <NavCtx.Provider value={nav}>
        <div className="stage">
          <div className="device">
            <StatusBar />

            <Suspense fallback={<div className="screen-loading" aria-hidden />}>
              {settingsOpen ? (
                <SettingsScreen onBack={() => setSettingsOpen(false)} />
              ) : (
                <>
                  {tab === 'today' && <TodayScreen reminders={reminders} />}
                  {tab === 'calendar' && <CalendarScreen />}
                  {tab === 'practices' && <PracticesScreen />}
                  {tab === 'diary' && (
                    <DiaryScreen
                      noteRequest={noteRequest}
                      clearNoteRequest={() => setNoteRequest(null)}
                    />
                  )}
                  {tab === 'insights' && <InsightsScreen />}
                  <TabBar />
                </>
              )}
            </Suspense>

            <div className="toasts" role="status" aria-live="polite">
              {toasts.map((t) => (
                <button
                  key={t.id}
                  className="toast"
                  onClick={() => dismissToast(t.id)}
                  type="button"
                >
                  {t.icon === 'bell' ? <Bell /> : t.icon === 'info' ? <Info /> : <Check />}
                  <span>{t.text}</span>
                  {t.sub && <span className="toast__sub">{t.sub}</span>}
                </button>
              ))}
            </div>

            <Suspense fallback={null}>
              {create && <CreateSankalp open edit={create.edit} onClose={() => setCreate(null)} />}
              {day && <DaySheet date={day} onClose={() => setDay(null)} />}
              {practice && (
                <PracticeDetail sankalp={practice} onClose={() => setPracticeId(null)} />
              )}
            </Suspense>
          </div>
        </div>
      </NavCtx.Provider>
    </AppErrorBoundary>
  );
}
