package app.sadhana.domain

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan

/**
 * Positional astronomy, on the device, with no dependency and no network.
 *
 * Sources
 *  • Sun     — Meeus, *Astronomical Algorithms* (2nd ed.), ch. 25 (≈10″ apparent)
 *  • Moon    — Meeus ch. 47: the full 60-term longitude series (table 47.A) and
 *              the 60-term latitude series (table 47.B), plus the additive
 *              corrections. Longitude to ≈10″, i.e. ~20 s of a tithi boundary.
 *  • ΔT      — Espenak & Meeus (2006) polynomials (TT − UT).
 *  • Rise/set — NOAA formulation with one refinement pass, h₀ = −0.833°.
 *
 * Every entry point takes an [Instant] (UTC) and converts to TT internally, so
 * callers never have to think about time scales.
 */
object Astronomy {

    private const val RAD = PI / 180.0
    private const val J2000 = 2451545.0
    private const val UNIX_EPOCH_JD = 2440587.5
    private const val MS_PER_DAY = 86_400_000.0

    fun sinDeg(d: Double): Double = sin(d * RAD)
    fun cosDeg(d: Double): Double = cos(d * RAD)
    fun tanDeg(d: Double): Double = tan(d * RAD)
    fun norm360(x: Double): Double = ((x % 360.0) + 360.0) % 360.0

    /** a − b wrapped into (−180, 180]. */
    fun diffAngle(a: Double, b: Double): Double {
        var d = norm360(a - b)
        if (d > 180.0) d -= 360.0
        return d
    }

    fun julianDay(instant: Instant): Double =
        instant.toEpochMilli() / MS_PER_DAY + UNIX_EPOCH_JD

    private fun centuries(jdTt: Double): Double = (jdTt - J2000) / 36525.0

    /** TT − UT in seconds (Espenak & Meeus 2006). */
    fun deltaTSeconds(instant: Instant): Double {
        val year = 1970.0 + instant.toEpochMilli() / MS_PER_DAY / 365.2425
        return when {
            year >= 2005 && year < 2050 -> {
                val t = year - 2000
                62.92 + 0.32217 * t + 0.005589 * t * t
            }
            year >= 1986 && year < 2005 -> {
                val t = year - 2000
                63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t +
                    0.000651814 * Math.pow(t, 4.0) + 0.00002373599 * Math.pow(t, 5.0)
            }
            year >= 2050 -> {
                val u = (year - 1820) / 100.0
                -20.0 + 32.0 * u * u - 0.5628 * (2150.0 - year)
            }
            year >= 1961 -> {
                val t = year - 1975
                45.45 + 1.067 * t - t * t / 260.0 - t * t * t / 718.0
            }
            else -> {
                val t = year - 1950
                29.07 + 0.407 * t - t * t / 233.0 + t * t * t / 2547.0
            }
        }
    }

    /** Julian Day in TT for a UTC instant. */
    fun jdTt(instant: Instant): Double =
        julianDay(instant) + deltaTSeconds(instant) / 86400.0

    // ── Nutation & obliquity ────────────────────────────────────────────────

    /** Nutation in longitude, degrees (Meeus ch. 22, four-term form). */
    fun nutationInLongitude(jdTt: Double): Double {
        val t = centuries(jdTt)
        val omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000.0
        val l = 280.4665 + 36000.7698 * t
        val lp = 218.3165 + 481267.8813 * t
        val arcsec = -17.2 * sinDeg(omega) - 1.32 * sinDeg(2 * l) -
            0.23 * sinDeg(2 * lp) + 0.21 * sinDeg(2 * omega)
        return arcsec / 3600.0
    }

    /** Mean obliquity of the ecliptic, degrees. */
    fun meanObliquity(jdTt: Double): Double {
        val u = centuries(jdTt) / 100.0
        val arcsec = 4680.93 * u + 1.55 * Math.pow(u, 2.0) - 1999.25 * Math.pow(u, 3.0) -
            51.38 * Math.pow(u, 4.0) + 249.67 * Math.pow(u, 5.0) -
            39.05 * Math.pow(u, 6.0) - 7.12 * Math.pow(u, 7.0) +
            27.87 * Math.pow(u, 8.0) + 5.79 * Math.pow(u, 9.0) + 2.45 * Math.pow(u, 10.0)
        return 23.0 + 26.0 / 60.0 + 21.448 / 3600.0 - arcsec / 3600.0
    }

