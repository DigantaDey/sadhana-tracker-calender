import { useCallback, useMemo, useState } from 'react';
import { Bell, Check, Info, X } from 'lucide-react';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { NavCtx, type NoteRequest, type Nav, type Tab } from './lib/nav';
import { useStore } from './lib/store';
import { useTheme } from './hooks/useTheme';
import { useReminders } from './hooks/useReminders';
import type { Sankalp } from './lib/types';
import { TodayScreen } from './screens/Today';
import { CalendarScreen } from './screens/CalendarScreen';
import { PracticesScreen } from './screens/Practices';
import { DiaryScreen } from './screens/Diary';
import { InsightsScreen } from './screens/Insights';
import { SettingsScreen } from './screens/Settings';
import { CreateSankalp } from './screens/CreateSankalp';
import { DaySheet } from './screens/DaySheet';
import { PracticeDetail } from './screens/PracticeDetail';

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

  return (
    <NavCtx.Provider value={nav}>
      <div className="stage">
        <div className="device">
          <StatusBar />

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

          <div className="toasts">
            {toasts.map((t) => (
              <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>
                {t.icon === 'bell' ? <Bell /> : t.icon === 'info' ? <Info /> : <Check />}
                <span>{t.text}</span>
                {t.sub && <span className="toast__sub">{t.sub}</span>}
              </div>
            ))}
          </div>

          <CreateSankalp open={!!create} edit={create?.edit} onClose={() => setCreate(null)} />
          <DaySheet date={day} onClose={() => setDay(null)} />
          <PracticeDetail sankalp={practice} onClose={() => setPracticeId(null)} />
        </div>
      </div>
    </NavCtx.Provider>
  );
}
