# Sādhana — product definition

*A personal practice tracker for people who keep vows, not habits.*

---

## 1. What this is

**Sādhana** is a local-first Android app where a practitioner records the vows they have taken —
japa, pāṭha, dhyāna, āsana, pūjā, sevā, svādhyāya, anuṣṭhāna — keeps them day by day on a calendar,
and writes their way through the practice in a diary that grows into a personal knowledge base.

The unit is not a habit. It is a **saṅkalpa**: a vow with edges. It has a day it was taken, a rhythm,
a practice window, and a day it rests. That framing changes everything downstream — the vocabulary,
the calendar, the analytics, and the tone.

> Existing habit trackers ask *"did you do it?"*. Sādhana asks *"was the vow kept, and what did it
> teach you?"*

## 2. The problem worth solving

A serious practitioner is currently running four tools badly:

| Need | Where it lives today | What breaks |
|---|---|---|
| Reciting 108 Gāyatrī every morning for 40 days | Phone alarm, memory | No record, no end date |
| Ekādaśī, Pūrṇimā, a specific tithi | Wall pañcāṅga, WhatsApp forwards | Easy to miss, no reminder |
| Weekly family pāṭha | Shared calendar | Invisible next to work events |
| Reflections, the return after a broken week | Notes app / diary / nothing | Never meets the tracker |

Habit apps make this worse: they are built for **streaks and shame**, with a binary checkbox pretending
that a broken week means a broken person. Sadhana must be built for **continuity and context**.

## 3. Product principles

1. **A vow with edges, not an infinite checklist.** Every practice must have a start, a rhythm, and a
   deliberate end. Open-ended is allowed, but it is a choice.
2. **Never shame a gap.** No red, no "you lost your streak", no guilt copy. A missed day is data.
   The streak counter is a mirror, not a scoreboard.
3. **Practice first, analytics second.** The home screen's primary verb is *mark this kept*. Charts
   are a consequence, never the subject.
4. **Local-first, no account.** Room on the device is the only copy. Export is a file, not a cloud
   subscription.
5. **Nothing is locked behind hardware.** The on-device AI degrades to local statistics that produce
   the *same* screens with honest labels. Low-end devices get a complete product.
6. **Tradition is handled with care.** Tithi is a real astronomical quantity, not a decoration. Where
   the build is approximate, the UI says so, out loud.
7. **Calm by default.** One reminder per practice. Quiet hours. No daily "engagement" nudge.

## 4. The core object: `Sankalp`

```
Sankalp
├─ identity      name · glyph · colour · category · the vow in your own words
├─ span          startedOn ──┬── endsOn (21 / 40 / 108 / 365 / a date / ongoing)
├─ rhythm        daily · weekdays · monthly · yearly · by tithi · one-off
├─ window        none · "at 05:30" · "05:30–06:15"
├─ measure       optional count target (27 / 54 / 108 / 1008 …)
├─ reminder      on/off · lead time (at start → 2 hr) · snooze length
└─ state         active · paused · completed · stopped
```

Everything else in the app is a projection of this object:

- **Occurrence** — "is this due on 2026-11-02?" One pure function, used by the calendar, the streak,
  the analytics and the alarm. They can never disagree.
- **Mark** — `(sankalpId, date, done, count?)`. Immutable history: pausing a vow never erases what was kept.
- **Note** — markdown with `[[wiki links]]`, `#tags`, and backlinks, optionally attached to a date.

## 5. The loop

```
        ┌──────────────────────────────────────────────┐
        │  1. TAKE       choose a vow, its rhythm,     │
        │                its window, its end           │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  2. KEEP       a 05:15 reminder · snooze ·   │
        │                one tap or one count tick     │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  3. REFLECT    a diary line · tags · links · │
        │                weekly reflection             │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  4. CLOSE      completed · paused · stopped  │
        │                — deliberately, with history  │
        └──────────────────────────────────────────────┘
```

Step 3 is what most trackers skip, and it is the reason this app exists.

