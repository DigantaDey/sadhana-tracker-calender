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
import { createInitialState, seedEmptyState } from './seed';
import { completionId } from './schedule';
import type { AppState, Note, Sankalp, SankalpStatus, Settings } from './types';

const KEY = 'sadhana.v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 1) return createInitialState();
    return {
      ...createInitialState(),
      ...parsed,
      settings: { ...createInitialState().settings, ...parsed.settings },
    };
  } catch {
    return createInitialState();
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / private mode — the app keeps working in memory */
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
  addSankalp: (s: Omit<Sankalp, 'id' | 'createdAt'>) => void;
  updateSankalp: (id: string, patch: Partial<Sankalp>) => void;
  setStatus: (id: string, status: SankalpStatus) => void;
  deleteSankalp: (id: string) => void;
  saveNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  snooze: (key: string, minutes: number) => void;
  acknowledge: (key: string) => void;
  resetDemo: () => void;
  clearAll: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(1);

  useEffect(() => {
    const id = window.setTimeout(() => save(state), 120);
    return () => window.clearTimeout(id);
  }, [state]);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = seq.current++;
    setToasts((cur) => [...cur.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }, []);

  const toggleComplete = useCallback(
    (sankalpId: string, date: string, note?: string) => {
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
    },
    []
  );

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
    const s: Sankalp = {
      ...input,
      id: `sk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setState((cur) => ({ ...cur, sankalps: [s, ...cur.sankalps] }));
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
    setState((s) => ({
      ...s,
      acknowledged: { ...s.acknowledged, [key]: Date.now() },
    }));
  }, []);

  const resetDemo = useCallback(() => setState(createInitialState()), []);
  const clearAll = useCallback(() => setState(seedEmptyState()), []);

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
      resetDemo,
      clearAll,
    }),
    [
      state, toasts, pushToast, dismissToast, toggleComplete, setCount, addSankalp,
      updateSankalp, setStatus, deleteSankalp, saveNote, deleteNote, updateSettings,
      snooze, acknowledge, resetDemo, clearAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

export function useToday() {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const tick = () => {
      const t = todayISO();
      setToday((cur) => (cur === t ? cur : t));
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
