package app.sadhana.domain

import app.sadhana.core.Dates
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Where the pañcāṅga is cast. A tithi runs from sunrise to sunrise, so the
 * app cannot do this without a place.
 */
data class Place(
    val id: String,
    val label: String,
    val latitude: Double,
    val longitude: Double,
    val zone: ZoneId,
) {
    companion object {
        val DELHI = Place("delhi", "Delhi", 28.6139, 77.209, ZoneId.of("Asia/Kolkata"))
    }
}

val PLACES: List<Place> = listOf(
    Place("delhi", "Delhi", 28.6139, 77.209, ZoneId.of("Asia/Kolkata")),
    Place("mumbai", "Mumbai", 19.076, 72.8777, ZoneId.of("Asia/Kolkata")),
    Place("kolkata", "Kolkata", 22.5726, 88.3639, ZoneId.of("Asia/Kolkata")),
    Place("chennai", "Chennai", 13.0827, 80.2707, ZoneId.of("Asia/Kolkata")),
    Place("bengalaru", "Bengaluru", 12.9716, 77.5946, ZoneId.of("Asia/Kolkata")),
    Place("hyderabad", "Hyderabad", 17.385, 78.4867, ZoneId.of("Asia/Kolkata")),
    Place("ahmedabad", "Ahmedabad", 23.0225, 72.5714, ZoneId.of("Asia/Kolkata")),
    Place("pune", "Pune", 18.5204, 73.8567, ZoneId.of("Asia/Kolkata")),
    Place("jaipur", "Jaipur", 26.9124, 75.7873, ZoneId.of("Asia/Kolkata")),
    Place("lucknow", "Lucknow", 26.8467, 80.9462, ZoneId.of("Asia/Kolkata")),
    Place("patna", "Patna", 25.5941, 85.1376, ZoneId.of("Asia/Kolkata")),
    Place("varanasi", "Varanasi", 25.3176, 82.9739, ZoneId.of("Asia/Kolkata")),
    Place("haridwar", "Haridwar", 29.9457, 78.1642, ZoneId.of("Asia/Kolkata")),
    Place("guwahati", "Guwahati", 26.1445, 91.7362, ZoneId.of("Asia/Kolkata")),
    Place("kochi", "Kochi", 9.9312, 76.2673, ZoneId.of("Asia/Kolkata")),
    Place("kathmandu", "Kathmandu", 27.7172, 85.324, ZoneId.of("Asia/Kathmandu")),
    Place("colombo", "Colombo", 6.9271, 79.8612, ZoneId.of("Asia/Colombo")),
    Place("dhaka", "Dhaka", 23.8103, 90.4125, ZoneId.of("Asia/Dhaka")),
    Place("dubai", "Dubai", 25.2048, 55.2708, ZoneId.of("Asia/Dubai")),
    Place("singapore", "Singapore", 1.3521, 103.8198, ZoneId.of("Asia/Singapore")),
    Place("london", "London", 51.5074, -0.1278, ZoneId.of("Europe/London")),
    Place("berlin", "Berlin", 52.52, 13.405, ZoneId.of("Europe/Berlin")),
    Place("newyork", "New York", 40.7128, -74.006, ZoneId.of("America/New_York")),
    Place("toronto", "Toronto", 43.6532, -79.3832, ZoneId.of("America/Toronto")),
    Place("losangeles", "Los Angeles", 34.0522, -118.2437, ZoneId.of("America/Los_Angeles")),
    Place("sydney", "Sydney", -33.8688, 151.2093, ZoneId.of("Australia/Sydney")),
    Place("tokyo", "Tokyo", 35.6762, 139.6503, ZoneId.of("Asia/Tokyo")),
    Place("johannesburg", "Johannesburg", -26.2041, 28.0473, ZoneId.of("Africa/Johannesburg")),
)

fun placeById(id: String?): Place =
    PLACES.firstOrNull { it.id == id } ?: Place(
        id = "auto",
        label = "Your time zone",
        latitude = 20.0,
        longitude = 0.0,
        zone = ZoneId.systemDefault(),
    )

/**
 * The day's pañcāṅga, computed locally.
 *
 * Tithi is the Moon gaining 12° of elongation on the Sun. The traditional rule
 * — used by every printed pañcāṅga — is that the day takes the tithi prevailing
 * at **local sunrise**. [tithiEnd] is the exact instant that tithi gives way to
 * the next one, so the UI can say "until 19:25" and be right.
 */
