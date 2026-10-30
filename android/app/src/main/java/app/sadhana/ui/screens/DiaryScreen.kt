package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import app.sadhana.domain.Note
import app.sadhana.ui.UiState
import app.sadhana.ui.components.EmptyState
import app.sadhana.ui.theme.LocalSadhanaColors
import app.sadhana.util.Markdown

@Composable
fun DiaryScreen(
    state: UiState,
    onSaveNote: (Note) -> Unit,
    onDeleteNote: (String) -> Unit,
) {
    var editing by remember { mutableStateOf<Note?>(null) }
    var query by remember { mutableStateOf("") }
    val extras = LocalSadhanaColors.current

    val note = editing
    if (note != null) {
        NoteEditor(
            note = note,
            onClose = { editing = null },
            onSave = { onSaveNote(it); editing = null },
            onDelete = { onDeleteNote(it.id); editing = null },
        )
        return
    }

    val filtered = state.notes
        .filter {
            query.isBlank() ||
                it.title.contains(query, true) ||
                it.body.contains(query, true)
        }
        .sortedWith(compareByDescending<Note> { it.pinned }.thenByDescending { it.date })

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("SVĀDHYĀYA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Diary", style = MaterialTheme.typography.displaySmall)
                }
                IconButton(onClick = {
                    editing = Note(
                        id = "note-" + java.util.UUID.randomUUID().toString().take(8),
                        date = state.today,
                        title = "",
                        body = "",
                    )
                }) {
                    Icon(Icons.Rounded.Add, contentDescription = "New note")
                }
            }
        }

        item {
            Text(
                "Plain markdown, kept on this device. Link entries with [[double brackets]] — they become a web you can walk back through.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search entries") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                shape = RoundedCornerShape(12.dp),
            )
        }

        if (filtered.isEmpty()) {
            item { EmptyState("No entries yet", "Today is a good day to start — three honest sentences will do.") }
        }

        items(filtered.size) { index ->
            val n = filtered[index]
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, extras.hairline, RoundedCornerShape(14.dp))
                    .clickable { editing = n }
                    .padding(14.dp)
            ) {
                Text(
                    Dates.formatLong(n.date).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    n.title.ifBlank { Dates.formatLong(n.date) },
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 3.dp),
                )
                Text(
                    Markdown.excerpt(n.body),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    modifier = Modifier.padding(top = 3.dp),
                )
                val tags = Markdown.tags(n.body)
                if (tags.isNotEmpty()) {
                    Text(
                        tags.joinToString("  ") { "#$it" },
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }

        item {
            Text(
                "${state.notes.size} entries · stored locally",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

@Composable
private fun NoteEditor(
    note: Note,
    onClose: () -> Unit,
    onSave: (Note) -> Unit,
    onDelete: (Note) -> Unit,
) {
    var title by remember(note.id) { mutableStateOf(note.title) }
    var body by remember(note.id) { mutableStateOf(note.body) }
    var preview by remember(note.id) { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            IconButton(onClick = { onSave(note.copy(title = title.trim().ifBlank { Dates.formatLong(note.date) }, body = body)) }) {
                Icon(Icons.Rounded.ArrowBack, contentDescription = "Back")
            }
            Text(
                Dates.formatLong(note.date).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row {
                TextButton(onClick = { preview = !preview }) {
                    Text(if (preview) "Edit" else "Preview", style = MaterialTheme.typography.labelLarge)
                }
                IconButton(onClick = { onDelete(note) }) {
                    Icon(Icons.Rounded.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
        }

        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).weight(1f)) {
            if (preview) {
                Text(
                    title.ifBlank { "Untitled" },
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
                Markdown.Render(body, Modifier.fillMaxWidth())
            } else {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("Title") },
                    textStyle = MaterialTheme.typography.headlineSmall,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    placeholder = { Text("What did the practice feel like today? Link an entry with [[its title]], tag it with #steadiness.") },
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    textStyle = MaterialTheme.typography.bodyLarge,
                )
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(20.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            TextButton(onClick = { onSave(note.copy(title = title.trim().ifBlank { Dates.formatLong(note.date) }, body = body)) }) {
                Text("Save", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
