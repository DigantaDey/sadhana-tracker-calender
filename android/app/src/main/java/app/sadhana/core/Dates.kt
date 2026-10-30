package app.sadhana.core

import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/** All dates in the app are local civil dates, exchanged as ISO `YYYY-MM-DD`. */
object Dates {

    val ISO: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val LONG = DateTimeFormatter.ofPattern("EEEE, d MMM yyyy", Locale.ENGLISH)
    private val SHORT = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)
    private val MONTH_YEAR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)

    fun today(): LocalDate = LocalDate.now()
    fun todayIso(): String = iso(today())
    fun iso(date: LocalDate): String = date.format(ISO)
    fun parse(iso: String): LocalDate = LocalDate.parse(iso, ISO)

    fun addDays(iso: String, days: Long): String = iso(parse(iso).plusDays(days))
    fun minusDays(iso: String, days: Long): String = addDays(iso, -days)

    fun diffDays(from: String, to: String): Int =
        ChronoUnit.DAYS.between(parse(from), parse(to)).toInt()

    /** 0 = Sunday … 6 = Saturday, to match the calendar grid in the UI. */
    fun weekday(iso: String): Int = parse(iso).dayOfWeek.value % 7

    fun startOfWeek(iso: String, mondayFirst: Boolean): String {
        val offset = if (mondayFirst) (weekday(iso) + 6) % 7 else weekday(iso)
        return addDays(iso, -offset.toLong())
    }

    fun daysInMonth(year: Int, month: Int): Int =
        LocalDate.of(year, month, 1).lengthOfMonth()

    fun formatLong(iso: String): String = parse(iso).format(LONG)
    fun formatShort(iso: String): String = parse(iso).format(SHORT)
    fun monthLabel(iso: String): String = parse(iso).format(MONTH_YEAR)

    /** "05:30" -> 330 */
    fun toMinutes(hhmm: String): Int {
        val parts = hhmm.split(":")
        return (parts.getOrNull(0)?.toIntOrNull() ?: 0) * 60 + (parts.getOrNull(1)?.toIntOrNull() ?: 0)
    }

    fun at(iso: String, hhmm: String): LocalTime = LocalTime.of(
        (hhmm.substringBefore(":").toIntOrNull() ?: 0) % 24,
        hhmm.substringAfter(":").take(2).toIntOrNull() ?: 0
    )

    fun prettyTime(hhmm: String): String {
        val m = toMinutes(hhmm)
        val h24 = m / 60
        val min = m % 60
        val suffix = if (h24 < 12) "am" else "pm"
        val h12 = when {
            h24 % 12 == 0 -> 12
            else -> h24 % 12
        }
        return if (min == 0) "$h12 $suffix" else "$h12:${min.toString().padStart(2, '0')} $suffix"
    }

    fun prettyWindow(start: String?, end: String?): String {
        if (start == null) return "Anytime"
        return if (end.isNullOrBlank()) prettyTime(start) else "${prettyTime(start)} – ${prettyTime(end)}"
    }

    fun greeting(): String = when (java.time.LocalTime.now().hour) {
        in 0..4 -> "Still awake"
        in 5..11 -> "Suprabhātam"
        in 12..16 -> "Namaste"
        in 17..20 -> "Śubh sandhyā"
        else -> "Śubh rātri"
    }

    fun lastNDays(n: Int, end: String = todayIso()): List<String> =
        (n - 1 downTo 0).map { addDays(end, -it.toLong()) }
}
