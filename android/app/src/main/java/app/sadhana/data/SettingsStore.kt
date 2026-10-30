package app.sadhana.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.sadhana.domain.AiPref
import app.sadhana.domain.Settings
import app.sadhana.domain.ThemePref
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("sadhana_settings")

class SettingsStore(private val context: Context) {

    private object Keys {
        val name = stringPreferencesKey("name")
        val theme = stringPreferencesKey("theme")
        val monday = booleanPreferencesKey("week_starts_monday")
        val notifications = booleanPreferencesKey("notifications_enabled")
        val lead = stringPreferencesKey("default_lead")
        val snooze = stringPreferencesKey("default_snooze")
        val quietStart = stringPreferencesKey("quiet_start")
        val quietEnd = stringPreferencesKey("quiet_end")
        val ai = stringPreferencesKey("on_device_ai")
    }

    val settings: Flow<Settings> = context.dataStore.data.map { p ->
        val defaults = Settings()
        Settings(
            name = p[Keys.name] ?: defaults.name,
            theme = runCatching { ThemePref.valueOf(p[Keys.theme] ?: "") }
                .getOrDefault(defaults.theme),
            weekStartsMonday = p[Keys.monday] ?: defaults.weekStartsMonday,
            notificationsEnabled = p[Keys.notifications] ?: defaults.notificationsEnabled,
            defaultLeadMinutes = p[Keys.lead]?.toIntOrNull() ?: defaults.defaultLeadMinutes,
            snoozeMinutes = p[Keys.snooze]?.toIntOrNull() ?: defaults.snoozeMinutes,
            quietStart = p[Keys.quietStart] ?: defaults.quietStart,
            quietEnd = p[Keys.quietEnd] ?: defaults.quietEnd,
            onDeviceAi = runCatching { AiPref.valueOf(p[Keys.ai] ?: "") }.getOrDefault(defaults.onDeviceAi),
        )
    }

    suspend fun update(transform: (Settings) -> Settings) {
        context.dataStore.edit { prefs ->
            val current = Settings(
                name = prefs[Keys.name] ?: "",
                theme = runCatching { ThemePref.valueOf(prefs[Keys.theme] ?: "") }
                    .getOrDefault(ThemePref.SYSTEM),
                weekStartsMonday = prefs[Keys.monday] ?: true,
                notificationsEnabled = prefs[Keys.notifications] ?: true,
                defaultLeadMinutes = prefs[Keys.lead]?.toIntOrNull() ?: 15,
                snoozeMinutes = prefs[Keys.snooze]?.toIntOrNull() ?: 30,
                quietStart = prefs[Keys.quietStart] ?: "22:30",
                quietEnd = prefs[Keys.quietEnd] ?: "05:00",
                onDeviceAi = runCatching { AiPref.valueOf(prefs[Keys.ai] ?: "") }
                    .getOrDefault(AiPref.AUTO),
            )
            val next = transform(current)
            prefs[Keys.name] = next.name
            prefs[Keys.theme] = next.theme.name
            prefs[Keys.monday] = next.weekStartsMonday
            prefs[Keys.notifications] = next.notificationsEnabled
            prefs[Keys.lead] = next.defaultLeadMinutes.toString()
            prefs[Keys.snooze] = next.snoozeMinutes.toString()
            prefs[Keys.quietStart] = next.quietStart
            prefs[Keys.quietEnd] = next.quietEnd
            prefs[Keys.ai] = next.onDeviceAi.name
        }
    }
}
