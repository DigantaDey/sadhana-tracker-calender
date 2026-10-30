package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.core.Dates
import app.sadhana.domain.ApproximatePanchang
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Stats
import app.sadhana.ui.SadhanaViewModel
import app.sadhana.ui.UiState
import app.sadhana.ui.components.BarTrack
import app.sadhana.ui.components.EmptyState
import app.sadhana.ui.components.GlyphBadge
import app.sadhana.ui.components.SectionHeader
import app.sadhana.ui.components.StatCard
import app.sadhana.ui.theme.LocalSadhanaColors
import app.sadhana.ui.theme.accentFor

@Composable
fun TodayScreen(
    state: UiState,
    onToggle: (String) -> Unit,
    onOpenSankalp: (Sankalp) -> Unit,
    onOpenDay: (String) -> Unit,
    onCreate: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenDiary: () -> Unit,
    onSnooze: (Sankalp, Int) -> Unit,
) {
    val today = state.today
    val scheduled = Schedule.scheduledOn(state.sankalps, today)
    val doneCount = scheduled.count { Schedule.isDone(state.completions, it.id, today) }
    val streak = Stats.currentStreak(state.sankalps, state.completions, today)
    val weekRate = Stats.consistency(state.sankalps, state.completions, Dates.addDays(today, -6), today)
    val week = (6 downTo 0).map { Dates.addDays(today, -it.toLong()) }
    val extras = LocalSadhanaColors.current

    LazyColumn(
        Modifier.fillMaxWidth(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 20.dp, end = 20.dp, top = 12.dp, bottom = 28.dp
        ),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    Dates.formatLong(today).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Rounded.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        item {
            Column(Modifier.padding(top = 16.dp)) {
                Text(
                    Dates.greeting(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    if (state.settings.name.isBlank()) "Your practice" else state.settings.name,
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 2.dp),
                )
                Row(
                    Modifier.padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        ApproximatePanchang.tithiName(Dates.parse(today)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text("  ·  ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        if (scheduled.isEmpty()) "Nothing scheduled today" else "$doneCount of ${scheduled.size} kept",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        item {
            Row(
                Modifier.fillMaxWidth().padding(top = 18.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                StatCard(
                    label = "Streak",
                    value = "$streak",
                    unit = "days",
                    sub = if (streak > 1) "keep it unbroken" else "begin again today",
                    accent = true,
                    modifier = Modifier.weight(1.15f),
                )
                StatCard(
                    label = "7 days",
                    value = "${(weekRate * 100).toInt()}",
                    unit = "%",
                    sub = "kept",
                    modifier = Modifier.weight(1f),
                )
                StatCard(
                    label = "Vows",
                    value = "${state.active.size}",
                    sub = "in force",
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            Column(Modifier.padding(top = 26.dp)) {
                SectionHeader("Today's practice")
                if (scheduled.isEmpty()) {
                    EmptyState("A clear day", "Take a small vow and it will meet you here tomorrow.")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "New sankalp",
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.clickable { onCreate() },
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        scheduled.forEach { sankalp ->
                            PracticeRow(
                                sankalp = sankalp,
                                done = Schedule.isDone(state.completions, sankalp.id, today),
                                onOpen = { onOpenSankalp(sankalp) },
                                onToggle = { onToggle(sankalp.id) },
                            )
                        }
                    }
                }
            }
        }

        item {
            Column(Modifier.padding(top = 26.dp)) {
                SectionHeader("This week") {
                    Text(
                        "Calendar",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { onOpenDay(today) },
                    )
                }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    week.forEach { iso ->
                        val tally = Stats.tally(state.sankalps, state.completions, iso)
                        val ratio = tally.ratio
                        Column(
                            Modifier.weight(1f).clickable { onOpenDay(iso) },
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                Modifier
                                    .fillMaxWidth(0.6f)
                                    .height((10 + ratio * 40).dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        when {
                                            ratio >= 1f -> MaterialTheme.colorScheme.primary
                                            ratio > 0f -> MaterialTheme.colorScheme.primary.copy(alpha = 0.25f + ratio * 0.5f)
                                            else -> MaterialTheme.colorScheme.surfaceVariant
                                        }
                                    )
                            )
                            Text(
                                listOf("S", "M", "T", "W", "T", "F", "S")[Dates.weekday(iso)],
                                fontSize = 9.5.sp,
                                color = if (iso == today) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                    }
                }
            }
        }

        item {
            Column(Modifier.padding(top = 26.dp)) {
                SectionHeader("Sankalp in force") {
                    Text(
                        "${state.active.size}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    state.active.forEach { sankalp ->
                        StripCard(
                            sankalp = sankalp,
                            rate = Schedule.progress(sankalp, state.completions, today).rate,
                            streak = Schedule.progress(sankalp, state.completions, today).streak,
                            dayNumber = Schedule.progress(sankalp, state.completions, today).dayNumber,
                            totalDays = Schedule.progress(sankalp, state.completions, today).totalDays,
                            onClick = { onOpenSankalp(sankalp) },
                        )
                    }
                }
            }
        }

        item {
            Column(Modifier.padding(top = 24.dp)) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
                        .clickable { onOpenDiary() }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    GlyphBadge("✎", MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text("DIARY", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            state.notes.firstOrNull { it.date == today }?.title ?: "Write today's entry",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                        Text(
                            "A few honest lines are enough.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        item {
            Text(
                "A little, every day — that is the whole method.",
                style = MaterialTheme.typography.bodySmall,
                fontStyle = FontStyle.Italic,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth().padding(top = 28.dp),
            )
        }
    }
}

@Composable
private fun PracticeRow(
    sankalp: Sankalp,
    done: Boolean,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    val accent = accentFor(sankalp.color)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.clickable { onOpen() }) {
            GlyphBadge(sankalp.glyph, accent, size = 40.dp, fontSize = 18)
        }
        Column(
            Modifier
                .weight(1f)
                .padding(start = 12.dp)
                .clickable { onOpen() }
        ) {
            Text(
                sankalp.name,
                style = MaterialTheme.typography.titleMedium,
                color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
            Text(
                Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd) +
                    (sankalp.targetCount?.let { "  ·  $it reps" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (sankalp.reminder.enabled) {
            Icon(
                Icons.Rounded.NotificationsNone,
                contentDescription = "Reminder on",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(15.dp).padding(end = 6.dp),
            )
        }
        Box(
            Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(if (done) extras.jade else androidx.compose.ui.graphics.Color.Transparent)
                .border(1.5.dp, if (done) extras.jade else extras.hairline, CircleShape)
                .clickable { onToggle() },
            contentAlignment = Alignment.Center,
        ) {
            if (done) {
                Icon(
                    Icons.Rounded.Check,
                    contentDescription = "Kept",
                    tint = androidx.compose.ui.graphics.Color.White,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun StripCard(
    sankalp: Sankalp,
    rate: Float,
    streak: Int,
    dayNumber: Int,
    totalDays: Int,
    onClick: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    val accent = accentFor(sankalp.color)
    Column(
        Modifier
            .width(172.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, extras.hairline, RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            GlyphBadge(sankalp.glyph, accent, size = 28.dp, fontSize = 13)
            Column(Modifier.padding(start = 8.dp)) {
                Text(
                    sankalp.name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                )
                Text(
                    if (sankalp.endsOn != null) "Day $dayNumber of $totalDays" else "Ongoing",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        BarTrack(rate, accent, height = 3.dp)
        Row(
            Modifier.fillMaxWidth().padding(top = 7.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "${(rate * 100).toInt()}% kept",
                fontSize = 10.5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text("${streak}d", fontSize = 10.5.sp, color = accent, fontWeight = FontWeight.SemiBold)
        }
    }
}
