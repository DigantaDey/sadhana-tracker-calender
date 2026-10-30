package app.sadhana.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A saṅkalpa: a vow with edges — the day it begins, its rhythm, and the day it rests.
 */
data class Sankalp(
    val id: String,
    val name: String,
    val intention: String? = null,
    val category: Category = Category.JAPA,
    val color: ColorKey = ColorKey.SAFFRON,
    val glyph: String = "ॐ",
    /** The day the vow was taken. */
    val startedOn: String,
    /** Last day it runs. `null` = open-ended. */
    val endsOn: String? = null,
    val frequency: Frequency = Frequency.Daily,
    val timeStart: String? = null,
    val timeEnd: String? = null,
    val targetCount: Int? = null,
    val reminder: Reminder = Reminder(),
    val status: Status = Status.ACTIVE,
    val createdAt: Long = System.currentTimeMillis(),
) {
    val hasWindow: Boolean get() = timeStart != null
}

enum class Status { ACTIVE, PAUSED, COMPLETED, STOPPED }

enum class Category(val label: String, val glyph: String, val hint: String) {
    JAPA("Japa", "ॐ", "Mantra repetition"),
    PATHA("Pāṭha", "॥", "Recitation & study of scripture"),
    DHYANA("Dhyāna", "☸", "Meditation & stillness"),
    YOGA("Āsana", "✶", "Asana, pranayama, movement"),
    PUJA("Pūjā", "❂", "Ritual & offering"),
    SEVA("Sevā", "✿", "Selfless service"),
    SVADHYAYA("Svādhyāya", "❋", "Self-study & reflection"),
    ANUSTHANA("Anuṣṭhāna", "✦", "Special observance or vrata"),
}

enum class ColorKey(val light: Long, val dark: Long, val label: String) {
    SAFFRON(0xFFB5741F, 0xFFE7B273, "Saffron"),
    INDIGO(0xFF4C5C8F, 0xFF9AABDE, "Indigo"),
    JADE(0xFF3F755C, 0xFF7FB89C, "Jade"),
    TERRACOTTA(0xFFA9553B, 0xFFD89179, "Terracotta"),
    PLUM(0xFF7A4A6E, 0xFFC08FB4, "Plum"),
    SLATE(0xFF4E5A63, 0xFF9DAAB3, "Slate"),
}

@Serializable
sealed interface Frequency {
    @Serializable
    @SerialName("daily")
    data object Daily : Frequency

    /** days: 0 = Sunday … 6 = Saturday */
    @Serializable
    @SerialName("weekly")
    data class Weekly(val days: List<Int>) : Frequency

    @Serializable
    @SerialName("monthly")
    data class Monthly(val day: Int) : Frequency

    @Serializable
    @SerialName("yearly")
    data class Yearly(val month: Int, val day: Int) : Frequency

    /** 1–30 lunar day */
    @Serializable
    @SerialName("tithi")
    data class Tithi(val tithi: Int) : Frequency

    @Serializable
    @SerialName("once")
    data class Once(val date: String) : Frequency
}

data class Reminder(
    val enabled: Boolean = true,
    val leadMinutes: Int = 15,
    val snoozeMinutes: Int = 30,
)

data class Completion(
    val sankalpId: String,
    val date: String,
    val done: Boolean = true,
    val count: Int? = null,
    val note: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
)

data class Note(
    val id: String,
    val date: String,
    val title: String,
    val body: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val pinned: Boolean = false,
)

data class Settings(
    val name: String = "",
    val theme: ThemePref = ThemePref.SYSTEM,
    val weekStartsMonday: Boolean = true,
    val notificationsEnabled: Boolean = true,
    val defaultLeadMinutes: Int = 15,
    val snoozeMinutes: Int = 30,
    val quietStart: String = "22:30",
    val quietEnd: String = "05:00",
    val onDeviceAi: AiPref = AiPref.AUTO,
)

enum class ThemePref { SYSTEM, LIGHT, DARK }

enum class AiPref { AUTO, ON, OFF }

object TithiNames {
    val names = listOf(
        "Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
        "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
        "Trayodaśī", "Caturdaśī", "Pūrṇimā", "Pratipadā", "Dvitīyā", "Tṛtīyā",
        "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī",
        "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī", "Amāvasyā",
    )
}
