package app.sadhana.ui.sheets

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.core.Dates
import app.sadhana.domain.Category
import app.sadhana.domain.ColorKey
import app.sadhana.domain.Frequency
import app.sadhana.domain.Reminder
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Status
import app.sadhana.domain.TithiNames
import app.sadhana.ui.components.Chip
import app.sadhana.ui.components.GlyphBadge
import app.sadhana.ui.components.SectionHeader
import app.sadhana.ui.theme.LocalSadhanaColors

private val GLYPHS = listOf("ॐ", "✦", "✶", "॥", "☸", "❋", "✿", "❂", "❁", "◈", "✧", "☀")
private val DURATIONS = listOf(21, 40, 108, 365)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSankalpSheet(
    existing: Sankalp?,
    today: String,
    defaultLead: Int,
    defaultSnooze: Int,
    onDismiss: () -> Unit,
    onSave: (Sankalp) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val extras = LocalSadhanaColors.current

    var name by remember { mutableStateOf(existing?.name ?: "") }
    var intention by remember { mutableStateOf(existing?.intention ?: "") }
    var category by remember { mutableStateOf(existing?.category ?: Category.JAPA) }
    var color by remember { mutableStateOf(existing?.color ?: ColorKey.SAFFRON) }
    var glyph by remember { mutableStateOf(existing?.glyph ?: "ॐ") }
    var start by remember { mutableStateOf(existing?.startedOn ?: today) }
    var duration by remember { mutableStateOf(existing?.let { if (it.endsOn != null) 40 else 0 } ?: 40) }
    var freqKind by remember { mutableStateOf(existing?.frequency?.let { kindOf(it) } ?: 0) }
    var weekdays by remember { mutableStateOf((existing?.frequency as? Frequency.Weekly)?.days ?: listOf(1, 2, 3, 4, 5)) }
    var tithi by remember { mutableStateOf((existing?.frequency as? Frequency.Tithi)?.tithi ?: 11) }
    var monthlyDay by remember { mutableStateOf((existing?.frequency as? Frequency.Monthly)?.day ?: 1) }
    var useTime by remember { mutableStateOf(existing?.timeStart != null) }
    var startTime by remember { mutableStateOf(existing?.timeStart ?: "06:00") }
    var endTime by remember { mutableStateOf(existing?.timeEnd ?: "") }
    var useTarget by remember { mutableStateOf(existing?.targetCount != null) }
    var target by remember { mutableStateOf(existing?.targetCount ?: 108) }
    var reminderOn by remember { mutableStateOf(existing?.reminder?.enabled ?: true) }
    var lead by remember { mutableStateOf(existing?.reminder?.leadMinutes ?: defaultLead) }
    var snooze by remember { mutableStateOf(existing?.reminder?.snoozeMinutes ?: defaultSnooze) }

    val endsOn = when {
        freqKind == 4 -> null
        duration == 0 -> null
        else -> Dates.addDays(start, (duration - 1).toLong())
    }

    val frequency: Frequency = when (freqKind) {
        1 -> Frequency.Weekly(weekdays.sorted())
        2 -> Frequency.Monthly(monthlyDay)
        3 -> Frequency.Tithi(tithi)
        else -> Frequency.Daily
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
        ) {
            Text(
                if (existing == null) "Take a saṅkalpa" else "Edit saṅkalpa",
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                "A vow with edges: when it starts, how often it returns, and when it rests.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("What is this practice called?") },
                placeholder = { Text("Gāyatrī Japa") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )

            SectionHeader("Kind of practice", Modifier.padding(top = 18.dp))
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Category.entries.forEach { c ->
                    Chip("${c.glyph} ${c.label}", category == c) {
                        category = c
                        glyph = c.glyph
                    }
                }
            }

            SectionHeader("Mark", Modifier.padding(top = 18.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                GlyphBadge(glyph, extras.accentSoft.let { MaterialTheme.colorScheme.primary }, size = 44.dp, fontSize = 20)
                Row(
                    Modifier.padding(start = 10.dp).horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    GLYPHS.forEach { g ->
                        Box(
                            Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(11.dp))
                                .background(if (glyph == g) extras.accentSoft else MaterialTheme.colorScheme.surface)
                                .border(1.dp, if (glyph == g) MaterialTheme.colorScheme.primary else extras.hairline, RoundedCornerShape(11.dp))
                                .clickable { glyph = g },
                            contentAlignment = Alignment.Center,
                        ) { Text(g, fontSize = 17.sp) }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                ColorKey.entries.forEach { c ->
                    Box(
                        Modifier
                            .size(30.dp)
                            .clip(CircleShape)
                            .background(androidx.compose.ui.graphics.Color(if (extras.isDark) c.dark else c.light))
                            .border(
                                if (color == c) 2.dp else 0.dp,
                                if (color == c) MaterialTheme.colorScheme.background else androidx.compose.ui.graphics.Color.Transparent,
                                CircleShape,
                            )
                            .clickable { color = c }
                    )
                }
            }

            OutlinedTextField(
                value = intention,
                onValueChange = { intention = it },
                label = { Text("The vow, in your own words (optional)") },
                shape = RoundedCornerShape(12.dp),
                minLines = 2,
                modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            )

            SectionHeader("Saṅkalpa day", Modifier.padding(top = 18.dp))
            OutlinedTextField(
                value = start,
                onValueChange = { start = it },
                label = { Text("YYYY-MM-DD") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionHeader("How long is the vow?", Modifier.padding(top = 18.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DURATIONS.forEach { d ->
                    Chip("$d days", duration == d) { duration = d }
                }
                Chip("Ongoing", duration == 0) { duration = 0 }
            }
            Text(
                if (endsOn != null) "Runs until $endsOn" else "No end date — close it whenever you choose.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )

            SectionHeader("Rhythm", Modifier.padding(top = 18.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Every day", "Weekly", "Monthly", "By tithi", "Ongoing").forEachIndexed { i, label ->
                    Chip(label, freqKind == i) { freqKind = i }
                }
            }
            if (freqKind == 1) {
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("S", "M", "T", "W", "T", "F", "S").forEachIndexed { i, d ->
                        Chip(d, weekdays.contains(i)) {
                            weekdays = if (weekdays.contains(i)) weekdays - i else weekdays + i
                        }
                    }
                }
            }
            if (freqKind == 2) {
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(1, 5, 8, 11, 15).forEach { d -> Chip("Day $d", monthlyDay == d) { monthlyDay = d } }
                }
            }
            if (freqKind == 3) {
                Row(
                    Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    (1..30).forEach { t ->
                        Chip(if (t <= 15) "Śukla ${TithiNames.names[t - 1]}" else "Kṛṣṇa ${TithiNames.names[t - 1]}", tithi == t) { tithi = t }
                    }
                }
                Text(
                    "Tithi is computed locally from the moon's elongation and may differ by a few hours from your pañcāṅga.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Practice window", style = MaterialTheme.typography.titleSmall)
                Switch(checked = useTime, onCheckedChange = { useTime = it })
            }
            if (useTime) {
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = startTime,
                        onValueChange = { startTime = it },
                        label = { Text("Starts") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = endTime,
                        onValueChange = { endTime = it },
                        label = { Text("Ends (optional)") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Count target", style = MaterialTheme.typography.titleSmall)
                Switch(checked = useTarget, onCheckedChange = { useTarget = it })
            }
            if (useTarget) {
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(27, 54, 108, 1008).forEach { n -> Chip("$n", target == n) { target = n } }
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Remind me", style = MaterialTheme.typography.titleSmall)
                Switch(checked = reminderOn, onCheckedChange = { reminderOn = it })
            }
            if (reminderOn) {
                Row(Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(0, 10, 15, 30, 60, 120).forEach { m ->
                        Chip(if (m == 0) "At start" else if (m < 60) "$m min" else "${m / 60} hr", lead == m) { lead = m }
                    }
                }
                Spacer(Modifier.height(6.dp))
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(5, 15, 30, 60).forEach { m ->
                        Chip("Snooze ${m}m", snooze == m) { snooze = m }
                    }
                }
            }

            Spacer(Modifier.height(22.dp))
            Button(
                onClick = {
                    val sankalp = Sankalp(
                        id = existing?.id
                            ?: "sk-" + java.util.UUID.randomUUID().toString().take(8),
                        name = name.trim().ifBlank { "${category.label} sādhana" },
                        intention = intention.trim().ifBlank { null },
                        category = category,
                        color = color,
                        glyph = glyph,
                        startedOn = start,
                        endsOn = endsOn,
                        frequency = frequency,
                        timeStart = if (useTime) startTime else null,
                        timeEnd = if (useTime) endTime.ifBlank { null } else null,
                        targetCount = if (useTarget) target else null,
                        reminder = Reminder(reminderOn, lead, snooze),
                        status = existing?.status ?: Status.ACTIVE,
                        createdAt = existing?.createdAt ?: System.currentTimeMillis(),
                    )
                    onSave(sankalp)
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) {
                Text(
                    if (existing == null) "Begin the vow" else "Save changes",
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

private fun kindOf(f: Frequency): Int = when (f) {
    is Frequency.Daily -> 0
    is Frequency.Weekly -> 1
    is Frequency.Monthly -> 2
    is Frequency.Tithi -> 3
    is Frequency.Once -> 4
    is Frequency.Yearly -> 4
}
