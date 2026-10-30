import { createContext, useContext } from 'react';
import type { Sankalp } from './types';

export type Tab = 'today' | 'calendar' | 'practices' | 'diary' | 'insights';

export type NoteRequest = { kind: 'id'; id: string } | { kind: 'title'; title: string } | { kind: 'date'; date: string };

export type Nav = {
  tab: Tab;
  setTab: (t: Tab) => void;
  openCreate: (edit?: Sankalp) => void;
  openDay: (iso: string) => void;
  openPractice: (id: string) => void;
  openNote: (req: NoteRequest) => void;
  openSettings: () => void;
};

export const NavCtx = createContext<Nav | null>(null);

export function useNav(): Nav {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useNav outside provider');
  return v;
}
