package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.core.Dates
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Status
import app.sadhana.domain.describe
import app.sadhana.ui.UiState
import app.sadhana.ui.components.BarTrack
import app.sadhana.ui.components.Chip
import app.sadhana.ui.components.EmptyState
import app.sadhana.ui.components.GlyphBadge
import app.sadhana.ui.theme.LocalSadhanaColors
import app.sadhana.ui.theme.accentFor

@Composable
fun SankalpScreen(
    state: UiState,
    onOpen: (Sankalp) -> Unit,
    onCreate: () -> Unit,
) {
    var filter by remember { mutableStateOf(Status.ACTIVE) }
    val counts = mapOf(
        Status.ACTIVE to state.sankalps.count { it.status == Status.ACTIVE },
        Status.PAUSED to state.sankalps.count { it.status == Status.PAUSED },
        Status.COMPLETED to state.sankalps.count { it.status == Status.COMPLETED || it.status == Status.STOPPED },
    )
    val list = when (filter) {
        Status.ACTIVE -> state.sankalps.filter { it.status == Status.ACTIVE }
        Status.PAUSED -> state.sankalps.filter { it.status == Status.PAUSED }
        else -> state.sankalps.filter { it.status == Status.COMPLETED || it.status == Status.STOPPED }
    }
    val extras = LocalSadhanaColors.current

    LazyColumn(
        Modifier.fillMaxWidth(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("VOWS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Sankalp", style = MaterialTheme.typography.displaySmall)
                }
                Row(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable { onCreate() }
                        .padding(horizontal = 14.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Add, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.height(16.dp))
                    Text(
                        "New",
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }
        }

        item {
            Text(
                "A saṅkalpa is a vow with edges — a day it begins, a rhythm, and a day it rests.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
            )
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Chip("Active ${counts[Status.ACTIVE]}", filter == Status.ACTIVE) { filter = Status.ACTIVE }
                Chip("Paused ${counts[Status.PAUSED]}", filter == Status.PAUSED) { filter = Status.PAUSED }
                Chip("Ended ${counts[Status.COMPLETED]}", filter == Status.COMPLETED) { filter = Status.COMPLETED }
            }
        }

        if (list.isEmpty()) {
            item {
                EmptyState(
                    "Nothing here yet",
                    "Start with ten minutes — small enough to keep tomorrow.",
                )
            }
        }

        items(list.size) { index ->
            val sankalp = list[index]
            val progress = Schedule.progress(sankalp, state.completions, state.today)
            val accent = accentFor(sankalp.color)
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
                    .clickable { onOpen(sankalp) }
                    .padding(14.dp)
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    GlyphBadge(sankalp.glyph, accent, size = 40.dp, fontSize = 18)
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(sankalp.name, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "${sankalp.frequency.describe()} · ${Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        if (sankalp.status == Status.ACTIVE) "${progress.streak}d"
                        else sankalp.status.name.lowercase().replaceFirstChar { it.uppercase() },
                        fontSize = 10.sp,
                        color = accent,
                    )
                }
                sankalp.intention?.let {
                    Text(
                        "“$it”",
                        style = MaterialTheme.typography.bodySmall,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        BarTrack(progress.rate, accent)
                    }
                    Text(
                        "${(progress.rate * 100).toInt()}%",
                        fontSize = 10.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 10.dp),
                    )
                }
                Text(
                    if (sankalp.endsOn != null)
                        "Day ${progress.dayNumber} of ${progress.totalDays} · ends ${Dates.formatShort(sankalp.endsOn)}"
                    else "Ongoing since ${Dates.formatShort(sankalp.startedOn)}",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 7.dp),
                )
            }
        }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
                    .clickable { onCreate() }
                    .padding(16.dp)
            ) {
                Text("Take a new saṅkalpa", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Daily, weekly, monthly, by tithi, or a single anuṣṭhāna.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
