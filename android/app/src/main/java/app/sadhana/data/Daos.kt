package app.sadhana.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface SankalpDao {
    @Query("SELECT * FROM sankalps ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<SankalpEntity>>

    @Query("SELECT * FROM sankalps WHERE id = :id")
    suspend fun byId(id: String): SankalpEntity?

    @Upsert
    suspend fun upsert(sankalp: SankalpEntity)

    @Query("UPDATE sankalps SET status = :status WHERE id = :id")
    suspend fun setStatus(id: String, status: String)

    @Query("DELETE FROM sankalps WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface CompletionDao {
    @Query("SELECT * FROM completions")
    fun observeAll(): Flow<List<CompletionEntity>>

    @Query("SELECT * FROM completions WHERE date = :date")
    suspend fun forDate(date: String): List<CompletionEntity>

    @Upsert
    suspend fun upsert(completion: CompletionEntity)

    @Query("DELETE FROM completions WHERE sankalpId = :sankalpId")
    suspend fun deleteForSankalp(sankalpId: String)
}

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY pinned DESC, date DESC")
    fun observeAll(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE date = :date LIMIT 1")
    suspend fun byDate(date: String): NoteEntity?

    @Query("SELECT * FROM notes WHERE lower(title) = lower(:title) LIMIT 1")
    suspend fun byTitle(title: String): NoteEntity?

    @Upsert
    suspend fun upsert(note: NoteEntity)

    @Delete
    suspend fun delete(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun deleteById(id: String)
}
