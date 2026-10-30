package app.sadhana.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [SankalpEntity::class, CompletionEntity::class, NoteEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class SadhanaDatabase : RoomDatabase() {
    abstract fun sankalps(): SankalpDao
    abstract fun completions(): CompletionDao
    abstract fun notes(): NoteDao

    companion object {
        @Volatile
        private var instance: SadhanaDatabase? = null

        fun get(context: Context): SadhanaDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    SadhanaDatabase::class.java,
                    "sadhana.db",
                )
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .build()
                    .also { instance = it }
            }
    }
}
