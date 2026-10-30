// Render the production bundle inside jsdom to catch runtime errors.
import { JSDOM } from 'jsdom';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

const { window } = dom;
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.join(' ')); origError(...a); };
window.addEventListener('error', (e) => errors.push('window error: ' + e.message));

const mm = (q) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
});
window.matchMedia = mm;
Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', configurable: true });

globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.localStorage = window.localStorage;
globalThis.matchMedia = mm;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.MouseEvent = window.MouseEvent;
globalThis.DOMParser = window.DOMParser;
globalThis.MutationObserver = window.MutationObserver;
globalThis.IntersectionObserver = window.IntersectionObserver ?? class { observe(){} unobserve(){} disconnect(){} };
globalThis.ResizeObserver = window.ResizeObserver ?? class { observe(){} unobserve(){} disconnect(){} };
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const assets = path.resolve('dist/assets');
const js = readdirSync(assets).find((f) => f.endsWith('.js'));
await import(pathToFileURL(path.join(assets, js)).href);

await new Promise((r) => setTimeout(r, 600));

const body = window.document.body;
const text = body.textContent || '';
console.log('--- rendered chars:', text.length);
console.log('--- sample:', text.replace(/\s+/g, ' ').slice(0, 320));
console.log('--- buttons:', body.querySelectorAll('button').length);

function clickByText(t) {
  const btns = [...body.querySelectorAll('button')];
  const b = btns.find((x) => (x.textContent || '').trim().toLowerCase().includes(t.toLowerCase()));
  if (!b) { console.log('!! no button:', t); return false; }
  b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
}

for (const t of ['Calendar', 'Sankalp', 'Diary', 'Insights', 'Today']) {
  const ok = clickByText(t);
  await new Promise((r) => setTimeout(r, 250));
  console.log(`nav ${t}: ${ok ? 'ok' : 'MISSING'} · chars=${(body.textContent || '').length}`);
}

console.log('--- errors:', errors.length);
errors.slice(0, 12).forEach((e) => console.log('  •', e.slice(0, 400)));

setTimeout(() => { process.exit(0); }, 5000);
