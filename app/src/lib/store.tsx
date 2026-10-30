import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { todayISO } from './date';
import { createInitialState, normaliseState, resolvePanchangPlace } from './initialState';
import { setPanchangLocation } from './panchang';
import { completionId } from './schedule';
import type { AppState, Note, Sankalp, SankalpStatus, Settings } from './types';

const KEY = 'sadhana.v2';
const LEGACY_KEY = 'sadhana.v1';

function load(): AppState {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return normaliseState(JSON.parse(current)) ?? createInitialState();
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = normaliseState(JSON.parse(legacy));
      if (migrated) {
        // Keep the new payload only: the legacy key stops being written.
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* corrupt or unavailable storage — start clean rather than crash */
  }
  return createInitialState();
}

function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode: the session keeps working in memory */
  }
}

export type Toast = { id: number; text: string; sub?: string; icon?: 'check' | 'bell' | 'info' };

type Store = {
  state: AppState;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  toggleComplete: (sankalpId: string, date: string, note?: string) => void;
  setCount: (sankalpId: string, date: string, count: number) => void;
  addSankalp: (s: Omit<Sankalp, 'id' | 'createdAt'>) => string;
  updateSankalp: (id: string, patch: Partial<Sankalp>) => void;
  setStatus: (id: string, status: SankalpStatus) => void;
  deleteSankalp: (id: string) => void;
  saveNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  snooze: (key: string, minutes: number) => void;
  acknowledge: (key: string) => void;
  /** Replace everything (used by backup restore). */
  replaceState: (next: AppState) => void;
  eraseAll: () => void;
};

const Ctx = createContext<Store | null>(null);

function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(1);
  const latest = useRef(state);
  latest.current = state;

  // Persist on a short debounce: marking six practices in a row costs one write.
  useEffect(() => {
    const id = window.setTimeout(() => save(state), 220);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    const flush = () => save(latest.current);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  // The pañcāṅga engine reads the place from a module-level singleton so the
  // schedule engine stays a pure function of (vow, date).
  useEffect(() => {
    setPanchangLocation(resolvePanchangPlace(state.settings));
  }, [state.settings]);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = seq.current++;
    setToasts((cur) => [...cur.slice(-1), { ...t, id }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }, []);

  const toggleComplete = useCallback((sankalpId: string, date: string, note?: string) => {
    setState((s) => {
      const id = completionId(sankalpId, date);
      const prev = s.completions[id];
      const done = !prev?.done;
      return {
        ...s,
        completions: {
          ...s.completions,
          [id]: {
            id,
            sankalpId,
            date,
            done,
            count: prev?.count,
            note: note ?? prev?.note,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const setCount = useCallback((sankalpId: string, date: string, count: number) => {
    setState((s) => {
      const id = completionId(sankalpId, date);
      const prev = s.completions[id];
      return {
        ...s,
        completions: {
          ...s.completions,
          [id]: {
            id,
            sankalpId,
            date,
            done: count > 0 ? true : prev?.done ?? false,
            count,
            note: prev?.note,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const addSankalp = useCallback((input: Omit<Sankalp, 'id' | 'createdAt'>) => {
    const sankalp: Sankalp = { ...input, id: newId('sk'), createdAt: Date.now() };
    setState((cur) => ({ ...cur, sankalps: [sankalp, ...cur.sankalps] }));
    return sankalp.id;
  }, []);

  const updateSankalp = useCallback((id: string, patch: Partial<Sankalp>) => {
    setState((s) => ({
      ...s,
      sankalps: s.sankalps.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const setStatus = useCallback((id: string, status: SankalpStatus) => {
    setState((s) => ({
      ...s,
      sankalps: s.sankalps.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              archivedAt:
                status === 'completed' || status === 'stopped'
                  ? new Date().toISOString()
                  : null,
            }
          : x
      ),
    }));
  }, []);

  const deleteSankalp = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      sankalps: s.sankalps.filter((x) => x.id !== id),
      completions: Object.fromEntries(
        Object.entries(s.completions).filter(([, c]) => c.sankalpId !== id)
      ),
    }));
  }, []);

  const saveNote = useCallback((note: Note) => {
    setState((s) => {
      const exists = s.notes.some((n) => n.id === note.id);
      return {
        ...s,
        notes: exists
          ? s.notes.map((n) => (n.id === note.id ? { ...note, updatedAt: Date.now() } : n))
          : [{ ...note, updatedAt: Date.now() }, ...s.notes],
      };
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const snooze = useCallback((key: string, minutes: number) => {
    setState((s) => ({
      ...s,
      snoozedUntil: { ...s.snoozedUntil, [key]: Date.now() + minutes * 60_000 },
    }));
  }, []);

  const acknowledge = useCallback((key: string) => {
    setState((s) => ({ ...s, acknowledged: { ...s.acknowledged, [key]: Date.now() } }));
  }, []);

  const replaceState = useCallback((next: AppState) => {
    const clean = normaliseState(next);
    if (clean) setState({ ...clean, settings: { ...clean.settings, onboarded: true } });
  }, []);

  const eraseAll = useCallback(() => {
    setState((s) => ({
      ...createInitialState(),
      settings: { ...s.settings, onboarded: true, name: s.settings.name },
    }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      state,
      toasts,
      pushToast,
      dismissToast,
      toggleComplete,
      setCount,
      addSankalp,
      updateSankalp,
      setStatus,
      deleteSankalp,
      saveNote,
      deleteNote,
      updateSettings,
      snooze,
      acknowledge,
      replaceState,
      eraseAll,
    }),
    [
      state,
      toasts,
      pushToast,
      dismissToast,
      toggleComplete,
      setCount,
      addSankalp,
      updateSankalp,
      setStatus,
      deleteSankalp,
      saveNote,
      deleteNote,
      updateSettings,
      snooze,
      acknowledge,
      replaceState,
      eraseAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

/** Current civil date, refreshed at midnight and whenever the tab returns. */
export function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const tick = () => {
      const t = todayISO();
      setToday((cur) => (cur === t ? cur : t));
    };
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
