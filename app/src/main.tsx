import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './lib/store';
import './styles/app.css';

// paint the last known theme before React mounts so there is no flash
const stored = localStorage.getItem('sadhana.v1');
let initial: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
if (stored) {
  try {
    const pref = JSON.parse(stored)?.settings?.theme;
    if (pref === 'light' || pref === 'dark') initial = pref;
  } catch {
    /* ignore */
  }
}
document.documentElement.setAttribute('data-theme', initial);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);
