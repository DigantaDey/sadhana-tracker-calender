package app.sadhana.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import app.sadhana.SadhanaApp
import app.sadhana.core.Dates
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Handles the two notification actions without opening the app. */
class ReminderActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val container = (context.applicationContext as SadhanaApp).container
        val sankalpId = intent.getStringExtra(ReminderScheduler.EXTRA_SANKALP_ID) ?: return
        val date = intent.getStringExtra(ReminderScheduler.EXTRA_DATE) ?: Dates.todayIso()

        NotificationManagerCompat.from(context).cancel(sankalpId.hashCode())

        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val sankalp = container.repo.currentSankalps().firstOrNull { it.id == sankalpId }
                    ?: return@launch
                when (intent.action) {
                    ACTION_MARK_DONE -> container.repo.markKeptFromNotification(sankalpId)
                    ACTION_SNOOZE -> {
                        val minutes = intent.getIntExtra(EXTRA_MINUTES, sankalp.reminder.snoozeMinutes)
                        container.scheduler.snooze(sankalp, date, minutes)
                    }
                }
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_MARK_DONE = "app.sadhana.action.MARK_DONE"
        const val ACTION_SNOOZE = "app.sadhana.action.SNOOZE"
        const val EXTRA_MINUTES = "minutes"
    }
}
