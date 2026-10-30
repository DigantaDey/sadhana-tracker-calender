// Render the production bundle inside jsdom and walk the whole app.
//
// This is a smoke test, not a unit test: it proves the built artefact mounts,
// that a fresh install starts with *no* data, that onboarding completes, that
// every tab renders, and that none of it touches the console.
//
//   npm run build && npm run smoke

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

const { window } = dom;
const errors = [];
const origError = console.error;
console.error = (...a) => {
  errors.push(a.join(' '));
  origError(...a);
};
window.addEventListener('error', (e) => errors.push('window error: ' + e.message));

const mm = (q) => ({
  matches: false,
  media: q,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false;
  },
});
window.matchMedia = mm;
Object.defineProperty(window.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
  configurable: true,
});

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
globalThis.KeyboardEvent = window.KeyboardEvent;
globalThis.DOMParser = window.DOMParser;
globalThis.MutationObserver = window.MutationObserver;
globalThis.IntersectionObserver =
  window.IntersectionObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
globalThis.ResizeObserver =
  window.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
// The modulepreload polyfill fetches chunk URLs; jsdom has no network stack.
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });

// Vite splits the app: import the entry the HTML actually points at.
const html = readFileSync(path.resolve('dist/index.html'), 'utf8');
const entry = html.match(/src="([^"]*assets\/[^"]+\.js)"/)?.[1];
if (!entry) {
  console.error('no entry script found in dist/index.html');
  process.exit(1);
}
await import(pathToFileURL(path.resolve('dist', entry.replace(/^\//, ''))).href);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(700);

const body = window.document.body;
const text = () => (body.textContent || '').replace(/\s+/g, ' ').trim();
const click = (needle) => {
  const btns = [...body.querySelectorAll('button')];
  const b = btns.find((x) => (x.textContent || '').trim().toLowerCase().includes(needle.toLowerCase()));
  if (!b) return false;
  b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
};

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. A fresh install must be empty, and must start with onboarding.
check('onboarding renders', text().includes('A practice tracker for vows'), text().slice(0, 60));
check('no seeded content', !/Gāyatrī|Ekādaśī Upavāsa|Aditya/.test(text()));

// 2. Walk the flow.
click('Begin');
await wait(250);
check('step 2 renders', text().includes('Make it yours'));
click('Continue');
await wait(250);
check('step 3 renders', text().includes('Begin with one vow'));
click('Gāyatrī japa');
await wait(120);
click('Take the vow');
await wait(450);
check('today screen after onboarding', /Today.s practice/.test(text()), text().slice(0, 80));
check('vow created', text().includes('Gāyatrī Japa'));

// 3. Pañcāṅga card opens a real computation.
const panch = [...body.querySelectorAll('button')].find((b) =>
  (b.getAttribute('aria-label') || '').startsWith('Pañcāṅga')
);
check('pañcāṅga card present', !!panch);
if (panch) {
  panch.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const t = text();
  check(
    'pañcāṅga sheet computed',
    /Nakṣatra/.test(t) && /Sunrise/.test(t) && /Tithi/.test(t),
    t.slice(0, 90)
  );
  click('Close');
  await wait(200);
}

// 4. Every tab renders.
for (const t of ['Calendar', 'Sankalp', 'Diary', 'Insights', 'Today']) {
  const ok = click(t);
  await wait(320);
  check(`tab ${t}`, ok && text().length > 80, `${text().length} chars`);
}

// 5. No console noise.
check('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
errors.slice(0, 8).forEach((e) => console.log('  •', e.slice(0, 300)));
setTimeout(() => process.exit(failed.length ? 1 : 0), 400);
