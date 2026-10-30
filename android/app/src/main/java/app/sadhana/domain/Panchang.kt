package app.sadhana.domain

import app.sadhana.core.Dates
import java.time.LocalDate
import kotlin.math.cos
import kotlin.math.floor

/**
 * Approximate pañcāṅga.
 *
 * The tithi is the lunar day — the Moon gaining 12° of elongation on the Sun.
 * We use the leading periodic terms of the low-precision lunar theory, which is
 * accurate to roughly ±20 minutes of a real tithi boundary. That is enough to
 * *show* the lunar day and to open a reminder window, but a production build
 * must swap in a proper ephemeris (Swiss Ephemeris, or a pañcāṅga service) plus
 * location-aware sunrise for vrata rules. [PanchangProvider] exists so that
 * swap touches exactly one object.
 */
interface PanchangProvider {
    fun tithiIndex(date: LocalDate): Int
    fun tithiName(date: LocalDate): String
}

object ApproximatePanchang : PanchangProvider {

    private const val RAD = Math.PI / 180.0
    private fun sinDeg(d: Double) = kotlin.math.sin(d * RAD)
    private fun norm360(x: Double): Double = ((x % 360) + 360) % 360

    private fun julianDay(date: LocalDate): Double {
        // JD at 12:00 UTC of the civil date, which is the convention for
        // deciding which tithi "owns" a calendar day in most pañcāṅgas.
        val epochDay = date.toEpochDay()
        return epochDay + 2440587.5 + 0.5
    }

    private fun sunLongitude(jd: Double): Double {
        val t = (jd - 2451545.0) / 36525.0
        val l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
        val m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
        val c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sinDeg(m) +
            (0.019993 - 0.000101 * t) * sinDeg(2 * m) +
            0.000289 * sinDeg(3 * m)
        return norm360(l0 + c)
    }

    private fun moonLongitude(jd: Double): Double {
        val t = (jd - 2451545.0) / 36525.0
        val l = 218.3164477 + 481267.88123421 * t
        val d = 297.8501921 + 445267.1114034 * t
        val m = 357.5291092 + 35999.0502909 * t
        val mp = 134.9633964 + 477198.8675055 * t
        val f = 93.272095 + 483202.0175233 * t
        return norm360(
            l +
                6.288774 * sinDeg(mp) +
                1.274027 * sinDeg(2 * d - mp) +
                0.658314 * sinDeg(2 * d) +
                0.213618 * sinDeg(2 * mp) -
                0.185116 * sinDeg(m) -
                0.114332 * sinDeg(2 * f) +
                0.058793 * sinDeg(2 * d - 2 * mp) +
                0.057066 * sinDeg(2 * d - m - mp) +
                0.053322 * sinDeg(2 * d + mp) +
                0.045758 * sinDeg(2 * d - m)
        )
    }

    fun elongation(date: LocalDate): Double {
        val jd = julianDay(date)
        return norm360(moonLongitude(jd) - sunLongitude(jd))
    }

    override fun tithiIndex(date: LocalDate): Int =
        floor(elongation(date) / 12.0).toInt().coerceIn(0, 29) + 1

    override fun tithiName(date: LocalDate): String {
        val i = tithiIndex(date)
        val paksha = if (i <= 15) "Śukla" else "Kṛṣṇa"
        return "$paksha ${TithiNames.names[i - 1]}"
    }

    fun illumination(date: LocalDate): Float =
        ((1 - cos(elongation(date) * RAD)) / 2).toFloat()

    fun occursOn(iso: String, tithi: Int): Boolean =
        tithiIndex(Dates.parse(iso)) == tithi
}

fun Frequency.describe(): String = when (this) {
    is Frequency.Daily -> "Every day"
    is Frequency.Weekly -> {
        val names = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
        when {
            days.size >= 7 -> "Every day"
            days.size == 6 && days.containsAll(listOf(1, 2, 3, 4, 5, 6)) -> "Mon to Sat"
            else -> "Every " + days.sorted().joinToString(", ") { names[it] }
        }
    }
    is Frequency.Monthly -> "Monthly on day $day"
    is Frequency.Yearly -> "Once a year"
    is Frequency.Tithi -> "Every ${TithiNames.names[tithi - 1]} tithi"
    is Frequency.Once -> "One-time anuṣṭhāna"
}
