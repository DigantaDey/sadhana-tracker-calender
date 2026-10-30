import { useEffect } from 'react';
import type { Settings } from '../lib/types';

export function useTheme(pref: Settings['theme']) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref;
      document.documentElement.setAttribute('data-theme', resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0B0B0C' : '#F2EFE9');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}

export function resolvedTheme(pref: Settings['theme']): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
