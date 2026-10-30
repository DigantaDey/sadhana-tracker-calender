package app.sadhana.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.MenuBook
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.sadhana.core.Dates
import app.sadhana.domain.Sankalp
import app.sadhana.ui.screens.CalendarScreen
import app.sadhana.ui.screens.DiaryScreen
import app.sadhana.ui.screens.InsightsScreen
import app.sadhana.ui.screens.OnboardingScreen
import app.sadhana.ui.screens.SankalpScreen
import app.sadhana.ui.screens.SettingsScreen
import app.sadhana.ui.screens.TodayScreen
import app.sadhana.ui.sheets.CreateSankalpSheet
import app.sadhana.ui.sheets.DaySheet
import app.sadhana.ui.sheets.PracticeDetailSheet
import app.sadhana.ui.theme.SadhanaTheme

private enum class Tab(val label: String, val icon: ImageVector) {
    TODAY("Today", Icons.Rounded.Dashboard),
    CALENDAR("Calendar", Icons.Rounded.CalendarMonth),
    SANKALP("Sankalp", Icons.Rounded.MenuBook),
    DIARY("Diary", Icons.Rounded.Tune),
    INSIGHTS("Insights", Icons.Rounded.Insights),
}

@Composable
fun SadhanaRoot(vm: SadhanaViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val reflection by vm.reflectionText.collectAsStateWithLifecycle()

    var tab by remember { mutableStateOf(Tab.TODAY) }
    var showSettings by remember { mutableStateOf(false) }
    var creating by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Sankalp?>(null) }
    var detail by remember { mutableStateOf<Sankalp?>(null) }
    var selectedDay by remember { mutableStateOf<String?>(null) }

    SadhanaTheme(state.settings.theme) {
        if (!state.settings.onboarded) {
            OnboardingScreen(
                settings = state.settings,
                onUpdate = vm::updateSettings,
                onDone = {},
            )
        } else if (showSettings) {
            SettingsScreen(
                settings = state.settings,
                capability = state.capability,
                onUpdate = vm::updateSettings,
                onBack = { showSettings = false },
            )
        } else {
            Scaffold(
                containerColor = MaterialTheme.colorScheme.background,
                bottomBar = {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.background,
                        tonalElevation = 0.dp,
                    ) {
                        Tab.entries.forEach { entry ->
                            NavigationBarItem(
                                selected = tab == entry,
                                onClick = { tab = entry },
                                icon = { Icon(entry.icon, contentDescription = entry.label) },
                                label = { Text(entry.label, style = MaterialTheme.typography.labelSmall) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                    selectedTextColor = MaterialTheme.colorScheme.onSurface,
                                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            )
                        }
                    }
                },
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding)) {
                    when (tab) {
                        Tab.TODAY -> TodayScreen(
                            state = state,
                            onToggle = { id -> vm.toggle(id) },
                            onOpenSankalp = { detail = it },
                            onOpenDay = { selectedDay = it },
                            onCreate = { creating = true },
                            onOpenSettings = { showSettings = true },
                            onOpenDiary = { tab = Tab.DIARY },
                            onSnooze = { sankalp, minutes -> vm.snooze(sankalp, minutes) },
                        )
                        Tab.CALENDAR -> CalendarScreen(
                            state = state,
                            onToggle = { id, date -> vm.toggle(id, date) },
                            onOpenDay = { selectedDay = it },
                            onCreate = { creating = true },
                        )
                        Tab.SANKALP -> SankalpScreen(
                            state = state,
                            onOpen = { detail = it },
                            onCreate = { creating = true },
                        )
                        Tab.DIARY -> DiaryScreen(
                            state = state,
                            onSaveNote = { vm.saveNote(it) },
                            onDeleteNote = { vm.deleteNote(it) },
                        )
                        Tab.INSIGHTS -> InsightsScreen(
                            state = state,
                            reflection = reflection,
                            onReflect = { vm.composeReflection() },
                            onOpenSettings = { showSettings = true },
                        )
                    }
                }
            }
        }

        if (creating || editing != null) {
            CreateSankalpSheet(
                existing = editing,
                today = Dates.todayIso(),
                defaultLead = state.settings.defaultLeadMinutes,
                defaultSnooze = state.settings.snoozeMinutes,
                onDismiss = { creating = false; editing = null },
                onSave = { sankalp ->
                    vm.saveSankalp(sankalp)
                    creating = false
                    editing = null
                },
            )
        }

        detail?.let { sankalp ->
            PracticeDetailSheet(
                sankalp = sankalp,
                completions = state.completions,
                onDismiss = { detail = null },
                onToggle = { vm.toggle(it.id) },
                onSetCount = { count -> vm.setCount(sankalp.id, count) },
                onEdit = { detail = null; editing = sankalp },
                onStatus = { status ->
                    vm.setStatus(sankalp.id, status)
                    detail = null
                },
                onDelete = {
                    vm.delete(sankalp.id)
                    detail = null
                },
            )
        }

        selectedDay?.let { date ->
            DaySheet(
                date = date,
                state = state,
                onDismiss = { selectedDay = null },
                onToggle = { id -> vm.toggle(id, date) },
                onCreate = { selectedDay = null; creating = true },
            )
        }
    }
}
