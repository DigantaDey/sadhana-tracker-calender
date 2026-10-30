package app.sadhana.data

import app.sadhana.domain.Category
import app.sadhana.domain.ColorKey
import app.sadhana.domain.Completion
import app.sadhana.domain.Frequency
import app.sadhana.domain.Note
import app.sadhana.domain.Reminder
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Status
import app.sadhana.domain.Schedule
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

fun SankalpEntity.toDomain(): Sankalp = Sankalp(
    id = id,
    name = name,
    intention = intention,
    category = runCatching { Category.valueOf(category) }.getOrDefault(Category.JAPA),
    color = runCatching { ColorKey.valueOf(color) }.getOrDefault(ColorKey.SAFFRON),
    glyph = glyph,
    startedOn = startedOn,
    endsOn = endsOn,
    frequency = runCatching { json.decodeFromString<Frequency>(frequencyJson) }
        .getOrDefault(Frequency.Daily),
    timeStart = timeStart,
    timeEnd = timeEnd,
    targetCount = targetCount,
    reminder = Reminder(reminderEnabled, reminderLeadMinutes, snoozeMinutes),
    status = runCatching { Status.valueOf(status) }.getOrDefault(Status.ACTIVE),
    createdAt = createdAt,
)

fun Sankalp.toEntity(): SankalpEntity = SankalpEntity(
    id = id,
    name = name,
    intention = intention,
    category = category.name,
    color = color.name,
    glyph = glyph,
    startedOn = startedOn,
    endsOn = endsOn,
    frequencyJson = json.encodeToString(Frequency.serializer(), frequency),
    timeStart = timeStart,
    timeEnd = timeEnd,
    targetCount = targetCount,
    reminderEnabled = reminder.enabled,
    reminderLeadMinutes = reminder.leadMinutes,
    snoozeMinutes = reminder.snoozeMinutes,
    status = status.name,
    createdAt = createdAt,
)

fun CompletionEntity.toDomain(): Completion =
    Completion(sankalpId, date, done, count, note, updatedAt)

fun Completion.toEntity(): CompletionEntity =
    CompletionEntity(sankalpId, date, done, count, note, updatedAt)

fun Completion.key(): String = Schedule.key(sankalpId, date)

fun NoteEntity.toDomain(): Note = Note(id, date, title, body, createdAt, updatedAt, pinned)

fun Note.toEntity(): NoteEntity = NoteEntity(id, date, title, body, createdAt, updatedAt, pinned)
