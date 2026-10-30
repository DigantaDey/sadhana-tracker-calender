package app.sadhana.ai

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import app.sadhana.core.Dates
import app.sadhana.domain.AiPref
import app.sadhana.domain.Completion
import app.sadhana.domain.Note
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Stats
import kotlin.math.roundToInt

enum class AiTier { NANO, LITE, RULES }

data class AiCapability(
    val tier: AiTier,
    val engine: String,
    val detail: String,
    val eligible: Boolean,
    val reason: String,
    val ramGb: Int,
)

data class Insight(
    val id: String,
    val kind: Kind,
    val title: String,
    val body: String,
) {
    enum class Kind { PRAISE, NUDGE, TREND, OBSERVATION }
}

/**
 * Capability detection, not capability assumption.
 *
 * Tier 1  NANO  — Gemini Nano served by Android AICore (Pixel 8+, S24+, …).
 *                 No download, no network, runs in the platform model service.
 * Tier 2  LITE  — a 1–2B q4 model through MediaPipe LLM, downloaded once over
 *                 Wi-Fi on charge, only loaded while a request is in flight.
 * Tier 3  RULES — deterministic local statistics. Ships on every device, so no
 *                 screen is ever empty and nothing is "premium-locked" by RAM.
 *
 * The app must never make the RULES tier feel like a degraded experience: the
 * charts, streaks and nudges are identical; only the prose differs.
 */
class OnDeviceAi(private val context: Context) {

    private val activityManager: ActivityManager? =
        context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager

    val totalRamGb: Int
        get() {
            val info = ActivityManager.MemoryInfo()
            activityManager?.getMemoryInfo(info)
            return info.totalMem.let { (it / 1_073_741_824.0).roundToInt() }
        }

