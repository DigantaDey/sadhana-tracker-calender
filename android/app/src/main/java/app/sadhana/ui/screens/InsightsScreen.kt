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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.ai.AiTier
import app.sadhana.core.Dates
import app.sadhana.domain.Stats
import app.sadhana.ui.UiState
import app.sadhana.ui.components.Hairline
import app.sadhana.ui.components.SectionHeader
import app.sadhana.ui.components.StatCard
import app.sadhana.ui.theme.LocalSadhanaColors

@Composable
fun InsightsScreen(
    state: UiState,
    reflection: String?,
    onReflect: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    val cap = state.capability
    val streak = Stats.currentStreak(state.sankalps, state.completions, state.today)
    val best = Stats.longestStreak(state.sankalps, state.completions, Dates.addDays(state.today, -140), state.today)
    val kept = state.completions.values.count { it.done }
    val weeks = (90 downTo 0).map { Dates.addDays(state.today, -it.toLong()) }

    LazyColumn(
        Modifier.fillMaxWidth(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("PATTERNS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Insights", style = MaterialTheme.typography.displaySmall, modifier = Modifier.padding(top = 2.dp))
        }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(extras.accentSoft)
                    .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f), RoundedCornerShape(18.dp))
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                    Text(
                        if (cap?.tier == AiTier.RULES) "  ON-DEVICE PATTERNS" else "  ON-DEVICE INTELLIGENCE",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    cap?.engine ?: "Detecting…",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Text(
                    cap?.detail ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    reflection ?: "A reflection written from your own records — practice kept, weeks missed, and what your diary keeps returning to.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (reflection == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                )
                TextButton(onClick = onReflect, modifier = Modifier.padding(top = 4.dp)) {
                    Text(
                        if (reflection == null) "Compose a reflection" else "Write another",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Text(
                    "Nothing is uploaded. Without a supported model the same reflection is written from local statistics.",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard("Current", "$streak", "d", "unbroken", accent = true, modifier = Modifier.weight(1f))
                StatCard("Longest", "$best", "d", "run", modifier = Modifier.weight(1f))
                StatCard("Kept", "$kept", null, "practices", modifier = Modifier.weight(1f))
            }
        }

        item { SectionHeader("Thirteen weeks", Modifier.padding(top = 16.dp)) }
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, extras.hairline, RoundedCornerShape(18.dp))
                    .padding(14.dp)
            ) {
                (0 until 13).forEach { w ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 1.5.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        (0..6).forEach { d ->
                            val iso = weeks.getOrNull(w * 7 + d)
                            val tally = iso?.let { Stats.tally(state.sankalps, state.completions, it) }
                            Box(
                                Modifier
                                    .weight(1f)
                                    .height(11.dp)
                                    .clip(RoundedCornerShape(2.5.dp))
                                    .background(
                                        when {
                                            tally == null || tally.due == 0 -> MaterialTheme.colorScheme.surfaceVariant
                                            tally.ratio >= 1f -> MaterialTheme.colorScheme.primary
                                            tally.ratio > 0f -> MaterialTheme.colorScheme.primary.copy(alpha = 0.25f + tally.ratio * 0.55f)
                                            else -> MaterialTheme.colorScheme.surfaceVariant
                                        }
                                    )
                            )
                        }
                    }
                }
                Text(
                    "Each square is a day. A day with nothing due stays pale — rest is not a failure.",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }

        item { SectionHeader("What the data says", Modifier.padding(top = 16.dp)) }
        items(state.insights.size) { index ->
            val insight = state.insights[index]
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, extras.hairline, RoundedCornerShape(14.dp))
                    .padding(14.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    Modifier
                        .size(26.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("◈", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                }
                Column(Modifier.padding(start = 10.dp)) {
                    Text(insight.title, style = MaterialTheme.typography.titleSmall)
                    Text(
                        insight.body,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }

        item {
            Column(Modifier.padding(top = 16.dp).clickable { onOpenSettings() }) {
                Hairline()
                Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("On-device model settings", style = MaterialTheme.typography.titleMedium)
                        Text(
                            (if (cap?.eligible == true) "Eligible · " else "Not eligible · ") + (cap?.reason ?: ""),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text("→", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        item {
            Text(
                "AI here is deliberately small: summaries, gentle nudges, search over your own notes. No advice that pretends to be a guru.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
    }
}
