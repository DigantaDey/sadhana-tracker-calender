package app.sadhana.data

import android.content.Context
import app.sadhana.AppContainer
import app.sadhana.core.Dates
import app.sadhana.domain.Category
import app.sadhana.domain.ColorKey
import app.sadhana.domain.Frequency
import app.sadhana.domain.Note
import app.sadhana.domain.Reminder
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Status

/**
 * A lived-in starting point, so a new install is not a blank page.
 * It is ordinary demo data — one tap in Settings and it is gone.
 */
object SeedData {

    private const val FLAG = "seeded_v1"

    suspend fun seedIfEmpty(context: Context, container: AppContainer) {
        val prefs = context.getSharedPreferences("sadhana_boot", Context.MODE_PRIVATE)
        if (prefs.getBoolean(FLAG, false)) return
        val existing = container.repo.currentSankalps()
        if (existing.isNotEmpty()) {
            prefs.edit().putBoolean(FLAG, true).apply()
            return
        }

        val today = Dates.todayIso()
        val sankalps = listOf(
            Sankalp(
                id = "sk-gayatri",
                name = "Gāyatrī Japa",
                intention = "One mālā at first light, before the house wakes.",
                category = Category.JAPA,
                color = ColorKey.SAFFRON,
                glyph = "ॐ",
                startedOn = Dates.addDays(today, -96),
                endsOn = Dates.addDays(today, 54),
                frequency = Frequency.Daily,
                timeStart = "05:30",
                timeEnd = "06:15",
                targetCount = 108,
                reminder = Reminder(true, 15, 30),
            ),
            Sankalp(
                id = "sk-vishnu",
                name = "Viṣṇu Sahasranāma",
                intention = "Friday evening pāṭha with the family.",
                category = Category.PATHA,
                color = ColorKey.INDIGO,
                glyph = "॥",
                startedOn = Dates.addDays(today, -201),
                frequency = Frequency.Weekly(listOf(5)),
                timeStart = "18:30",
                reminder = Reminder(true, 60, 30),
            ),
            Sankalp(
                id = "sk-yoga",
                name = "Āsana & Prāṇāyāma",
                intention = "Forty-five minutes, six mornings a week.",
                category = Category.YOGA,
                color = ColorKey.JADE,
                glyph = "✶",
                startedOn = Dates.addDays(today, -78),
                endsOn = Dates.addDays(today, 122),
                frequency = Frequency.Weekly(listOf(1, 2, 3, 4, 5, 6)),
                timeStart = "06:30",
                timeEnd = "07:15",
                reminder = Reminder(true, 10, 15),
            ),
            Sankalp(
                id = "sk-shiva",
                name = "Pañcākṣarī — 40 day anuṣṭhāna",
                intention = "Forty days of ॐ नमः शिवाय, one mālā at dusk.",
                category = Category.JAPA,
                color = ColorKey.TERRACOTTA,
                glyph = "❁",
                startedOn = Dates.addDays(today, -11),
                endsOn = Dates.addDays(today, 28),
                frequency = Frequency.Daily,
                timeStart = "19:45",
                timeEnd = "20:15",
                targetCount = 108,
                reminder = Reminder(true, 30, 15),
            ),
            Sankalp(
                id = "sk-ekadashi",
                name = "Ekādaśī Upavāsa",
                intention = "A light day, a quiet mind.",
                category = Category.ANUSTHANA,
                color = ColorKey.PLUM,
                glyph = "✦",
                startedOn = Dates.addDays(today, -220),
                frequency = Frequency.Tithi(11),
                reminder = Reminder(true, 720, 120),
            ),
        )

        sankalps.forEach { container.repo.save(it) }

        // A believable backlog: most days kept, the last six complete, today open.
        val random = java.util.Random(20261030L)
        for (i in 1..120) {
            val iso = Dates.addDays(today, -i.toLong())
            sankalps.forEach { sankalp ->
                if (!Schedule.occursOn(sankalp, iso)) return@forEach
                val keep = i <= 6 || random.nextDouble() < 0.82
                if (keep) {
                    container.database.completions().upsert(
                        CompletionEntity(
                            sankalpId = sankalp.id,
                            date = iso,
                            done = true,
                            count = sankalp.targetCount,
                            note = null,
                            updatedAt = System.currentTimeMillis(),
                        )
                    )
                }
            }
        }

        container.repo.saveNote(
            Note(
                id = "note-steadiness",
                date = Dates.addDays(today, -2),
                title = "On steadiness",
                body = "The practice is not the feeling, the practice is the returning.\n\n" +
                    "I keep expecting a good sitting to feel like something. Mostly it feels like brushing teeth for the mind.\n\n#svadhyaya",
                pinned = true,
            )
        )
        container.repo.saveNote(
            Note(
                id = "note-day-40",
                date = Dates.addDays(today, -4),
                title = "Day 40 — the mind wanders",
                body = "Forty days ago I started [[Pañcākṣarī — 40 day anuṣṭhāna]] with the idea that by now it would be automatic.\n\n" +
                    "It is not automatic. But the resistance has thinned.\n\n- I am less reactive in the morning\n- My sleep has moved earlier\n- I now plan around the practice\n\n#anusthana #milestone",
            )
        )
        container.repo.saveNote(
            Note(
                id = "note-today",
                date = today,
                title = "Morning, before the world",
                body = "Woke at 5:10 without the alarm. Japa felt quiet today — not ecstatic, just steady, which I am learning to prefer.\n\n#japa",
            )
        )

        prefs.edit().putBoolean(FLAG, true).apply()
    }
}
