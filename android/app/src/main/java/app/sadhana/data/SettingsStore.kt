package app.sadhana.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.sadhana.domain.AiPref
import app.sadhana.domain.Place
import app.sadhana.domain.Settings
import app.sadhana.domain.placeById
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
        val panchangId = stringPreferencesKey("panchang_place")
        val panchangLabel = stringPreferencesKey("panchang_label")
        val panchangLat = stringPreferencesKey("panchang_lat")
        val panchangLon = stringPreferencesKey("panchang_lon")
        val panchangZone = stringPreferencesKey("panchang_zone")
        val onboarded = booleanPreferencesKey("onboarded")
    }

    /** Rebuild [Settings] from whatever is on disk, tolerating anything. */
    private fun read(prefs: Preferences): Settings {
        val defaults = Settings()
        val id = prefs[Keys.panchangId]
        val preset = placeById(id)
        val stored = Place(
            id = id ?: preset.id,
            label = prefs[Keys.panchangLabel] ?: preset.label,
            latitude = prefs[Keys.panchangLat]?.toDoubleOrNull() ?: preset.latitude,
            longitude = prefs[Keys.panchangLon]?.toDoubleOrNull() ?: preset.longitude,
            zone = runCatching { java.time.ZoneId.of(prefs[Keys.panchangZone] ?: "") }
                .getOrDefault(preset.zone),
        )
        return Settings(
            name = prefs[Keys.name] ?: defaults.name,
            theme = runCatching { ThemePref.valueOf(prefs[Keys.theme] ?: "") }
                .getOrDefault(defaults.theme),
            weekStartsMonday = prefs[Keys.monday] ?: defaults.weekStartsMonday,
            notificationsEnabled = prefs[Keys.notifications] ?: defaults.notificationsEnabled,
            defaultLeadMinutes = prefs[Keys.lead]?.toIntOrNull() ?: defaults.defaultLeadMinutes,
            snoozeMinutes = prefs[Keys.snooze]?.toIntOrNull() ?: defaults.snoozeMinutes,
            quietStart = prefs[Keys.quietStart] ?: defaults.quietStart,
            quietEnd = prefs[Keys.quietEnd] ?: defaults.quietEnd,
            onDeviceAi = runCatching { AiPref.valueOf(prefs[Keys.ai] ?: "") }
                .getOrDefault(defaults.onDeviceAi),
            panchang = stored,
            onboarded = prefs[Keys.onboarded] ?: defaults.onboarded,
        )
    }

    val settings: Flow<Settings> = context.dataStore.data.map { read(it) }

    suspend fun update(transform: (Settings) -> Settings) {
        context.dataStore.edit { prefs ->
            val next = transform(read(prefs))
            prefs[Keys.name] = next.name
            prefs[Keys.theme] = next.theme.name
            prefs[Keys.monday] = next.weekStartsMonday
            prefs[Keys.notifications] = next.notificationsEnabled
            prefs[Keys.lead] = next.defaultLeadMinutes.toString()
            prefs[Keys.snooze] = next.snoozeMinutes.toString()
            prefs[Keys.quietStart] = next.quietStart
            prefs[Keys.quietEnd] = next.quietEnd
            prefs[Keys.ai] = next.onDeviceAi.name
            prefs[Keys.panchangId] = next.panchang.id
            prefs[Keys.panchangLabel] = next.panchang.label
            prefs[Keys.panchangLat] = next.panchang.latitude.toString()
            prefs[Keys.panchangLon] = next.panchang.longitude.toString()
            prefs[Keys.panchangZone] = next.panchang.zone.id
            prefs[Keys.onboarded] = next.onboarded
        }
    }
}
