# Sādhana — a practice tracker that computes its own pañcāṅga

Take a vow (*saṅkalpa*), give it a rhythm, and keep an honest record of the days you kept it.
Mark it on a calendar, count it, write about it — and see the tithi, nakṣatra and yoga for the
day without asking a server.

Two shipping targets, one product:

| | Stack | State |
|---|---|---|
| **Web app / PWA** (`app/`) | React 19 · TypeScript · Vite 8 · no backend | Built, type-checked, 45 tests + jsdom smoke green, installable and offline |
| **Android app** (`android/`) | Kotlin 2.0 · Jetpack Compose · Room · AlarmManager | Complete source, R8 + signing + Play metadata configured — **not compiled in this sandbox** (no JDK/SDK here) |

The product thinking, design language and roadmap live in **[PRODUCT.md](PRODUCT.md)**.

---

## Why it exists

Most habit trackers ask you to check a box. Sādhana is built around the older idea of a
*saṅkalpa*: a vow with edges — the day it begins, its rhythm, the day it ends — and a record that
never rewrites itself to look better.

- **Vows, not tasks.** Daily · chosen weekdays · monthly · yearly · **by tithi** · one-off.
- **A calendar that is the same engine as the streak.** Four zoom levels, mark kept in place.
- **A diary that becomes a knowledge base.** Markdown, `[[wiki links]]`, `#tags`, backlinks, a
  constellation graph — plus a second-brain integration surface based on plain files.
- **A real pañcāṅga.** Tithi, pakṣa, nakṣatra, yoga, karaṇa, sunrise/sunset, moonrise/moonset,
  tithi end times, vṛddhi/kṣaya rules — computed on the device.
- **No account, no network, no analytics.** A fresh install is genuinely empty.

---

## Quick start

### Web app

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `0.0.0.0` (works behind a proxy or a phone on the LAN) |
| `npm run build` | `tsc --noEmit` + production build into `dist/` |
| `npm run preview` | Serve `dist/` the way a CDN would |
| `npm test` | Vitest — astronomy, pañcāṅga, occurrence engine, persistence, markdown |
| `npm run smoke` | Builds are not enough: drives the real bundle in jsdom (onboarding → tabs) |
| `npm run verify` | All four, in the order CI runs them |

Requires Node 20+. There are no runtime dependencies beyond React, `lucide-react` and two
self-hosted variable fonts.

### Android

```bash
# JDK 17 + Android SDK 35. Open android/ in Android Studio and press Run,
# or with Gradle 8.9+ on PATH:
cd android && gradle assembleDebug
```

Release builds read `android/keystore.properties` (git-ignored; copy
`keystore.properties.example`), then:

```bash
cd android && gradle bundleRelease   # app/build/outputs/bundle/release/app-release.aab
```

---

## The pañcāṅga, and why you can trust it

Everything is computed locally in `app/src/lib/astro.ts` and `app/src/lib/panchang.ts` — no
ephemeris file, no network call, no bundled lookup table.

| Piece | Method |
|---|---|
| Sun | Meeus, *Astronomical Algorithms* ch. 25 — apparent longitude, RA/Dec, equation of time |
| Moon | Meeus ch. 47 — the full 60-term longitude series (47.A), 60-term latitude series (47.B), additive corrections |
| Time scale | ΔT via Espenak & Meeus (2006); every routine converts UT → TT |
| Sidereal frame | Lahiri (Chitrapakṣa) ayanāṁśa |
| Sunrise / sunset / solar noon | NOAA hour-angle formulation, h₀ = −0.833°, one refinement pass |
| Moonrise / moonset | Meeus ch. 15 with h₀ = 0.7275·π − 0.5667° |
| **Tithi** | Elongation ÷ 12°, **prevailing at local sunrise** (the rule every printed pañcāṅga uses) |
| Tithi end | Secant solve of "elongation = 12°·k", typically sub-second |

### Accuracy, measured

The suite pins the engine to published reference values rather than to its own past output:

- **Meeus 25.b** (Sun): λ 199.90895°, RA 198.38083°, Dec −7.78507° → matches to 1e-5°.
- **Meeus 47.a** (Moon): λ 133.162655°, β −3.229126°, Δ 368 409.7 km → matches to 1e-5°.
- **New moons** 1977-02-18 03:37:42 TD, 2024-04-08 18:21, 2025-03-29 10:58, 2026-08-12 17:37:
  all within 4 minutes, most under 1.
- **Full moons** 2024-09-18 02:34, 2026-03-03 11:38: same.
- **Sunrise** Delhi 06:31 / sunset 17:37 (2026-10-30), London 04:43 (2026-06-21),
  Tromsø returns `null` through the polar day instead of inventing a time.
- **Worked example**, Delhi 2026-10-30: tithi 20 *Kṛṣṇa Pañcamī* ending 19:25, Mṛgaśirā,
  Śiva yoga, Kaulava karaṇa, 81 % illuminated; moonrise 21:18, moonset 11:01.

**Tithi boundaries are observer-independent** — the same instant everywhere, only the clock
differs — and there is a test for exactly that. What *does* depend on place is **which day the
tithi is counted on**, because sunrise decides it. So the app asks for a place once and never
guesses.

