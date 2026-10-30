import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './lib/store';
import './styles/app.css';

// Paint the last known theme before React mounts, so there is no flash.
const stored = localStorage.getItem('sadhana.v2') ?? localStorage.getItem('sadhana.v1');
let initial: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
if (stored) {
  try {
    const pref = JSON.parse(stored)?.settings?.theme;
    if (pref === 'light' || pref === 'dark') initial = pref;
  } catch {
    /* ignore a corrupt payload — the store will start clean */
  }
}
document.documentElement.setAttribute('data-theme', initial);

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);

// Offline shell, production only (a dev server should never be cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* not fatal: the app works online without it */
    });
  });
}
