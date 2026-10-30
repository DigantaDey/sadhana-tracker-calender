package app.sadhana.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.CreationExtras
import app.sadhana.AppContainer
import app.sadhana.ai.AiCapability
import app.sadhana.ai.Insight
import app.sadhana.core.Dates
import app.sadhana.domain.Completion
import app.sadhana.domain.Note
import app.sadhana.domain.Sankalp
import app.sadhana.domain.Settings
import app.sadhana.domain.Status
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class UiState(
    val sankalps: List<Sankalp> = emptyList(),
    val completions: Map<String, Completion> = emptyMap(),
    val notes: List<Note> = emptyList(),
    val settings: Settings = Settings(),
    val capability: AiCapability? = null,
    val insights: List<Insight> = emptyList(),
    val today: String = Dates.todayIso(),
) {
    val active: List<Sankalp> get() = sankalps.filter { it.status == Status.ACTIVE }
}

class SadhanaViewModel(private val container: AppContainer) : ViewModel() {

    private val repo = container.repo
    private val ai = container.ai
    private val scheduler = container.scheduler

    private val reflection = MutableStateFlow<String?>(null)
    val reflectionText: StateFlow<String?> = reflection

    val state: StateFlow<UiState> = combine(
        repo.sankalps,
        repo.completions,
        repo.notes,
        repo.settingsStore.settings,
    ) { sankalps, completions, notes, settings ->
        UiState(
            sankalps = sankalps,
            completions = completions,
            notes = notes,
            settings = settings,
            capability = ai.capability(settings.onDeviceAi),
            insights = ai.insights(sankalps, completions, notes),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState())

    fun toggle(sankalpId: String, date: String = Dates.todayIso()) =
        viewModelScope.launch { repo.toggle(sankalpId, date) }

    fun setCount(sankalpId: String, count: Int, date: String = Dates.todayIso()) =
        viewModelScope.launch { repo.setCount(sankalpId, date, count) }

    fun saveSankalp(sankalp: Sankalp) = viewModelScope.launch {
        repo.save(sankalp)
        scheduler.rescheduleAll(repo.currentSankalps())
    }

    fun setStatus(id: String, status: Status) = viewModelScope.launch {
        repo.setStatus(id, status)
        scheduler.rescheduleAll(repo.currentSankalps())
    }

    fun delete(id: String) = viewModelScope.launch { repo.delete(id) }

    fun saveNote(note: Note) = viewModelScope.launch { repo.saveNote(note) }

    fun deleteNote(id: String) = viewModelScope.launch { repo.deleteNote(id) }

    fun updateSettings(transform: (Settings) -> Settings) =
        viewModelScope.launch { repo.settingsStore.update(transform) }

    fun composeReflection() = viewModelScope.launch {
        val s = state.value
        reflection.value = ai.reflect(s.sankalps, s.completions, s.notes, ai.capability(s.settings.onDeviceAi))
    }

    fun snooze(sankalp: Sankalp, minutes: Int) {
        val date = Dates.todayIso()
        scheduler.snooze(sankalp, date, minutes)
    }

    companion object {
        fun factory(container: AppContainer): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(
                    modelClass: Class<T>,
                    extras: CreationExtras,
                ): T = SadhanaViewModel(container) as T
            }
    }
}