## 6. Information architecture

Five tabs — no drawer, no hamburger.

| Tab | Job | Key elements |
|---|---|---|
| **Today** | *What is mine today?* | Greeting + tithi, streak / 7-day rate / vows in force, today's practice list with check & count, 7-day bars, horizontal sankalp strip, diary card |
| **Calendar** | *How is it going over time?* | Segmented **Day · Week · Month · Year**, month grid with per-practice dots, week columns, day timeline, year heat-months, selected-day preview |
| **Sankalp** | *What have I committed to?* | Active / Paused / Ended filters, progress + streak + day N of M, tap → detail sheet (edit, pause, complete, stop, delete, +1 count) |
| **Diary** | *What is this teaching me?* | Search, tag chips, note list, markdown editor with preview, backlinks, and a **constellation** (link graph) |
| **Insights** | *What do my own records say?* | On-device engine card, composed reflection, 13-week heatmap, 30-day rate per practice, local insight cards |

Settings is a pushed screen from Today: appearance, name, week start, reminders (lead, snooze, quiet
hours), on-device model tier, export / restore / reset.

## 7. Feature specification

### 7.1 Schedule engine
- **Daily**, **specific weekdays** (S M T W T F S), **monthly on day n** (clamped to month length),
  **yearly on month/day**, **by tithi** (1–30, śukla/kṛṣṇa), **one-off** anuṣṭhāna on a date.
- Occurrence = `status active` ∧ `startedOn ≤ date ≤ endsOn` ∧ rhythm matches.
- Week start is a setting (Monday default for India).

### 7.2 Tithi
The lunar day is derived from the Moon's elongation over the Sun (12° per tithi), computed locally
with low-precision lunar theory. Accurate to roughly ±20 minutes of a real tithi boundary — enough to
*display* the lunar day and to open a vrata reminder window.

**Honest limitation, surfaced in the UI:** a production build swaps in a full ephemeris (Swiss
Ephemeris or a pañcāṅga service) plus sunrise for the location, because vrata rules are sunrise-bound.

### 7.3 Reminders
- One exact alarm per upcoming occurrence (`AlarmManager.setExactAndAllowWhileIdle`), re-armed after
  each firing, after reboot, after a timezone change.
- Lead time per vow (`At start`, 10, 15, 30 min, 1 hr, 2 hr) with a global default.
- Notification actions: **Mark kept** (writes the mark without opening the app) and **Snooze**
  (re-arms +N minutes; per-vow snooze length).
- Quiet hours suppress the ring; the in-app card still appears.
- Android 12+: if exact alarms are unavailable, degrade to inexact rather than fail.

### 7.4 Calendar
- **Day** — timeline with a time gutter.
- **Week** — seven columns, one bar per scheduled practice, filled when kept.
- **Month** — dot per practice (colour-coded, dimmed until kept), today ring, jade wash on fully-kept
  days, tap to preview, tap again for the full day sheet.
- **Year** — twelve mini-months as a heat grid; tap a month to drill in.
- Every view can mark a practice kept in place, and links to the day sheet / practice sheet.

### 7.5 Diary (the Obsidian-shaped part)
- Plain markdown. Links with `[[Note title]]`, tags with `#tag`, backlinks below the note.
- Daily note auto-created per date, titled like *30 October 2026*.
- Preview toggle rendering the same subset the editor produces (no HTML, no WebView).
- **Constellation** view: deterministic force layout of notes and their links — the diary becomes a map
  of the practice over months, which is the whole reason it lives beside the tracker.
- Search across titles and bodies; tag chips with counts.

### 7.6 On-device AI, tiered
| Tier | Engine | Gate | Behaviour |
|---|---|---|---|
| **nano** | Gemini Nano via Android AICore | AICore package present, Android 14+ | Summaries, reflection prompts, semantic search — no download |
| **lite** | MediaPipe LLM, 1–2B q4 | 6–8 GB RAM, not low-RAM | Same features, loaded only while a request is in flight, downloaded once on Wi-Fi + charge |
| **rules** | Local statistics | everything else | Identical screens; prose composed from real numbers |