**Vrata rules** (`observanceOn`): a tithi prevailing at sunrise is observed that day; a **vṛddhi**
tithi (two sunrises) is observed on the **second**; a **kṣaya** tithi (no sunrise) is observed on
the day it begins. A year contains 24–26 Ekādaśī observance dates — the test checks that none are
skipped.

The Android engine (`domain/Astronomy.kt`, `domain/Panchang.kt`) is a line-for-line port of the
same maths with the same 60+60 term tables (checked term by term against the web engine, and the
port's arithmetic re-derived outside Android to agree within 1e-5°).

---

## No dummy data. At all.

A new install has **zero** vows, **zero** marks and **zero** diary entries — in the browser, in
the app, and in the tests that assert it.

- `initialState.ts` creates an empty document; nothing is ever seeded.
- The web build used to ship a sample journal. Any legacy `sadhana.v1` payload is **migrated with
  the sample content stripped**: demo vows are the only records with built-in IDs
  (`sk-gayatri`, `sk-vishnu`, `sk-yoga`, `sk-shiva`, `sk-ekadashi`), sample notes are the only
  ones with built-in note IDs, and both are dropped. Your own vows, marks and notes are kept
  verbatim. There is a test for each half of that sentence.
- Android's `SeedData` (a 120-day generated backlog) has been **deleted**, along with the
  `seeded_v1` boot flag. `SadhanaApp` no longer has anything to seed.
- The first run is a three-step welcome — name, place, "begin with one vow" — and it creates
  nothing. The empty Today screen then offers a single button, not a fake streak.

---

## Installable, offline, and quiet

`app/public/manifest.webmanifest` + `app/public/sw.js` + generated icons make the web build a
real PWA:

- `display: standalone`, portrait, `theme-color` in light and dark, maskable + any-purpose icons,
  `apple-touch-icon`, `viewport-fit=cover` so it fills a notched screen.
- Service worker `sadhana-shell-v1`: navigations are **network-first** with the cached shell as
  the fallback; hashed assets are **cache-first** (they are immutable by construction); anything
  cross-origin is ignored. Old caches are purged on activate.
- Registered only in production, on `load`, so it never competes with first paint in dev.
- Offline means: after one visit, the app opens and works with no connection. It cannot mean
  "works before first visit" for anything.
- The theme is applied from `localStorage` **before** React mounts, so there is no white flash on
  reload.

---

## Performance budget (measured, not aspirational)

Every number below is from `npm run build` on this branch.

| Chunk | Raw | Gzip |
|---|---|---|
| `react` + `react-dom` + scheduler | 218.90 kB | **68.28 kB** |
| `index` (app shell, store, pañcāṅga entry) | 72.75 kB | **25.43 kB** |
| CSS (one file, no runtime CSS-in-JS) | 47.51 kB | **9.99 kB** |
| Lazy screens (`Diary` … `PracticeDetail`) | 5.5 – 14.5 kB each | 2 – 5.6 kB each |

- **Route-level code splitting** with `React.lazy`; `manualChunks` keeps React in its own
  long-lived chunk so a copy change does not invalidate it.
- **Fonts**: six hand-declared `woff2` faces (Inter + Fraunces, latin & latin-ext only),
  `font-display: swap`, explicit `unicode-range`. Emotion, Cyrillic and Vietnamese subsets are no
  longer shipped; no `@import` chain blocks CSS.
- **Icons** are generated PNGs, not a 300 kB icon font. `lucide-react` icons are tree-shaken per
  screen.
- **Astronomy is cheap**: a 420-day cold scan (a full year of pañcāṅga, every limb) takes
  **128 ms — 0.31 ms per day**; a warm pass over the same 420 days is **0.6 ms** because results
  are memoised (768-entry cache). The month grid is one memoised 42-cell pass.
- **No layout thrash**: one scroll container per screen, `content-visibility: auto` on long
  lists, spring transitions on transform/opacity only.
- `console.*` and `debugger` are dropped from production builds by esbuild; build target `es2020`
  keeps the output parseable on older WebViews.

---

## Play Store readiness

Configured in the repo:

- `targetSdk 35`, `minSdk 26`, AGP 8.7.3, Kotlin 2.0.21, Compose BOM 2024.10.01.
- **Release signing** from `keystore.properties` (never committed), R8 + resource shrinking on,
  `versionCode`/`versionName` bumped to 2 / `2.0.0` to match the web app.
- **No `INTERNET` permission at all** — the strongest possible answer on the Data safety form.
- `USE_EXACT_ALARM` deliberately **removed**: Play restricts it to alarm/calendar apps. Reminders
  use `SCHEDULE_EXACT_ALARM` when granted and degrade to an inexact alarm when it is not.
- `allowBackup` with explicit `backup_rules.xml` / `data_extraction_rules.xml` includes, so a
  device transfer keeps your practice history and nothing else.
- Adaptive icon (foreground + monochrome for themed icons), splash icon, `Theme.Sadhana` with the
  app's own background in **light and night** variants — no white flash between splash and frame.
- Predictive back enabled, edge-to-edge, `windowSoftInputMode="adjustResize"`, RTL supported.
- No cleartext traffic (`usesCleartextTraffic="false"`).
- Optional on-device inference is feature-detected and off by default; the tier-3 experience is a
  first-class UI, so no screen is gated behind hardware.

Still on you before submitting:

1. Create an upload key and put it in `android/keystore.properties`.
2. `gradle bundleRelease` — this sandbox has no JDK/SDK, so no AAB has been produced here.
3. Play Console: listing copy, 2–8 phone screenshots, feature graphic, 512×512 icon (the repo has
   `app/public/icon-1024.png` to downscale), content rating, Data safety, privacy policy URL.
4. Internal testing track with the 20-tester minimum, then closed → production.

---

## Repository map

```
app/                        React 19 + TS + Vite 8 PWA
├─ index.html               PWA shell: manifest, icons, theme-colour, noscript
├─ public/                  manifest, service worker, generated icons
├─ scripts/smoke.mjs        jsdom end-to-end smoke test
├─ vite.config.ts           chunks, lightningcss, console pruning, __APP_VERSION__
└─ src/
   ├─ lib/
   │  ├─ astro.ts           Meeus solar + lunar series, ΔT, rise/set — the engine
   │  ├─ panchang.ts        sunrise-day pañcāṅga, names, vrata rules, cache
   │  ├─ location.ts        GeoLocation + 36-city presets + zone helpers
   │  ├─ schedule.ts        occurrence engine, streaks, tallies, progress
   │  ├─ initialState.ts    empty document + v1 migration (drops sample content)
   │  ├─ store.tsx          persistence (localStorage `sadhana.v2`), CRUD, toasts
   │  ├─ markdown.ts        safe markdown → HTML strings + link/tag extraction
   │  └─ __tests__/         vitest: astro, panchang, schedule, state
   ├─ screens/              Today, DaySheet, Onboarding, PanchangSheet, Calendar,
   │                        Practices, Diary, Insights, Settings, CreateSankalp, PracticeDetail
   ├─ components/           ui primitives, TabBar, StatusBar, NoteGraph, LocationPicker
   ├─ hooks/                useTheme, useReminders
   └─ styles/               app.css (design system), fonts.css (self-hosted faces)

android/                    Kotlin + Compose app
└─ app/src/main/java/app/sadhana/
   ├─ domain/Astronomy.kt   the same solar/lunar engine, ported
   ├─ domain/Panchang.kt    tithi at sunrise, nakṣatra, yoga, karaṇa, vrata rules, place presets
   ├─ domain/Schedule.kt    one occurrence function, shared by calendar, streak and alarms
   ├─ data/                 Room entities/DAOs/repository, DataStore settings
   ├─ notifications/        exact-alarm scheduler, notification actions, boot re-arm
   ├─ ai/OnDeviceAi.kt      capability tiers + local insight generation
   └─ ui/                   Compose screens, sheets, theme

PRODUCT.md                  product definition, design language, roadmap
```

---

## Testing

```bash
cd app
npm test          # 45 tests, 4 suites, ~1.2 s
npm run smoke     # 14 checks against the built bundle in jsdom
```

What the 45 tests actually assert:

- **`astro.test.ts` (14)** — Meeus worked examples, six published new/full moons, reproducibility
  across 24 lunar cycles, sunrise for three latitudes (including a polar null), moonrise,
  ΔT behaviour.
- **`panchang.test.ts` (13)** — a full day's pañcāṅga fixture, observer-independence of tithi
  ends, Ekādaśī observance, the vṛddhi rule, "no skipped Ekādaśī in a year", Pūrṇimā/Amāvasyā,
  an eclipse-day full moon.
- **`schedule.test.ts` (9)** — every rhythm including tithi and day-31 clamping, ordering by time
  window, `tallyDay`, streak tolerance for an unfinished today, progress/next-occurrence maths.
- **`state.test.ts` (9)** — a fresh install is empty, v1 migration drops sample content but keeps
  real work, markdown escapes injected HTML.

The smoke test is deliberately not a unit test: it boots `dist/index.html` in jsdom, walks
onboarding → Today → creates a vow → opens the pañcāṅga sheet → cycles all five tabs, and fails on
**any** console error.

---

## Privacy

No account. No network calls. No analytics, crash reporting or ads. Data lives in
`localStorage` (web) or Room/DataStore (Android) on your device. Cloud backup on Android is opt-in
via the OS and limited to the practice database.

## Limits, stated plainly

- The **Android module has not been compiled in this environment** (no JDK/SDK, no Maven access).
  Its engine has been validated numerically against the tested web engine; the Kotlin still needs
  a Gradle run and a device pass.
- **ΔT is a polynomial**, so absolute new/full moon times carry a few seconds of error far from
  the present — irrelevant to a tithi, which lasts ~24 h.
- **Refraction is assumed constant** (34′). A real horizon — mountains, sea level — can shift
  sunrise by a minute or two and, in rare cases, the sunrise tithi.
- Moonrise/moonset are not yet exposed on Android (web has them).
- JSON export/import is specified and stubbed in the Android settings; the web app's export is the
  working one.
