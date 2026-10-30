package app.sadhana.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import app.sadhana.core.Dates
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Exact alarms, one per upcoming occurrence.
 *
 * Why AlarmManager and not WorkManager: a reminder must land at 05:15, not
 * "sometime in the next fifteen minutes". Vows without a time window get no
 * alarm at all — the home screen still shows them as due.
 */
class ReminderScheduler(private val context: Context) {

    private val alarmManager: AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun canScheduleExact(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else true

    private fun pendingIntent(sankalp: Sankalp, occurrence: String, snooze: Boolean): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            action = if (snooze) ACTION_SNOOZE_ALARM else ACTION_REMIND
            putExtra(EXTRA_SANKALP_ID, sankalp.id)
            putExtra(EXTRA_DATE, occurrence)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestCode(sankalp.id, occurrence), intent, flags)
    }

    private fun requestCode(id: String, date: String) = (id + date).hashCode()

    private fun prefs() = context.getSharedPreferences("sadhana_alarms", Context.MODE_PRIVATE)

    private fun remember(id: String, date: String) {
        prefs().edit().putString(id, date).apply()
    }

    fun scheduleNext(sankalp: Sankalp, from: String = Dates.todayIso()) {
        cancel(sankalp)
        if (!sankalp.reminder.enabled || sankalp.timeStart == null) return
        val next = Schedule.nextOccurrence(sankalp, from) ?: return
        scheduleAt(sankalp, next, sankalp.reminder.leadMinutes)
    }

    private fun scheduleAt(sankalp: Sankalp, occurrence: String, leadMinutes: Int) {
        val start = sankalp.timeStart ?: return
        val date = Dates.parse(occurrence)
        val local = LocalDateTime.of(date, Dates.at(occurrence, start))
            .minusMinutes(leadMinutes.toLong())
        val triggerAt = local.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (triggerAt <= System.currentTimeMillis()) return

        remember(sankalp.id, occurrence)
        val pi = pendingIntent(sankalp, occurrence, snooze = false)
        try {
            if (canScheduleExact()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else {
                // Graceful degradation: an inexact alarm may drift by minutes.
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            }
        } catch (_: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }

    fun snooze(sankalp: Sankalp, occurrence: String, minutes: Int) {
        val pi = pendingIntent(sankalp, occurrence, snooze = true)
        val at = System.currentTimeMillis() + minutes * 60_000L
        try {
            if (canScheduleExact()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            }
        } catch (_: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    fun cancel(sankalp: Sankalp) {
        val armed = prefs().getString(sankalp.id, null) ?: return
        alarmManager.cancel(pendingIntent(sankalp, armed, snooze = false))
        prefs().edit().remove(sankalp.id).apply()
    }

    fun rescheduleAll(sankalps: List<Sankalp>) {
        sankalps.forEach { scheduleNext(it) }
    }

    companion object {
        const val ACTION_REMIND = "app.sadhana.action.REMIND"
        const val ACTION_SNOOZE_ALARM = "app.sadhana.action.SNOOZE_ALARM"
        const val EXTRA_SANKALP_ID = "sankalpId"
        const val EXTRA_DATE = "date"
    }
}