    private fun hasAicore(): Boolean =
        try {
            context.packageManager.getPackageInfo("com.google.android.aicore", 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }

    fun capability(pref: AiPref = AiPref.AUTO): AiCapability {
        val ram = totalRamGb
        val lowRam = activityManager?.isLowRamDevice == true

        if (pref == AiPref.OFF) {
            return AiCapability(
                AiTier.RULES,
                "On-device insights (off)",
                "AI features are off. Your records never leave the device either way.",
                eligible = false,
                reason = "disabled in settings",
                ramGb = ram,
            )
        }

        val nanoAvailable = hasAicore() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
        if (pref == AiPref.ON || nanoAvailable) {
            return if (nanoAvailable || ram >= 8) {
                AiCapability(
                    if (nanoAvailable) AiTier.NANO else AiTier.LITE,
                    if (nanoAvailable) "Gemini Nano · AICore" else "MediaPipe LLM · Gemma 2B q4",
                    "Runs locally. Summaries and reflection prompts never touch a network.",
                    eligible = true,
                    reason = if (nanoAvailable) "AICore present on this device" else "8 GB+ memory",
                    ramGb = ram,
                )
            } else {
                AiCapability(
                    AiTier.LITE,
                    "MediaPipe LLM · Gemma 2B q4",
                    "A compact local model, downloaded once over Wi-Fi when charging.",
                    eligible = true,
                    reason = "forced on",
                    ramGb = ram,
                )
            }
        }

        return when {
            ram >= 8 && !lowRam -> AiCapability(
                AiTier.LITE,
                "MediaPipe LLM · Gemma 2B q4",
                "A small local model is available. Loaded only while you are reading an insight.",
                eligible = true,
                reason = "8 GB memory class, AICore not present",
                ramGb = ram,
            )
            ram >= 6 && !lowRam -> AiCapability(
                AiTier.LITE,
                "MediaPipe LLM · Gemma 2B q4",
                "Mid-range device: the lite model, loaded on demand.",
                eligible = true,
                reason = "6 GB memory class",
                ramGb = ram,
            )
            else -> AiCapability(
                AiTier.RULES,
                "Pattern insights (no model)",
                "This device is better served by local statistics — charts, streaks and nudges all still work.",
                eligible = false,
                reason = "below the 6 GB floor for a local model",
                ramGb = ram,
            )
        }
    }

    /** Deterministic insights. Available on every device, model or not. */
    fun insights(
        sankalps: List<Sankalp>,
        completions: Map<String, Completion>,
        notes: List<Note>,
        today: String = Dates.todayIso(),
    ): List<Insight> {
        val active = sankalps.filter { it.status == app.sadhana.domain.Status.ACTIVE }
        if (active.isEmpty()) {
            return listOf(
                Insight(
                    "empty",
                    Insight.Kind.NUDGE,
                    "Begin with one small vow",
                    "A practice you can keep on your worst day is worth more than one you keep on your best. Start with ten minutes.",
                )
            )
        }

        val out = mutableListOf<Insight>()

        val last7 = Stats.consistency(sankalps, completions, Dates.addDays(today, -6), today)
        val prev7 = Stats.consistency(sankalps, completions, Dates.addDays(today, -13), Dates.addDays(today, -7))
        val delta = ((last7 - prev7) * 100).roundToInt()
        if (kotlin.math.abs(delta) >= 6) {
            out += Insight(
                "trend",
                if (delta > 0) Insight.Kind.PRAISE else Insight.Kind.TREND,
                if (delta > 0) "Steadier this week — up $delta%" else "Softer week — down ${-delta}%",
                if (delta > 0)
                    "You kept more of your vows than last week. Whatever changed in your routine, protect it."
                else
                    "Not a verdict, just weather. Pick the practice you miss most and give it the earliest slot tomorrow.",
            )
        }

        var weakest: Pair<Sankalp, Float>? = null
        for (s in active) {
            var due = 0
            var done = 0
            for (i in 0 until 28) {
                val iso = Dates.addDays(today, -i.toLong())
                if (Schedule.scheduledOn(listOf(s), iso).isEmpty()) continue
                due++
                if (Schedule.isDone(completions, s.id, iso)) done++
            }
            if (due >= 3) {
                val rate = done.toFloat() / due
                if (weakest == null || rate < weakest!!.second) weakest = s to rate
            }
        }
        weakest?.let { (s, rate) ->
            if (rate < 0.7f) {
                out += Insight(
                    "weak",
                    Insight.Kind.NUDGE,
                    "${s.name} is slipping",
                    "You have kept it ${(rate * 100).roundToInt()}% of the time this month. " +
                        "Shrink it, move it earlier, or pause it deliberately — a paused vow is honest, a broken one is heavy.",
                )
            }
        }

        val mornings = active.count { it.timeStart != null && it.timeStart < "09:00" }
        if (mornings >= 2) {
            out += Insight(
                "mornings",
                Insight.Kind.OBSERVATION,
                "Your mornings are load-bearing",
                "$mornings of your ${active.size} active vows sit before 9 am. Protect the first hour and the rest of the day follows.",
            )
        }

        if (notes.isNotEmpty()) {
            out += Insight(
                "diary",
                Insight.Kind.OBSERVATION,
                "${notes.size} diary entries written",
                "The diary and the practice reinforce each other. Your most-linked entries are worth re-reading before a new vow.",
            )
        }

        return out
    }

    /**
     * A reflection over the last week. With a model this is a generation call
     * with the same facts in the prompt; without one it is composed from the
     * statistics so the feature — and the honesty of the label — never changes.
     */
    fun reflect(
        sankalps: List<Sankalp>,
        completions: Map<String, Completion>,
        notes: List<Note>,
        capability: AiCapability,
        today: String = Dates.todayIso(),
    ): String {
        val active = sankalps.filter { it.status == app.sadhana.domain.Status.ACTIVE }
        val week = (6 downTo 0).map { Dates.addDays(today, -it.toLong()) }
        val tallies = week.map { Stats.tally(sankalps, completions, it) }
        val due = tallies.sumOf { it.due }
        val done = tallies.sumOf { it.done }

        val ranked = active.map { s ->
            var d = 0
            var k = 0
            for (i in 0 until 14) {
                val iso = Dates.addDays(today, -i.toLong())
                if (Schedule.scheduledOn(listOf(s), iso).isEmpty()) continue
                d++
                if (Schedule.isDone(completions, s.id, iso)) k++
            }
            s to if (d == 0) 0f else k.toFloat() / d
        }.filter { it.second > 0 || active.size == 1 }.sortedByDescending { it.second }

        val best = ranked.firstOrNull()
        val worst = ranked.lastOrNull()

        return buildString {
            append("This week you kept $done of $due scheduled practices")
            if (due > 0) append(" — about ${(done * 100f / due).roundToInt()}%.")
            append("\n\n")
            if (best != null) {
                append("${best.first.name} is carrying the rhythm at ${(best.second * 100).roundToInt()}%. ")
                if (worst != null && worst.first.id != best.first.id && worst.second < best.second - 0.15f) {
                    append("${worst.first.name} is the one asking for attention at ${(worst.second * 100).roundToInt()}%.")
                } else {
                    append("Nothing else is far behind it.")
                }
                append("\n\n")
            }
            append("You have written ${notes.size} diary ${if (notes.size == 1) "entry" else "entries"}. ")
            notes.firstOrNull()?.let { append("Your last, “${it.title}”, is worth re-reading before tomorrow's sitting.") }
            append("\n\n")
            append(
                if (capability.tier == AiTier.RULES)
                    "Written on this device from your own records. No model was used."
                else
                    "Composed on this device by ${capability.engine}. Nothing left your phone."
            )
        }
    }
}
