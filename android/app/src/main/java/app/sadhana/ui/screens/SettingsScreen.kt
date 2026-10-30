package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.ai.AiCapability
import app.sadhana.domain.AiPref
import app.sadhana.domain.Settings
import app.sadhana.domain.ThemePref
import app.sadhana.ui.components.Chip
import app.sadhana.ui.components.Hairline
import app.sadhana.ui.components.SectionHeader
import app.sadhana.ui.theme.LocalSadhanaColors

@Composable
fun SettingsScreen(
    settings: Settings,
    capability: AiCapability?,
    onUpdate: ((Settings) -> Settings) -> Unit,
    onBack: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, contentDescription = "Back") }
                Text("SETTINGS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("Make it yours", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 4.dp))
        }

        item { SectionHeader("Appearance", Modifier.padding(top = 16.dp)) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Chip("System", settings.theme == ThemePref.SYSTEM, Modifier.weight(1f)) {
                    onUpdate { it.copy(theme = ThemePref.SYSTEM) }
                }
                Chip("Light", settings.theme == ThemePref.LIGHT, Modifier.weight(1f)) {
                    onUpdate { it.copy(theme = ThemePref.LIGHT) }
                }
                Chip("Dark", settings.theme == ThemePref.DARK, Modifier.weight(1f)) {
                    onUpdate { it.copy(theme = ThemePref.DARK) }
                }
            }
        }

        item { SectionHeader("You", Modifier.padding(top = 18.dp)) }
        item {
            OutlinedTextField(
                value = settings.name,
                onValueChange = { name -> onUpdate { it.copy(name = name) } },
                label = { Text("Name in the greeting") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            ToggleRow(
                "Week starts on Monday",
                "Affects the calendar and week view",
                settings.weekStartsMonday,
            ) { onUpdate { s -> s.copy(weekStartsMonday = it) } }
        }

        item { SectionHeader("Reminders", Modifier.padding(top = 18.dp)) }
        item {
            ToggleRow(
                "Practice reminders",
                "Fires before each practice window opens",
                settings.notificationsEnabled,
            ) { onUpdate { s -> s.copy(notificationsEnabled = it) } }
        }
        item {
            Column {
                Text("Default lead time", style = MaterialTheme.typography.titleSmall)
                Text("How long before the window opens", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(0, 15, 30, 60).forEach { m ->
                        Chip(
                            if (m == 0) "At start" else if (m < 60) "$m min" else "${m / 60} hr",
                            settings.defaultLeadMinutes == m,
                        ) { onUpdate { s -> s.copy(defaultLeadMinutes = m) } }
                    }
                }
            }
        }
        item {
            Column {
                Text("Quiet hours", style = MaterialTheme.typography.titleSmall)
                Text(
                    "Nothing rings between ${settings.quietStart} and ${settings.quietEnd}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item { SectionHeader("On-device intelligence", Modifier.padding(top = 18.dp)) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Chip("Auto", settings.onDeviceAi == AiPref.AUTO, Modifier.weight(1f)) {
                    onUpdate { it.copy(onDeviceAi = AiPref.AUTO) }
                }
                Chip("Always", settings.onDeviceAi == AiPref.ON, Modifier.weight(1f)) {
                    onUpdate { it.copy(onDeviceAi = AiPref.ON) }
                }
                Chip("Off", settings.onDeviceAi == AiPref.OFF, Modifier.weight(1f)) {
                    onUpdate { it.copy(onDeviceAi = AiPref.OFF) }
                }
            }
        }
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(extras.cardAlt)
                    .border(1.dp, extras.hairline, RoundedCornerShape(14.dp))
                    .padding(14.dp)
            ) {
                Text(capability?.engine ?: "Detecting…", style = MaterialTheme.typography.titleSmall)
                Text(
                    capability?.detail ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    "Reported RAM: ${capability?.ramGb ?: 0} GB · ${capability?.reason ?: ""}",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp),
                )
                Text(
                    "The app asks the platform for a model and never downloads a large blob on a connection you did not choose. If nothing is available, every insight falls back to local statistics — same screens, no dead ends.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }

        item { SectionHeader("Your data", Modifier.padding(top = 18.dp)) }
        item {
            Column {
                Text("Export everything", style = MaterialTheme.typography.titleSmall)
                Text(
                    "Vows, marks and diary as one JSON file — see DataExport in the repository layer.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                Hairline()
                Spacer(Modifier.height(10.dp))
                Text("Local-first", style = MaterialTheme.typography.titleSmall)
                Text(
                    "No account, no cloud, no analytics. Room (SQLite) on this device is the only copy.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            Text(
                "Sādhana 0.1.0 · pañcāṅga tithi is approximate in this build",
                fontSize = 10.5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 20.dp),
            )
        }
        item { Spacer(Modifier.width(1.dp).height(30.dp)) }
    }
}

@Composable
private fun ToggleRow(
    title: String,
    sub: String,
    value: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = value, onCheckedChange = onChange)
    }
}
