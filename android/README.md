# Sādhana — Android

Kotlin · Jetpack Compose · Material 3 · Room · AlarmManager · DataStore

```
app/src/main/java/app/sadhana/
├─ SadhanaApp.kt              Application + manual DI container
├─ MainActivity.kt            single activity, edge-to-edge, splash
├─ core/Dates.kt              local-civil-date helpers (ISO everywhere)
├─ domain/
│   ├─ Model.kt               Sankalp, Frequency (sealed, @Serializable), Note, Settings
│   ├─ Panchang.kt            approximate tithi + PanchangProvider seam
│   ├─ Schedule.kt            occursOn / scheduledOn / progress — the one source of truth
│   └─ Stats.kt               streaks, consistency, day tallies
├─ data/
│   ├─ Entities.kt            Room tables (+ indices)
│   ├─ Daos.kt                Flow-based DAOs
│   ├─ SadhanaDatabase.kt
│   ├─ Mappers.kt             entity ⇄ domain, Frequency as JSON
│   ├─ SadhanaRepository.kt   local-first API, safe from a receiver
│   ├─ SettingsStore.kt       DataStore preferences
│   └─ SeedData.kt            first-run demo data
├─ notifications/
│   ├─ Notifications.kt       channels
│   ├─ ReminderScheduler.kt   exact alarms, snooze, cancellation index
│   ├─ ReminderReceiver.kt    notification with Mark kept / Snooze
│   ├─ ReminderActionReceiver.kt
│   └─ BootReceiver.kt        re-arm after reboot / update / tz change
├─ ai/OnDeviceAi.kt           capability tiers + local insights + reflection
├─ util/Markdown.kt           AnnotatedString markdown (no HTML, no WebView)
└─ ui/
    ├─ SadhanaViewModel.kt    combines Room + settings into one UiState
    ├─ SadhanaRoot.kt         bottom navigation + sheets
    ├─ screens/               Today, Calendar, Sankalp, Diary, Insights, Settings
    ├─ sheets/                CreateSankalp, PracticeDetail, Day
    ├─ components/Common.kt   cards, chips, glyphs, bars, hairlines
    └─ theme/Theme.kt         Paper / Night schemes, serif display type
```

## Build

```bash
# JDK 17 and Android SDK 35 required.
# Open the folder in Android Studio and press Run (it creates the wrapper jar),
# or with Gradle 8.9+ on PATH:
gradle assembleDebug
gradle installDebug
```

## Design decisions worth knowing

**One occurrence function.** `Schedule.occursOn` decides whether a vow is due on a date. The
calendar cells, the streak, the analytics and the alarm all call it. A reminder can never fire for a
day the calendar says is empty.

**Alarms, not polling.** `AlarmManager.setExactAndAllowWhileIdle` per upcoming occurrence, re-armed
after firing, reboot, package replace and timezone change. `SCHEDULE_EXACT_ALARM` is honoured; when
it is denied the code degrades to `setAndAllowWhileIdle` instead of crashing. The armed
`(sankalp, date)` is recorded in SharedPreferences so cancellation is exact rather than best-effort.

**Snapshot-free history.** Marks are `(sankalpId, date)` rows that survive pausing, stopping and
deleting a vow's schedule. The app never rewrites the past to make a chart look better.

**Graceful AI.** `OnDeviceAi.capability()` inspects AICore presence, Android version, total RAM and
`isLowRamDevice`. Tier 3 (local statistics) is a first-class product surface, not an error state — the
insights, heatmap and reflection all still render.

**Pañcāṅga is a seam.** `PanchangProvider` is an interface. `ApproximatePanchang` is honest about its
precision; swapping in Swiss Ephemeris + sunrise changes one object and one screen's footnote.

## Not yet done here

- Compilation: no JDK/SDK in this workspace, so this module has not had a Gradle run.
- `DataExport` (JSON export/import) is described in Settings and specified in PRODUCT.md; the
  repository has the schema for it but the serializer + FileProvider write is still to be added.
- Widgets, Wear, attachments, sync — see the roadmap in PRODUCT.md §11.
