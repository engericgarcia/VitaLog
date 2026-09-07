package br.com.vitalog.triagem

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.vitalog.triagem.data.TriageRecord
import br.com.vitalog.triagem.data.TriageRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TriageUiState(
    val record: TriageRecord? = null,
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    /** Preenchido quando a rede falhou. Não impede exibir o cache. */
    val networkError: String? = null,
)

class TriageViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = TriageRepository(app)
    private val _state = MutableStateFlow(TriageUiState())
    val state: StateFlow<TriageUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            // Cache primeiro, sempre: a tela tem que aparecer completa antes de
            // qualquer ida à rede, porque a rede pode não existir.
            val cached = repo.cached()
            _state.value = TriageUiState(record = cached, loading = false)
            refresh()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(refreshing = true, networkError = null)
            repo.refresh().fold(
                onSuccess = { _state.value = TriageUiState(record = it, loading = false) },
                onFailure = {
                    // Mantém o registro anterior. Falha de rede não pode apagar
                    // o prontuário que já está no aparelho.
                    _state.value = _state.value.copy(
                        refreshing = false,
                        networkError = it.message ?: "Sem conexão",
                    )
                },
            )
        }
    }
}