data class PanchangDay(
    val iso: String,
    val place: Place,
    val tithi: Int,
    val tithiStart: Instant,
    val tithiEnd: Instant,
    val nextTithi: Int,
    val sunrise: Instant?,
    val sunset: Instant?,
    val solarNoon: Instant,
    val dayLengthMinutes: Int?,
    val illumination: Double,
    val nakshatra: Int,
    val yoga: Int,
    val karana: String,
    val vriddhi: Boolean,
    val kshaya: Boolean,
    val observance: String?,
) {
    val paksha: String get() = if (tithi <= 15) "Śukla" else "Kṛṣṇa"
    val tithiName: String get() = "$paksha ${TithiNames.names[tithi - 1]}"
    val nakshatraName: String get() = NakshatraNames.names[nakshatra - 1]
    val yogaName: String get() = YogaNames.names[yoga - 1]

    fun clock(instant: Instant?): String =
        instant?.atZone(place.zone)?.format(HHMM) ?: "—"

    val sunriseLabel: String get() = clock(sunrise)
    val sunsetLabel: String get() = clock(sunset)
    val tithiStartLabel: String get() = clock(tithiStart)
    val tithiEndLabel: String get() = clock(tithiEnd)
    val illuminationPercent: Int get() = (illumination * 100).toInt()

    private companion object {
        val HHMM: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH)
    }
}

object NakshatraNames {
    val names = listOf(
        "Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśirā", "Ārdrā",
        "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrva Phalguṇī", "Uttara Phalguṇī",
        "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā",
        "Mūla", "Pūrvāṣāḍhā", "Uttarāṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
        "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī",
    )
}

object YogaNames {
    val names = listOf(
        "Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa",
        "Sukarman", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva",
        "Vyāghāta", "Harṣaṇa", "Vajra", "Siddhi", "Vyatipāta", "Varīyān",
        "Parigha", "Śiva", "Siddha", "Sādhya", "Śubha", "Śukla",
        "Brahma", "Indra", "Vaidhṛti",
    )
}

private val KARANA_MOVABLE =
    listOf("Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi")

fun karanaName(index: Int): String = when {
    index == 1 -> "Kiṁstughna"
    index >= 58 -> listOf("Śakuni", "Catuṣpāda", "Nāga").getOrElse(index - 58) { "Nāga" }
    else -> KARANA_MOVABLE[(index - 2) % 7]
}

/**
 * The pañcāṅga engine. Results are memoised per (date, place): a year view is
 * 365 look-ups, and a look-up is a handful of 60-term series evaluations.
 */
object Panchang {

    @Volatile
    var place: Place = Place(
        id = "auto",
        label = "Your time zone",
        latitude = 20.0,
        longitude = 0.0,
        zone = ZoneId.systemDefault(),
    )
        set(value) {
            if (value.latitude == field.latitude &&
                value.longitude == field.longitude &&
                value.zone == field.zone
            ) {
                field = value
                return
            }
            field = value
            dayCache.clear()
            sunriseCache.clear()
            sunriseTithiCache.clear()
        }

