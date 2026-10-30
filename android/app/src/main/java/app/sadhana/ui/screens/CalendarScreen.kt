package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.core.Dates
import app.sadhana.domain.ApproximatePanchang
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Stats
import app.sadhana.ui.UiState
import app.sadhana.ui.components.Chip
import app.sadhana.ui.components.Dot
import app.sadhana.ui.components.GlyphBadge
import app.sadhana.ui.components.Hairline
import app.sadhana.ui.components.SectionHeader
import app.sadhana.ui.theme.LocalSadhanaColors
import app.sadhana.ui.theme.accentFor
import java.time.LocalDate

private enum class CalView(val label: String) { DAY("Day"), WEEK("Week"), MONTH("Month"), YEAR("Year") }

@Composable
fun CalendarScreen(
    state: UiState,
    onToggle: (String, String) -> Unit,
    onOpenDay: (String) -> Unit,
    onCreate: () -> Unit,
) {
    val today = state.today
    var view by remember { mutableStateOf(CalView.MONTH) }
    var anchor by remember { mutableStateOf(today) }
    var selected by remember { mutableStateOf(today) }
    val extras = LocalSadhanaColors.current

    val anchorDate = Dates.parse(anchor)
    val year = anchorDate.year
    val month = anchorDate.monthValue

    fun shift(dir: Long) {
        anchor = when (view) {
            CalView.DAY -> Dates.addDays(anchor, dir).also { selected = it }
            CalView.WEEK -> Dates.addDays(anchor, dir * 7).also { selected = it }
            CalView.MONTH -> Dates.iso(anchorDate.plusMonths(dir))
            CalView.YEAR -> Dates.iso(anchorDate.plusYears(dir))
        }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
    ) {
        item {
            Text("THE LONG VIEW", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Calendar", style = MaterialTheme.typography.displaySmall, modifier = Modifier.padding(top = 2.dp))
        }

        item {
            Row(
                Modifier.fillMaxWidth().padding(top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                CalView.entries.forEach { v ->
                    Chip(v.label, view == v, Modifier.weight(1f)) { view = v }
                }
            }
        }

        item {
            Row(
                Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    when (view) {
                        CalView.YEAR -> "$year"
                        CalView.DAY -> Dates.formatLong(anchor)
                        else -> Dates.monthLabel(anchor)
                    },
                    style = MaterialTheme.typography.titleLarge,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { shift(-1) }) {
                        Icon(Icons.Rounded.ChevronLeft, contentDescription = "Previous")
                    }
                    Text(
                        "Today",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .clip(CircleShape)
                            .clickable { anchor = today; selected = today }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                    IconButton(onClick = { shift(1) }) {
                        Icon(Icons.Rounded.ChevronRight, contentDescription = "Next")
                    }
                }
            }
        }

        when (view) {
            CalView.MONTH -> monthContent(
                state = state,
                year = year,
                month = month,
                today = today,
                selected = selected,
                mondayFirst = state.settings.weekStartsMonday,
                onSelect = { iso ->
                    selected = iso
                    if (Dates.parse(iso).monthValue != month) anchor = iso
                },
            )
            CalView.WEEK -> weekContent(state, anchor, today, selected) { selected = it }
            CalView.DAY -> dayContent(state, anchor, onToggle)
            CalView.YEAR -> yearContent(state, year, month) { iso ->
                anchor = iso
                view = CalView.MONTH
            }
        }

        if (view != CalView.DAY) {
            item { SelectedDayPreview(state, selected, onToggle, onOpenDay) }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.monthContent(
    state: UiState,
    year: Int,
    month: Int,
    today: String,
    selected: String,
    mondayFirst: Boolean,
    onSelect: (String) -> Unit,
) {
    item {
        val first = LocalDate.of(year, month, 1)
        val start = Dates.startOfWeek(Dates.iso(first), mondayFirst)
        val labels = if (mondayFirst) listOf("M", "T", "W", "T", "F", "S", "S")
        else listOf("S", "M", "T", "W", "T", "F", "S")
        Column(Modifier.padding(top = 10.dp)) {
            Row(Modifier.fillMaxWidth()) {
                labels.forEach {
                    Text(
                        it,
                        Modifier.weight(1f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            repeat(6) { row ->
                Row(Modifier.fillMaxWidth()) {
                    repeat(7) { col ->
                        val iso = Dates.addDays(start, (row * 7 + col).toLong())
                        DayCell(
                            iso = iso,
                            state = state,
                            today = today,
                            selected = selected,
                            outside = Dates.parse(iso).monthValue != month,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelect(iso) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    iso: String,
    state: UiState,
    today: String,
    selected: String,
    outside: Boolean,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    val list = Schedule.scheduledOn(state.sankalps, iso)
    val isSelected = iso == selected
    Column(
        modifier
            .padding(1.5.dp)
            .aspectRatio(1f)
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) MaterialTheme.colorScheme.onSurface else androidx.compose.ui.graphics.Color.Transparent)
            .border(
                1.dp,
                if (iso == today) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent,
                RoundedCornerShape(10.dp),
            )
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "${Dates.parse(iso).dayOfMonth}",
            fontSize = 13.5.sp,
            fontWeight = if (iso == today) FontWeight.Bold else FontWeight.Medium,
            color = when {
                isSelected -> MaterialTheme.colorScheme.background
                outside -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f)
                iso == today -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface
            },
        )
        Spacer(Modifier.height(3.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            list.take(3).forEach { s ->
                val done = Schedule.isDone(state.completions, s.id, iso)
                Box(
                    Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.background.copy(alpha = if (done) 1f else 0.4f)
                            else accentFor(s.color).copy(alpha = if (done) 1f else 0.4f)
                        )
                )
            }
            if (list.isEmpty()) Spacer(Modifier.size(4.dp))
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.weekContent(
    state: UiState,
    anchor: String,
    today: String,
    selected: String,
    onSelect: (String) -> Unit,
) {
    item {
        val start = Dates.startOfWeek(anchor, state.settings.weekStartsMonday)
        Row(
            Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            (0..6).forEach { i ->
                val iso = Dates.addDays(start, i.toLong())
                val list = Schedule.scheduledOn(state.sankalps, iso)
                val extras = LocalSadhanaColors.current
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (iso == selected) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface)
                        .border(
                            1.dp,
                            if (iso == selected) MaterialTheme.colorScheme.onSurface else extras.hairline,
                            RoundedCornerShape(14.dp),
                        )
                        .clickable { onSelect(iso) }
                        .padding(vertical = 9.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        listOf("S", "M", "T", "W", "T", "F", "S")[Dates.weekday(iso)],
                        fontSize = 9.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "${Dates.parse(iso).dayOfMonth}",
                        fontSize = 14.sp,
                        color = if (iso == today) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(6.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        list.take(4).forEach { s ->
                            Box(
                                Modifier
                                    .size(width = 16.dp, height = 6.dp)
                                    .clip(CircleShape)
                                    .background(
                                        accentFor(s.color).copy(
                                            alpha = if (Schedule.isDone(state.completions, s.id, iso)) 1f else 0.28f
                                        )
                                    )
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.dayContent(
    state: UiState,
    iso: String,
    onToggle: (String, String) -> Unit,
) {
    val list = Schedule.scheduledOn(state.sankalps, iso)
    item {
        Column(Modifier.padding(top = 14.dp)) {
            Text(
                ApproximatePanchang.tithiName(Dates.parse(iso)),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            if (list.isEmpty()) {
                Text(
                    "A clear day. Rest is also a practice.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                list.forEach { s ->
                    ListRow(
                        sankalp = s,
                        done = Schedule.isDone(state.completions, s.id, iso),
                        onToggle = { onToggle(s.id, iso) },
                    )
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.yearContent(
    state: UiState,
    year: Int,
    currentMonth: Int,
    onPickMonth: (String) -> Unit,
) {
    item {
        Column(Modifier.padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            (1..12).chunked(3).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { m ->
                        MiniMonth(state, year, m, currentMonth, Modifier.weight(1f)) {
                            onPickMonth(Dates.iso(LocalDate.of(year, m, 1)))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MiniMonth(
    state: UiState,
    year: Int,
    month: Int,
    currentMonth: Int,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (month == currentMonth) extras.accentSoft else MaterialTheme.colorScheme.surface
            )
            .border(1.dp, extras.hairline, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Text(
            Dates.parse(Dates.iso(LocalDate.of(year, month, 1))).month.name.take(3),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(5.dp))
        (0 until 6).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                (0..6).forEach { d ->
                    val dayOfMonth = week * 7 + d + 1
                    val inMonth = dayOfMonth <= Dates.daysInMonth(year, month)
                    val tally = if (inMonth) Stats.tally(state.sankalps, state.completions, Dates.iso(LocalDate.of(year, month, dayOfMonth))) else null
                    Box(
                        Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                when {
                                    !inMonth -> androidx.compose.ui.graphics.Color.Transparent
                                    tally == null || tally.due == 0 -> MaterialTheme.colorScheme.surfaceVariant
                                    tally.ratio >= 1f -> MaterialTheme.colorScheme.primary
                                    tally.ratio > 0f -> MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                }
                            )
                    )
                }
            }
            Spacer(Modifier.height(2.dp))
        }
    }
}

@Composable
private fun SelectedDayPreview(
    state: UiState,
    selected: String,
    onToggle: (String, String) -> Unit,
    onOpenDay: (String) -> Unit,
) {
    val list = Schedule.scheduledOn(state.sankalps, selected)
    val done = list.count { Schedule.isDone(state.completions, it.id, selected) }
    Column(Modifier.padding(top = 24.dp)) {
        SectionHeader("Selected day") {
            Text(
                "Details",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { onOpenDay(selected) },
            )
        }
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, LocalSadhanaColors.current.hairline, RoundedCornerShape(18.dp))
                .padding(14.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(Dates.formatLong(selected), style = MaterialTheme.typography.titleMedium)
                    Text(
                        ApproximatePanchang.tithiName(Dates.parse(selected)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text("$done/${list.size}", style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.height(10.dp))
            Hairline()
            Spacer(Modifier.height(10.dp))
            if (list.isEmpty()) {
                Text(
                    "Nothing scheduled. Add a one-time anuṣṭhāna from the Sankalp tab.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    list.forEach { s ->
                        ListRow(
                            sankalp = s,
                            done = Schedule.isDone(state.completions, s.id, selected),
                            onToggle = { onToggle(s.id, selected) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ListRow(sankalp: Sankalp, done: Boolean, onToggle: () -> Unit) {
    val extras = LocalSadhanaColors.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        GlyphBadge(sankalp.glyph, accentFor(sankalp.color), size = 28.dp, fontSize = 12)
        Column(Modifier.weight(1f).padding(start = 10.dp)) {
            Text(
                sankalp.name,
                style = MaterialTheme.typography.bodyMedium,
                color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
            Text(
                Dates.prettyWindow(sankalp.timeStart, sankalp.timeEnd),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Box(
            Modifier
                .size(26.dp)
                .clip(CircleShape)
                .background(if (done) extras.jade else androidx.compose.ui.graphics.Color.Transparent)
                .border(1.5.dp, if (done) extras.jade else extras.hairline, CircleShape)
                .clickable { onToggle() },
            contentAlignment = Alignment.Center,
        ) {
            if (done) Icon(Icons.Rounded.Check, null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(14.dp))
        }
        Spacer(Modifier.size(2.dp))
        Dot(active = false, size = 0.dp)
    }
}
