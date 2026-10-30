package app.sadhana.notifications

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.sadhana.MainActivity
import app.sadhana.R
import app.sadhana.SadhanaApp
import app.sadhana.core.Dates
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val sankalpId = intent.getStringExtra(ReminderScheduler.EXTRA_SANKALP_ID) ?: return
        val date = intent.getStringExtra(ReminderScheduler.EXTRA_DATE) ?: Dates.todayIso()
        val container = (context.applicationContext as SadhanaApp).container

        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val sankalp = container.repo.currentSankalps().firstOrNull { it.id == sankalpId }
                    ?: return@launch

                val open = PendingIntent.getActivity(
                    context,
                    0,
                    Intent(context, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val markDone = PendingIntent.getBroadcast(
                    context,
                    1,
                    Intent(context, ReminderActionReceiver::class.java).apply {
                        action = ReminderActionReceiver.ACTION_MARK_DONE
                        putExtra(ReminderScheduler.EXTRA_SANKALP_ID, sankalpId)
                        putExtra(ReminderScheduler.EXTRA_DATE, date)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val snooze = PendingIntent.getBroadcast(
                    context,
                    2,
                    Intent(context, ReminderActionReceiver::class.java).apply {
                        action = ReminderActionReceiver.ACTION_SNOOZE
                        putExtra(ReminderScheduler.EXTRA_SANKALP_ID, sankalpId)
                        putExtra(ReminderScheduler.EXTRA_DATE, date)
                        putExtra(ReminderActionReceiver.EXTRA_MINUTES, sankalp.reminder.snoozeMinutes)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val window = Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd)
                val notification = NotificationCompat.Builder(context, Notifications.CHANNEL_REMINDERS)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(sankalp.name)
                    .setContentText("Opens at $window — ${sankalp.reminder.leadMinutes} min from now")
                    .setStyle(
                        NotificationCompat.BigTextStyle().bigText(
                            "${sankalp.intention ?: "Your vow is due at $window."} " +
                                "Snooze it for ${sankalp.reminder.snoozeMinutes} minutes, or mark it kept."
                        )
                    )
                    .setContentIntent(open)
                    .addAction(0, context.getString(R.string.action_mark_done), markDone)
                    .addAction(0, context.getString(R.string.action_snooze), snooze)
                    .setAutoCancel(true)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .build()

                try {
                    NotificationManagerCompat.from(context)
                        .notify(sankalpId.hashCode(), notification)
                } catch (_: SecurityException) {
                    // POST_NOTIFICATIONS not granted; the in-app card still shows.
                }

                // chain the next occurrence so the practice keeps returning quietly
                container.scheduler.scheduleNext(sankalp, Dates.addDays(date, 1))
            } finally {
                pending.finish()
            }
        }
    }
}
