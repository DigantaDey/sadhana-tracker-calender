package app.sadhana.ui.sheets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.core.Dates
import app.sadhana.domain.Completion
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Status
import app.sadhana.domain.describe
import app.sadhana.ui.components.GlyphBadge
import app.sadhana.ui.components.StatCard
import app.sadhana.ui.theme.LocalSadhanaColors
import app.sadhana.ui.theme.accentFor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeDetailSheet(
    sankalp: Sankalp,
    completions: Map<String, Completion>,
    onDismiss: () -> Unit,
    onToggle: (Sankalp) -> Unit,
    onSetCount: (Int) -> Unit,
    onEdit: () -> Unit,
    onStatus: (Status) -> Unit,
    onDelete: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val extras = LocalSadhanaColors.current
    val accent = accentFor(sankalp.color)
    val today = Dates.todayIso()
    val progress = Schedule.progress(sankalp, completions, today)
    val doneToday = Schedule.isDone(completions, sankalp.id, today)
    val count = completions[Schedule.key(sankalp.id, today)]?.count ?: 0
    val active = sankalp.status == Status.ACTIVE

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
        ) {
            Row(verticalAlignment = Alignment.Top) {
                GlyphBadge(sankalp.glyph, accent, size = 46.dp, fontSize = 21)
                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(sankalp.name, style = MaterialTheme.typography.headlineSmall)
                    Text(
                        "${sankalp.frequency.describe()} · ${Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            sankalp.intention?.let {
                Text(
                    "“$it”",
                    style = MaterialTheme.typography.bodyMedium,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 14.dp),
                )
            }

            Row(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard("Streak", "${progress.streak}", "d", accent = true, modifier = Modifier.weight(1f))
                StatCard("Kept", "${(progress.rate * 100).toInt()}", "%", modifier = Modifier.weight(1f))
                StatCard("Days", "${progress.done}/${progress.due}", null, modifier = Modifier.weight(1f))
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(extras.cardAlt)
                    .border(1.dp, extras.hairline, RoundedCornerShape(14.dp))
                    .padding(14.dp)
            ) {
                DetailRow("Saṅkalpa day", Dates.formatShort(sankalp.startedOn))
                DetailRow("Ends", sankalp.endsOn?.let { Dates.formatShort(it) } ?: "Ongoing")
                DetailRow("Rhythm", sankalp.frequency.describe())
                DetailRow("Window", Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd))
                DetailRow(
                    "Reminder",
                    if (sankalp.reminder.enabled)
                        "${sankalp.reminder.leadMinutes} min before · snooze ${sankalp.reminder.snoozeMinutes}m"
                    else "Off",
                )
                DetailRow("Next", progress.nextDue?.let { Dates.formatShort(it) } ?: "—")
            }

            if (sankalp.targetCount != null && active) {
                Row(
                    Modifier.fillMaxWidth().padding(top = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Repetitions today", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "$count / ${sankalp.targetCount}",
                            style = MaterialTheme.typography.headlineSmall,
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { onSetCount((count - 9).coerceAtLeast(0)) }, shape = RoundedCornerShape(50)) {
                            Text("−9")
                        }
                        Button(
                            onClick = { onSetCount(count + 1) },
                            shape = RoundedCornerShape(50),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) { Text("+1") }
                    }
                }
            }

            if (active) {
                Button(
                    onClick = { onToggle(sankalp) },
                    modifier = Modifier.fillMaxWidth().height(48.dp).padding(top = 14.dp),
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (doneToday) extras.jade else MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                ) {
                    Text(if (doneToday) "Kept today — undo" else "Mark today as kept")
                }
            }

            Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                    Text("Edit")
                }
                when {
                    active -> OutlinedButton(
                        onClick = { onStatus(Status.PAUSED) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(50),
                    ) { Text("Pause") }
                    sankalp.status == Status.PAUSED -> OutlinedButton(
                        onClick = { onStatus(Status.ACTIVE) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(50),
                    ) { Text("Resume") }
                }
            }

            if (active) {
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onStatus(Status.COMPLETED) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                        Text("Complete")
                    }
                    OutlinedButton(onClick = { onStatus(Status.STOPPED) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                        Text("Stop")
                    }
                }
            }

            TextButton(onClick = onDelete, modifier = Modifier.padding(top = 10.dp)) {
                Text("Delete permanently", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}
