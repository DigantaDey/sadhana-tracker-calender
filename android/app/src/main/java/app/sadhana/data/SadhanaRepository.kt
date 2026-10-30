package app.sadhana.data

import app.sadhana.core.Dates
import app.sadhana.domain.Completion
import app.sadhana.domain.Note
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Schedule
import app.sadhana.domain.Status
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Local-first repository. Room is the only source of truth; there is no account
 * and no server. Everything below is safe to call from a background receiver.
 */
class SadhanaRepository(
    private val db: SadhanaDatabase,
    val settingsStore: SettingsStore,
    private val scope: CoroutineScope,
) {
    val sankalps: StateFlow<List<Sankalp>> = db.sankalps().observeAll()
        .map { list -> list.map { it.toDomain() } }
        .stateIn(scope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val completions: StateFlow<Map<String, Completion>> = db.completions().observeAll()
        .map { list -> list.map { it.toDomain() }.associateBy { it.key() } }
        .stateIn(scope, SharingStarted.WhileSubscribed(5_000), emptyMap())

    val notes: StateFlow<List<Note>> = db.notes().observeAll()
        .map { list -> list.map { it.toDomain() } }
        .stateIn(scope, SharingStarted.WhileSubscribed(5_000), emptyList())

    suspend fun toggle(sankalpId: String, date: String) {
        val existing = db.completions().forDate(date).firstOrNull { it.sankalpId == sankalpId }
        val done = existing?.done != true
        db.completions().upsert(
            CompletionEntity(
                sankalpId = sankalpId,
                date = date,
                done = done,
                count = existing?.count,
                note = existing?.note,
                updatedAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun setCount(sankalpId: String, date: String, count: Int) {
        val existing = db.completions().forDate(date).firstOrNull { it.sankalpId == sankalpId }
        db.completions().upsert(
            CompletionEntity(
                sankalpId = sankalpId,
                date = date,
                done = count > 0 || existing?.done == true,
                count = count,
                note = existing?.note,
                updatedAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun save(sankalp: Sankalp) = db.sankalps().upsert(sankalp.toEntity())

    suspend fun setStatus(id: String, status: Status) = db.sankalps().setStatus(id, status.name)

    suspend fun delete(id: String) {
        db.completions().deleteForSankalp(id)
        db.sankalps().delete(id)
    }

    suspend fun saveNote(note: Note) = db.notes().upsert(note.toEntity())

    suspend fun deleteNote(id: String) = db.notes().deleteById(id)

    suspend fun noteForDate(date: String): Note? = db.notes().byDate(date)?.toDomain()

    suspend fun noteByTitle(title: String): Note? = db.notes().byTitle(title)?.toDomain()

    /** Marks a practice kept from a notification action, without opening the app. */
    fun markKeptFromNotification(sankalpId: String) {
        scope.launch {
            val today = Dates.todayIso()
            val existing = db.completions().forDate(today).firstOrNull { it.sankalpId == sankalpId }
            if (existing?.done != true) toggle(sankalpId, today)
        }
    }

    suspend fun currentSankalps(): List<Sankalp> = sankalps.first()
}
