package app.sadhana.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

object Notifications {
    const val CHANNEL_REMINDERS = "reminders"
    const val CHANNEL_DIGEST = "digest"

    fun ensureChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val reminders = NotificationChannel(
            CHANNEL_REMINDERS,
            context.getString(app.sadhana.R.string.channel_reminders),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(app.sadhana.R.string.channel_reminders_desc)
            enableVibration(true)
            setSound(null, null)
        }

        val digest = NotificationChannel(
            CHANNEL_DIGEST,
            context.getString(app.sadhana.R.string.channel_digest),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = context.getString(app.sadhana.R.string.channel_digest_desc)
        }

        manager.createNotificationChannels(listOf(reminders, digest))
    }
}