    private val dayCache = object : LinkedHashMap<String, PanchangDay>(128, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, PanchangDay>?): Boolean =
            size > 512
    }

    private val sunriseCache = HashMap<String, Instant?>()
    private val sunriseTithiCache = HashMap<String, Int>()

    fun tithiAt(instant: Instant): Int =
        (Astronomy.elongation(instant) / 12.0).toInt().coerceIn(0, 29) + 1

    fun tithiAtSunrise(iso: String): Int =
        sunriseTithiCache.getOrPut("$iso|${place.id}") {
            val sunrise = sunriseOn(iso) ?: solarNoonOn(iso)
            tithiAt(sunrise)
        }

    fun sunriseOn(iso: String): Instant? =
        sunriseCache.getOrPut("$iso|${place.id}") {
            Astronomy.riseSet(Dates.parse(iso), place.latitude, place.longitude, rising = true)
        }

    fun sunsetOn(iso: String): Instant? =
        Astronomy.riseSet(Dates.parse(iso), place.latitude, place.longitude, rising = false)

    private fun solarNoonOn(iso: String): Instant =
        Astronomy.solarNoon(Dates.parse(iso), place.longitude)

    fun forDate(iso: String): PanchangDay {
        val key = "$iso|${place.id}"
        synchronized(dayCache) { dayCache[key] }?.let { return it }

        val date = Dates.parse(iso)
        val sunrise = Astronomy.riseSet(date, place.latitude, place.longitude, rising = true)
        val sunset = Astronomy.riseSet(date, place.latitude, place.longitude, rising = false)
        val noon = Astronomy.solarNoon(date, place.longitude)
        val reference = sunrise ?: noon

        val tithi = tithiAt(reference)
        val start = Astronomy.findElongationCrossing((((tithi - 1) * 12) % 360).toDouble(), reference)
        val end = Astronomy.findElongationCrossing(((tithi * 12) % 360).toDouble(), reference)

        val jd = Astronomy.jdTt(reference)
        val siderealMoon = Astronomy.siderealMoonLongitude(jd)
        val siderealSum = Astronomy.norm360(
            siderealMoon + Astronomy.siderealSunLongitude(jd)
        )
        val nakshatra = (siderealMoon / (360.0 / 27.0)).toInt().coerceIn(0, 26) + 1
        val yoga = (siderealSum / (360.0 / 27.0)).toInt().coerceIn(0, 26) + 1
        val karana = karanaName(
            (Astronomy.elongation(reference) / 6.0).toInt().coerceIn(0, 59) + 1
        )

        val previous = tithiAtSunrise(Dates.addDays(iso, -1))
        val next = tithiAtSunrise(Dates.addDays(iso, 1))

        val day = PanchangDay(
            iso = iso,
            place = place,
            tithi = tithi,
            tithiStart = start,
            tithiEnd = end,
            nextTithi = if (tithi == 30) 1 else tithi + 1,
            sunrise = sunrise,
            sunset = sunset,
            solarNoon = noon,
            dayLengthMinutes = if (sunrise != null && sunset != null) {
                ((sunset.toEpochMilli() - sunrise.toEpochMilli()) / 60_000L).toInt()
            } else null,
            illumination = Astronomy.illumination(reference),
            nakshatra = nakshatra,
            yoga = yoga,
            karana = karana,
            vriddhi = previous == tithi,
            kshaya = next == ((tithi + 1) % 30) + 1,
            observance = observanceFor(tithi),
        )

        synchronized(dayCache) { dayCache[key] = day }
        return day
    }

    /**
     * Vrata rule for a tithi-recurring vow.
     *
     *  • normal  — the tithi prevails at sunrise: keep it that day;
     *  • vṛddhi  — the same tithi sees two sunrises: keep the **second**;
     *  • kṣaya   — the tithi sees no sunrise at all: keep it on the day it
     *              begins, i.e. the day whose next sunrise skips it.
     */
    fun observanceOn(iso: String, tithi: Int): Boolean {
        val here = tithiAtSunrise(iso)
        val previous = tithiAtSunrise(Dates.addDays(iso, -1))
        val next = tithiAtSunrise(Dates.addDays(iso, 1))

        if (here == tithi) {
            if (next == tithi && previous != tithi) return false
            return true
        }
        if (here == tithi - 1 && next == (tithi % 30) + 1) return true
        return false
    }

    /** The next civil date a tithi vow is due — used by the create sheet. */
    fun nextObservance(tithi: Int, fromIso: String): String? {
        for (i in 0 until 40) {
            val iso = Dates.addDays(fromIso, i.toLong())
            if (observanceOn(iso, tithi)) return iso
        }
        return null
    }

    fun observanceFor(tithi: Int): String? = when (tithi) {
        11, 26 -> "Ekādaśī"
        15 -> "Pūrṇimā"
        30 -> "Amāvasyā"
        8, 23 -> "Aṣṭamī"
        4, 19 -> "Caturthī"
        13, 28 -> "Pradoṣa"
        29 -> "Śivarātri"
        else -> null
    }

    /** A short, honest one-liner for the accuracy footnote in the UI. */
    const val METHOD: String =
        "Computed on this device: 60-term lunar series, Lahiri ayanāṁśa, " +
            "NOAA sunrise. Tithi boundaries are typically within a minute of a printed pañcāṅga."

    @Suppress("unused")
    private fun utcAnchor(date: LocalDate): Instant = date.atStartOfDay(ZoneOffset.UTC).toInstant()
}