    // ── Sun ─────────────────────────────────────────────────────────────────

    data class SolarPosition(
        val longitude: Double,
        val apparentLongitude: Double,
        val rightAscension: Double,
        val declination: Double,
        val equationOfTime: Double,
    )

    fun solarPosition(jdTt: Double): SolarPosition {
        val t = centuries(jdTt)
        val l0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t)
        val m = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t)
        val e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t

        val c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sinDeg(m) +
            (0.019993 - 0.000101 * t) * sinDeg(2 * m) +
            0.000289 * sinDeg(3 * m)

        val trueLongitude = norm360(l0 + c)
        val v = m + c
        val omega = 125.04 - 1934.136 * t
        val apparent = norm360(trueLongitude - 0.00569 - 0.00478 * sinDeg(omega))

        val eps = meanObliquity(jdTt) + 0.00256 * cosDeg(omega)
        val ra = norm360(atan2(cosDeg(eps) * sinDeg(apparent), cosDeg(apparent)) / RAD)
        val dec = asin(sinDeg(eps) * sinDeg(apparent)) / RAD

        val y = tanDeg(eps / 2).let { it * it }
        val eqTime = 4.0 / RAD * (
            y * sinDeg(2 * l0) -
                2 * e * sinDeg(m) +
                4 * e * y * sinDeg(m) * cosDeg(2 * l0) -
                0.5 * y * y * sinDeg(4 * l0) -
                1.25 * e * e * sinDeg(2 * m)
            )

        return SolarPosition(trueLongitude, apparent, ra, dec, eqTime)
    }

    // ── Moon ────────────────────────────────────────────────────────────────

    // [D, M, M', F, Σl (1e-6 deg), Σr (1e-3 km)] — Meeus table 47.A
    private val MOON_L_R = arrayOf(
        doubleArrayOf(0.0, 0.0, 1.0, 0.0, 6288774.0, -20905355.0),
        doubleArrayOf(2.0, 0.0, -1.0, 0.0, 1274027.0, -3699111.0),
        doubleArrayOf(2.0, 0.0, 0.0, 0.0, 658314.0, -2955968.0),
        doubleArrayOf(0.0, 0.0, 2.0, 0.0, 213618.0, -569925.0),
        doubleArrayOf(0.0, 1.0, 0.0, 0.0, -185116.0, 48888.0),
        doubleArrayOf(0.0, 0.0, 0.0, 2.0, -114332.0, -3149.0),
        doubleArrayOf(2.0, 0.0, -2.0, 0.0, 58793.0, 246158.0),
        doubleArrayOf(2.0, -1.0, -1.0, 0.0, 57066.0, -152138.0),
        doubleArrayOf(2.0, 0.0, 1.0, 0.0, 53322.0, -170733.0),
        doubleArrayOf(2.0, -1.0, 0.0, 0.0, 45758.0, -204586.0),
        doubleArrayOf(0.0, 1.0, -1.0, 0.0, -40923.0, -129620.0),
        doubleArrayOf(1.0, 0.0, 0.0, 0.0, -34720.0, 108743.0),
        doubleArrayOf(0.0, 1.0, 1.0, 0.0, -30383.0, 104755.0),
        doubleArrayOf(2.0, 0.0, 0.0, -2.0, 15327.0, 10321.0),
        doubleArrayOf(0.0, 0.0, 1.0, 2.0, -12528.0, 0.0),
        doubleArrayOf(0.0, 0.0, 1.0, -2.0, 10980.0, 79661.0),
        doubleArrayOf(4.0, 0.0, -1.0, 0.0, 10675.0, -34782.0),
        doubleArrayOf(0.0, 0.0, 3.0, 0.0, 10034.0, -23210.0),
        doubleArrayOf(4.0, 0.0, -2.0, 0.0, 8548.0, -21636.0),
        doubleArrayOf(2.0, 1.0, -1.0, 0.0, -7888.0, 24208.0),
        doubleArrayOf(2.0, 1.0, 0.0, 0.0, -6766.0, 30824.0),
        doubleArrayOf(1.0, 0.0, -1.0, 0.0, -5163.0, -8379.0),
        doubleArrayOf(1.0, 1.0, 0.0, 0.0, 4987.0, -16675.0),
        doubleArrayOf(2.0, -1.0, 1.0, 0.0, 4036.0, -12831.0),
        doubleArrayOf(2.0, 0.0, 2.0, 0.0, 3994.0, -10445.0),
        doubleArrayOf(4.0, 0.0, 0.0, 0.0, 3861.0, -11650.0),
        doubleArrayOf(2.0, 0.0, -3.0, 0.0, 3665.0, 14403.0),
        doubleArrayOf(0.0, 1.0, -2.0, 0.0, -2689.0, -7003.0),
        doubleArrayOf(2.0, 0.0, -1.0, 2.0, -2602.0, 0.0),
        doubleArrayOf(2.0, -1.0, -2.0, 0.0, 2390.0, 10056.0),
        doubleArrayOf(1.0, 0.0, 1.0, 0.0, -2348.0, 6322.0),
        doubleArrayOf(2.0, -2.0, 0.0, 0.0, 2236.0, -9884.0),
        doubleArrayOf(0.0, 1.0, 2.0, 0.0, -2120.0, 5751.0),
        doubleArrayOf(0.0, 2.0, 0.0, 0.0, -2069.0, 0.0),
        doubleArrayOf(2.0, -2.0, -1.0, 0.0, 2048.0, -4950.0),
        doubleArrayOf(2.0, 0.0, 1.0, -2.0, -1773.0, 4130.0),
        doubleArrayOf(2.0, 0.0, 0.0, 2.0, -1595.0, 0.0),
        doubleArrayOf(4.0, -1.0, -1.0, 0.0, 1215.0, -3958.0),
        doubleArrayOf(0.0, 0.0, 2.0, 2.0, -1110.0, 0.0),
        doubleArrayOf(3.0, 0.0, -1.0, 0.0, -892.0, 3258.0),
        doubleArrayOf(2.0, 1.0, 1.0, 0.0, -810.0, 2616.0),
        doubleArrayOf(4.0, -1.0, -2.0, 0.0, 759.0, -1897.0),
        doubleArrayOf(0.0, 2.0, -1.0, 0.0, -713.0, -2117.0),
        doubleArrayOf(2.0, 2.0, -1.0, 0.0, -700.0, 2354.0),
        doubleArrayOf(2.0, 1.0, -2.0, 0.0, 691.0, 0.0),
        doubleArrayOf(2.0, -1.0, 0.0, -2.0, 596.0, 0.0),
        doubleArrayOf(4.0, 0.0, 1.0, 0.0, 549.0, -1423.0),
        doubleArrayOf(0.0, 0.0, 4.0, 0.0, 537.0, -1117.0),
        doubleArrayOf(4.0, -1.0, 0.0, 0.0, 520.0, -1571.0),
        doubleArrayOf(1.0, 0.0, -2.0, 0.0, -487.0, -1739.0),
        doubleArrayOf(2.0, 1.0, 0.0, -2.0, -399.0, 0.0),
        doubleArrayOf(0.0, 0.0, 2.0, -2.0, -381.0, -4421.0),
        doubleArrayOf(1.0, 1.0, 1.0, 0.0, 351.0, 0.0),
        doubleArrayOf(3.0, 0.0, -2.0, 0.0, -340.0, 0.0),
        doubleArrayOf(4.0, 0.0, -3.0, 0.0, 330.0, 0.0),
        doubleArrayOf(2.0, -1.0, 2.0, 0.0, 327.0, 0.0),
        doubleArrayOf(0.0, 2.0, 1.0, 0.0, -323.0, 1165.0),
        doubleArrayOf(1.0, 1.0, -1.0, 0.0, 299.0, 0.0),
        doubleArrayOf(2.0, 0.0, 3.0, 0.0, 294.0, 0.0),
        doubleArrayOf(2.0, 0.0, -1.0, -2.0, 0.0, 8752.0),
    )

    // [D, M, M', F, Σb (1e-6 deg)] — Meeus table 47.B (60 terms)
    private val MOON_B = arrayOf(
        doubleArrayOf(0.0, 0.0, 0.0, 1.0, 5128122.0),
        doubleArrayOf(0.0, 0.0, 1.0, 1.0, 280602.0),
        doubleArrayOf(0.0, 0.0, 1.0, -1.0, 277693.0),
        doubleArrayOf(2.0, 0.0, 0.0, -1.0, 173237.0),
        doubleArrayOf(2.0, 0.0, -1.0, 1.0, 55413.0),
        doubleArrayOf(2.0, 0.0, -1.0, -1.0, 46271.0),
        doubleArrayOf(2.0, 0.0, 0.0, 1.0, 32573.0),
        doubleArrayOf(0.0, 0.0, 2.0, 1.0, 17198.0),
        doubleArrayOf(2.0, 0.0, 1.0, -1.0, 9266.0),
        doubleArrayOf(0.0, 0.0, 2.0, -1.0, 8822.0),
        doubleArrayOf(2.0, -1.0, 0.0, -1.0, 8216.0),
        doubleArrayOf(2.0, 0.0, -2.0, -1.0, 4324.0),
        doubleArrayOf(2.0, 0.0, 1.0, 1.0, 4200.0),
        doubleArrayOf(2.0, 1.0, 0.0, -1.0, -3359.0),
        doubleArrayOf(2.0, -1.0, -1.0, 1.0, 2463.0),
        doubleArrayOf(2.0, -1.0, 0.0, 1.0, 2211.0),
        doubleArrayOf(2.0, -1.0, -1.0, -1.0, 2065.0),
        doubleArrayOf(0.0, 1.0, -1.0, -1.0, -1870.0),
        doubleArrayOf(4.0, 0.0, -1.0, -1.0, 1828.0),
        doubleArrayOf(0.0, 1.0, 0.0, 1.0, -1794.0),
        doubleArrayOf(0.0, 0.0, 0.0, 3.0, -1749.0),
        doubleArrayOf(0.0, 1.0, -1.0, 1.0, -1565.0),
        doubleArrayOf(1.0, 0.0, 0.0, 1.0, -1491.0),
        doubleArrayOf(0.0, 1.0, 1.0, 1.0, -1475.0),
        doubleArrayOf(0.0, 1.0, 1.0, -1.0, -1410.0),
        doubleArrayOf(0.0, 1.0, 0.0, -1.0, -1344.0),
        doubleArrayOf(1.0, 0.0, 0.0, -1.0, -1335.0),
        doubleArrayOf(0.0, 0.0, 3.0, 1.0, 1107.0),
        doubleArrayOf(4.0, 0.0, 0.0, -1.0, 1021.0),
        doubleArrayOf(4.0, 0.0, -1.0, 1.0, 833.0),
        doubleArrayOf(0.0, 0.0, 1.0, -3.0, 777.0),
        doubleArrayOf(4.0, 0.0, -2.0, 1.0, 671.0),
        doubleArrayOf(2.0, 0.0, 0.0, -3.0, 607.0),
        doubleArrayOf(2.0, 0.0, 2.0, -1.0, 596.0),
        doubleArrayOf(2.0, -1.0, 1.0, -1.0, 491.0),
        doubleArrayOf(2.0, 0.0, -2.0, 1.0, -451.0),
        doubleArrayOf(0.0, 0.0, 3.0, -1.0, 439.0),
        doubleArrayOf(2.0, 0.0, 2.0, 1.0, 422.0),
        doubleArrayOf(2.0, 0.0, -3.0, -1.0, 421.0),
        doubleArrayOf(2.0, 1.0, -1.0, 1.0, -366.0),
        doubleArrayOf(2.0, 1.0, 0.0, 1.0, -351.0),
        doubleArrayOf(4.0, 0.0, 0.0, 1.0, 331.0),
        doubleArrayOf(2.0, -1.0, 1.0, 1.0, 315.0),
        doubleArrayOf(2.0, -2.0, 0.0, -1.0, 302.0),
        doubleArrayOf(0.0, 0.0, 1.0, 3.0, -283.0),
        doubleArrayOf(2.0, 1.0, 1.0, -1.0, -229.0),
        doubleArrayOf(1.0, 1.0, 0.0, -1.0, 223.0),
        doubleArrayOf(1.0, 1.0, 0.0, 1.0, 223.0),
        doubleArrayOf(0.0, 1.0, -2.0, -1.0, -220.0),
        doubleArrayOf(2.0, 1.0, -1.0, -1.0, -220.0),
        doubleArrayOf(1.0, 0.0, 1.0, 1.0, -185.0),
        doubleArrayOf(2.0, -1.0, -2.0, -1.0, 181.0),
        doubleArrayOf(0.0, 1.0, 2.0, 1.0, -177.0),
        doubleArrayOf(4.0, 0.0, -2.0, -1.0, 176.0),
        doubleArrayOf(4.0, -1.0, -1.0, -1.0, 166.0),
        doubleArrayOf(1.0, 0.0, 1.0, -1.0, -164.0),
        doubleArrayOf(4.0, 0.0, 1.0, -1.0, 132.0),
        doubleArrayOf(1.0, 0.0, -1.0, -1.0, -119.0),
        doubleArrayOf(4.0, -1.0, 0.0, -1.0, 115.0),
        doubleArrayOf(2.0, -2.0, 0.0, 1.0, 107.0),
    )

    data class LunarPosition(
        val longitude: Double,
        val latitude: Double,
        val distanceKm: Double,
    )

    fun lunarPosition(jdTt: Double): LunarPosition {
        val t = centuries(jdTt)
        val lp = norm360(
            218.3164477 + 481267.88123421 * t - 0.0015786 * t * t +
                t * t * t / 538841.0 - Math.pow(t, 4.0) / 65194000.0
        )
        val d = norm360(
            297.8501921 + 445267.1114034 * t - 0.0018819 * t * t +
                t * t * t / 545868.0 - Math.pow(t, 4.0) / 113065000.0
        )
        val m = norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + t * t * t / 24490000.0)
        val mp = norm360(
            134.9633964 + 477198.8675055 * t + 0.0087414 * t * t +
                t * t * t / 69699.0 - Math.pow(t, 4.0) / 14712000.0
        )
        val f = norm360(
            93.272095 + 483202.0175233 * t - 0.0036539 * t * t -
                t * t * t / 3526000.0 + Math.pow(t, 4.0) / 863310000.0
        )
        val a1 = 119.75 + 131.849 * t
        val a2 = 53.09 + 479264.29 * t
        val a3 = 313.45 + 481266.484 * t
        val e = 1.0 - 0.002516 * t - 0.0000074 * t * t

        var sumL = 0.0
        var sumR = 0.0
        for (row in MOON_L_R) {
            val eFactor = Math.pow(e, abs(row[1]))
            val arg = row[0] * d + row[1] * m + row[2] * mp + row[3] * f
            sumL += row[4] * eFactor * sinDeg(arg)
            sumR += row[5] * eFactor * cosDeg(arg)
        }
        sumL += 3958 * sinDeg(a1) + 1962 * sinDeg(lp - f) + 318 * sinDeg(a2)

        var sumB = 0.0
        for (row in MOON_B) {
            val eFactor = Math.pow(e, abs(row[1]))
            val arg = row[0] * d + row[1] * m + row[2] * mp + row[3] * f
            sumB += row[4] * eFactor * sinDeg(arg)
        }
        sumB += -2235 * sinDeg(lp) + 382 * sinDeg(a3) +
            175 * sinDeg(a1 - f) + 175 * sinDeg(a1 + f) +
            127 * sinDeg(lp - mp) - 115 * sinDeg(lp + mp)

        return LunarPosition(
            longitude = norm360(lp + sumL / 1_000_000.0),
            latitude = sumB / 1_000_000.0,
            distanceKm = 385000.56 + sumR / 1000.0,
        )
    }

    // ── Elongation ──────────────────────────────────────────────────────────

    /** Moon's apparent elongation from the Sun, degrees (0 = new moon). */
    fun elongation(instant: Instant): Double {
        val jd = jdTt(instant)
        val moon = lunarPosition(jd)
        val sun = solarPosition(jd)
        return norm360(moon.longitude - (sun.longitude - 0.00569))
    }

    fun illumination(instant: Instant): Double = (1 - cosDeg(elongation(instant))) / 2

    private fun elongationRate(instant: Instant): Double {
        val h = 3_600_000L
        val before = elongation(Instant.ofEpochMilli(instant.toEpochMilli() - h))
        val after = elongation(Instant.ofEpochMilli(instant.toEpochMilli() + h))
        return diffAngle(after, before) / (2.0 * h / MS_PER_DAY)
    }

    /**
     * Instant at which the elongation crosses [targetDegrees], nearest to
     * [near]. Secant iteration on a smooth, monotone function: three or four
     * passes reach sub-second precision.
     */
    fun findElongationCrossing(targetDegrees: Double, near: Instant): Instant {
        var guess = near.toEpochMilli().toDouble()
        var delta = diffAngle(elongation(Instant.ofEpochMilli(guess.toLong())), targetDegrees)
        guess -= delta / 12.19 * MS_PER_DAY

        for (i in 0 until 8) {
            val instant = Instant.ofEpochMilli(guess.toLong())
            delta = diffAngle(elongation(instant), targetDegrees)
            if (abs(delta) < 1e-6) break
            val rate = elongationRate(instant).takeIf { abs(it) > 0.1 } ?: 12.19
            val step = (delta / rate * MS_PER_DAY).coerceIn(-3 * MS_PER_DAY, 3 * MS_PER_DAY)
            guess -= step
            if (abs(step) < 200) break
        }
        return Instant.ofEpochMilli(guess.toLong())
    }

    // ── Sidereal ────────────────────────────────────────────────────────────

    /** Lahiri (Chitrapakṣa) ayanāṁśa, degrees. */
    fun lahiriAyanamsa(jdTt: Double): Double {
        val t = centuries(jdTt)
        val base = 23.0 + 51.0 / 60.0 + 25.4 / 3600.0
        return base + 50.2788 * t / 3600.0 + 0.0002 * t * t
    }

    fun siderealMoonLongitude(jdTt: Double): Double =
        norm360(lunarPosition(jdTt).longitude - lahiriAyanamsa(jdTt))

    fun siderealSunLongitude(jdTt: Double): Double =
        norm360(solarPosition(jdTt).longitude - lahiriAyanamsa(jdTt))

    // ── Rise & set ──────────────────────────────────────────────────────────

    private const val SUNRISE_ZENITH = 90.833

    /**
     * Sunrise or sunset for a civil date at a place.
     * @param date the civil date, anchored at 00:00 UTC
     * @return the instant, or null through a polar day/night
     */
    fun riseSet(date: LocalDate, latitude: Double, longitude: Double, rising: Boolean): Instant? {
        val lat = latitude.coerceIn(-89.8, 89.8)
        val anchor = date.atStartOfDay(ZoneOffset.UTC).toInstant()

        fun solve(from: Instant): Pair<Double, Double>? {
            val sun = solarPosition(jdTt(from))
            val cosH = (cosDeg(SUNRISE_ZENITH) - sinDeg(lat) * sinDeg(sun.declination)) /
                (cosDeg(lat) * cosDeg(sun.declination))
            if (cosH > 1.0 || cosH < -1.0) return null
            val hourAngle = acos(cosH) / RAD
            val minutes = if (rising) {
                720.0 - 4.0 * (hourAngle + longitude) - sun.equationOfTime
            } else {
                720.0 + 4.0 * (hourAngle - longitude) - sun.equationOfTime
            }
            return minutes to hourAngle
        }

        val first = solve(anchor.plusSeconds(12 * 3600)) ?: return null
        val firstInstant = anchor.plusMillis((first.first * 60_000).toLong())
        val second = solve(firstInstant)
        val minutes = second?.first ?: first.first
        return anchor.plusMillis((minutes * 60_000).toLong())
    }

    /** Solar noon (meridian transit) for a civil date at a longitude. */
    fun solarNoon(date: LocalDate, longitude: Double): Instant {
        val anchor = date.atStartOfDay(ZoneOffset.UTC).toInstant()
        val sun = solarPosition(jdTt(anchor.plusSeconds(12 * 3600)))
        return anchor.plusMillis(((720.0 - 4.0 * longitude - sun.equationOfTime) * 60_000).toLong())
    }
}
