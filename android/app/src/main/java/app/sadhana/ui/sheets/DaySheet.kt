package app.sadhana.ui.sheets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.sadhana.core.Dates
import app.sadhana.domain.ApproximatePanchang
import app.sadhana.domain.Schedule
import app.sadhana.domain.Stats
import app.sadhana.ui.UiState
import app.sadhana.ui.components.EmptyState
import app.sadhana.ui.screens.ListRow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DaySheet(
    date: String,
    state: UiState,
    onDismiss: () -> Unit,
    onToggle: (String) -> Unit,
    onCreate: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val list = Schedule.scheduledOn(state.sankalps, date)
    val tally = Stats.tally(state.sankalps, state.completions, date)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 26.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column {
                    Text(Dates.formatLong(date).uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(Dates.formatShort(date), style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 2.dp))
                    Text(
                        ApproximatePanchang.tithiName(Dates.parse(date)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${tally.done}/${tally.due}", style = MaterialTheme.typography.headlineSmall)
                    Text("KEPT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(16.dp))

            if (list.isEmpty()) {
                EmptyState("A clear day", "Rest is also a practice.")
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    list.forEach { sankalp ->
                        ListRow(
                            sankalp = sankalp,
                            done = Schedule.isDone(state.completions, sankalp.id, date),
                            onToggle = { onToggle(sankalp.id) },
                        )
                    }
                }
            }

            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onCreate, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                    Text("Anuṣṭhāna")
                }
                Button(onClick = onDismiss, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                    Text("Done")
                }
            }
        }
    }
}
