package app.sadhana.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.sadhana.SadhanaApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Alarms do not survive a reboot, an app update or a timezone change.
 * Every trigger is idempotent, so re-arming all of them is always safe.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val container = (context.applicationContext as SadhanaApp).container
        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                container.scheduler.rescheduleAll(container.repo.currentSankalps())
            } finally {
                pending.finish()
            }
        }
    }
}
