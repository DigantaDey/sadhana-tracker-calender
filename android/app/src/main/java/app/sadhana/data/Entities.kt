package app.sadhana.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "sankalps")
data class SankalpEntity(
    @PrimaryKey val id: String,
    val name: String,
    val intention: String?,
    val category: String,
    val color: String,
    val glyph: String,
    val startedOn: String,
    val endsOn: String?,
    val frequencyJson: String,
    val timeStart: String?,
    val timeEnd: String?,
    val targetCount: Int?,
    val reminderEnabled: Boolean,
    val reminderLeadMinutes: Int,
    val snoozeMinutes: Int,
    val status: String,
    val createdAt: Long,
)

@Entity(
    tableName = "completions",
    primaryKeys = ["sankalpId", "date"],
    indices = [Index("date"), Index("sankalpId")],
)
data class CompletionEntity(
    val sankalpId: String,
    val date: String,
    val done: Boolean,
    val count: Int?,
    val note: String?,
    val updatedAt: Long,
)

@Entity(tableName = "notes", indices = [Index("date", unique = false)])
data class NoteEntity(
    @PrimaryKey val id: String,
    val date: String,
    val title: String,
    val body: String,
    val createdAt: Long,
    val updatedAt: Long,
    val pinned: Boolean,
)