The **rules** tier is not a teaser. It ships the heatmap, streaks, per-practice rates, best weekday,
"your mornings are load-bearing", "this practice is slipping" — the useful 80%. The model tier only
improves the prose.

> Design rule: no feature may exist *only* in a model tier. The label changes; the screen does not.

## 8. Design language

- **Two appearances, one soul.**
  - *Paper* (light): warm off-white `#F2EFE9`, ink `#17150F`, saffron `#B5741F`, hairline `#E7E1D6`.
  - *Night* (dark): near-black `#0A0A0B`, bone `#F4F0E9`, saffron `#ECB877`, hairline `#262629`.
- **Type** — Fraunces (optical-size variable serif) for display and numbers; Inter for UI. Numbers are
  tabular everywhere so counters never jitter.
- **Colour** — saffron as the single accent, six practice tints (saffron, indigo, jade, terracotta,
  plum, slate), jade reserved for "kept", terracotta-rose for destructive.
- **Surfaces** — 1px hairlines instead of shadows in dark; soft warm shadows in light; 18–24px radii;
  a barely-there film grain so flat panels feel printed.
- **Motion** — spring press (0.97 scale), 420ms bottom-sheet rise, 800ms ring/bar fills, checked-state
  320ms spring. Everything respects `prefers-reduced-motion` / animator duration scale.
- **Copy** — second person, no exclamation marks, no gamification verbs. "Kept", not "completed".
  "A clear day. Rest is also a practice."

## 9. Platform notes (Android)

- **One activity**, Compose + Material 3, `SadhanaTheme` with explicit light/dark schemes (not just
  dynamic colour) so the brand survives every OEM.
- **Room** (`sankalps`, `completions`, `notes`) is the only source of truth; `Frequency` is stored as
  JSON through a type converter so new rhythms don't need a migration of columns.
- **DataStore (Preferences)** for settings.
- **AlarmManager** for time-bound reminders, **BroadcastReceiver** for actions, **BOOT_COMPLETED** to
  re-arm. No foreground service, no polling.
- **Backup**: `allowBackup` with an explicit DB include, plus a JSON export for portability.
- **Permissions**: `POST_NOTIFICATIONS` (asked when reminders are switched on, never at launch),
  `SCHEDULE_EXACT_ALARM` with graceful fallback.

## 10. What we deliberately do not do

- No social feed, no leaderboard, no sharing of streaks.
- No paid tier that hides charts.
- No "AI guru" — no generated spiritual advice, no text that pretends to be a teacher.
- No cloud account in v1. Multi-device sync is an explicit later decision, not a default.
- No streak-loss notifications. Ever.

## 11. Roadmap

**v0.1 — this build.** Sankalp engine, calendar (4 views), marks + counts, reminders + snooze, diary
with links/tags/backlinks/graph, insights, tiered on-device AI, light/dark.

**v0.5 — depth.**
Full pañcāṅga with location + sunrise; vrata rule presets (Ekādaśī, Pradōṣa, Caturthī, Pūrṇimā);
recurring anuṣṭhāna templates (Navarātri 9 nights, 40-day maṇḍala); widget (today's list, one-tap
check); Wear tile; encrypted export; note attachments (images of the mālā count).

**v1.0 — continuity.**
Optional end-to-end encrypted sync (user-held key, not an account); "return after a gap" flow;
yearly practice review; print/PDF of a completed anuṣṭhāna as a keepsake.

## 12. What success looks like

Not DAU. Three measures:

1. **Weekly vow-keeping rate** of returning users — does the app make keeping easier?
2. **Entries per week in the diary** — is the reflection loop actually closing?
3. **Vows closed deliberately** (completed or paused) rather than abandoned — does the product teach
   healthy endings?

If (1) rises while (2) is flat, this is a checklist. If (3) is rare, the language is still wrong.
