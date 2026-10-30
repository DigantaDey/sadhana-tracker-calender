package app.sadhana

import android.app.Application
import android.content.Context
import app.sadhana.ai.OnDeviceAi
import app.sadhana.data.SadhanaDatabase
import app.sadhana.data.SadhanaRepository
import app.sadhana.data.SeedData
import app.sadhana.data.SettingsStore
import app.sadhana.notifications.Notifications
import app.sadhana.notifications.ReminderScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** Manual dependency container — small enough that DI would be ceremony. */
class AppContainer(context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val database = SadhanaDatabase.get(context)
    val settingsStore = SettingsStore(context)
    val repo = SadhanaRepository(database, settingsStore, scope)
    val scheduler = ReminderScheduler(context)
    val ai = OnDeviceAi(context)
}

class SadhanaApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Notifications.ensureChannels(this)

        container.scope.launch {
            SeedData.seedIfEmpty(this@SadhanaApp, container)
            container.scheduler.rescheduleAll(container.repo.currentSankalps())
        }
    }
}
