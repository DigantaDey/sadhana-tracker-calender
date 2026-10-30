package app.sadhana.domain

import app.sadhana.core.Dates

/**
 * The single source of truth for "is this vow due on this day?".
 * Pure functions only — every screen, reminder and statistic goes through here,
 * so the calendar, the streak and the alarm can never disagree.
 */
object Schedule {

    fun key(sankalpId: String, iso: String): String = "$sankalpId::$iso"

    fun occursOn(sankalp: Sankalp, iso: String): Boolean {
        if (sankalp.status != Status.ACTIVE) return false
        if (iso < sankalp.startedOn) return false
        if (sankalp.endsOn != null && iso > sankalp.endsOn) return false

        return when (val f = sankalp.frequency) {
            is Frequency.Daily -> true
            is Frequency.Weekly -> f.days.contains(Dates.weekday(iso))
            is Frequency.Monthly -> {
                val date = Dates.parse(iso)
                val last = date.lengthOfMonth()
                date.dayOfMonth == f.day.coerceAtMost(last)
            }
            is Frequency.Yearly -> {
                val date = Dates.parse(iso)
                date.monthValue == f.month && date.dayOfMonth == f.day
            }
            is Frequency.Tithi -> Panchang.observanceOn(iso, f.tithi)
            is Frequency.Once -> iso == f.date
        }
    }

    fun scheduledOn(sankalps: List<Sankalp>, iso: String): List<Sankalp> =
        sankalps
            .filter { occursOn(it, iso) }
            .sortedWith(compareBy({ it.timeStart ?: "99:99" }, { it.name }))

    fun isDone(completions: Map<String, Completion>, sankalpId: String, iso: String): Boolean =
        completions[key(sankalpId, iso)]?.done == true

    fun nextOccurrence(sankalp: Sankalp, from: String = Dates.todayIso()): String? {
        for (i in 0..800L) {
            val iso = Dates.addDays(from, i)
            if (sankalp.endsOn != null && iso > sankalp.endsOn) return null
            if (occursOn(sankalp, iso)) return iso
        }
        return null
    }

    data class Progress(
        val totalDays: Int,
        val dayNumber: Int,
        val due: Int,
        val done: Int,
        val rate: Float,
        val streak: Int,
        val nextDue: String?,
    )

    fun progress(
        sankalp: Sankalp,
        completions: Map<String, Completion>,
        asOf: String = Dates.todayIso(),
    ): Progress {
        val totalDays = if (sankalp.endsOn != null) {
            (Dates.diffDays(sankalp.startedOn, sankalp.endsOn) + 1).coerceAtLeast(1)
        } else {
            (Dates.diffDays(sankalp.startedOn, asOf) + 1).coerceAtLeast(1)
        }

        var due = 0
        var done = 0
        var cursor = sankalp.startedOn
        val limit = when {
            sankalp.endsOn != null && asOf > sankalp.endsOn -> sankalp.endsOn
            else -> asOf
        }
        while (cursor <= limit) {
            if (occursOn(sankalp, cursor)) {
                due++
                if (isDone(completions, sankalp.id, cursor)) done++
            }
            cursor = Dates.addDays(cursor, 1)
        }

        var streak = 0
        var back = asOf
        for (i in 0..400) {
            if (occursOn(sankalp, back)) {
                if (isDone(completions, sankalp.id, back)) streak++
                else if (back != asOf) break
            }
            back = Dates.addDays(back, -1)
            if (back < sankalp.startedOn) break
        }

        return Progress(
            totalDays = totalDays,
            dayNumber = (Dates.diffDays(sankalp.startedOn, asOf) + 1).coerceIn(1, totalDays),
            due = due,
            done = done,
            rate = if (due == 0) 0f else done.toFloat() / due,
            streak = streak,
            nextDue = nextOccurrence(sankalp, asOf),
        )
    }
}

data class DayTally(val date: String, val due: Int, val done: Int) {
    val ratio: Float get() = if (due == 0) 0f else done.toFloat() / due
    val complete: Boolean get() = due > 0 && done == due
}

object Stats {

    fun tally(sankalps: List<Sankalp>, completions: Map<String, Completion>, iso: String): DayTally {
        val due = Schedule.scheduledOn(sankalps, iso)
        return DayTally(
            date = iso,
            due = due.size,
            done = due.count { Schedule.isDone(completions, it.id, iso) },
        )
    }

    /** Days in a row where every due practice was kept. A day with nothing due is skipped. */
    fun currentStreak(
        sankalps: List<Sankalp>,
        completions: Map<String, Completion>,
        end: String = Dates.todayIso(),
    ): Int {
        var streak = 0
        var iso = end
        for (i in 0..400) {
            val t = tally(sankalps, completions, iso)
            if (t.due > 0) {
                if (t.complete) streak++
                else if (iso != end) break
            }
            iso = Dates.addDays(iso, -1)
        }
        return streak
    }

    fun longestStreak(
        sankalps: List<Sankalp>,
        completions: Map<String, Completion>,
        from: String,
        to: String,
    ): Int {
        var best = 0
        var run = 0
        var iso = from
        while (iso <= to) {
            val t = tally(sankalps, completions, iso)
            if (t.due > 0) {
                if (t.complete) {
                    run++
                    best = maxOf(best, run)
                } else run = 0
            }
            iso = Dates.addDays(iso, 1)
        }
        return best
    }

    fun consistency(
        sankalps: List<Sankalp>,
        completions: Map<String, Completion>,
        from: String,
        to: String,
    ): Float {
        var due = 0
        var done = 0
        var iso = from
        while (iso <= to) {
            val t = tally(sankalps, completions, iso)
            due += t.due
            done += t.done
            iso = Dates.addDays(iso, 1)
        }
        return if (due == 0) 0f else done.toFloat() / due
    }
}
