package br.com.vitalog.triagem.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import br.com.vitalog.triagem.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL

private val Context.dataStore by preferencesDataStore(name = "triagem")
private val RECORD_KEY = stringPreferencesKey("record_json")

/**
 * Guarda o prontuário localmente e o atualiza quando há rede.
 *
 * A ordem importa e é o motivo do app existir: o cache é a fonte primária, a
 * rede é o complemento. Numa emergência sem sinal — que é exatamente quando
 * esta tela é necessária — o caminho de rede simplesmente não acontece, e a
 * tela precisa continuar completa.
 *
 * Por isso a falha de rede nunca apaga o que está guardado. Prontuário velho é
 * infinitamente melhor que tela vazia; o que a interface faz é dizer a idade
 * dele com honestidade.
 */
class TriageRepository(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }

    suspend fun cached(): TriageRecord? = withContext(Dispatchers.IO) {
        // `first()` e não `collect`: o Flow do DataStore fica aberto observando
        // mudanças, e coletá-lo aqui travaria a leitura para sempre.
        val raw = context.dataStore.data.first()[RECORD_KEY]
        raw?.let { runCatching { json.decodeFromString<TriageRecord>(it) }.getOrNull() }
    }

    suspend fun refresh(): Result<TriageRecord> = withContext(Dispatchers.IO) {
        runCatching {
            val conn = (URL("${BuildConfig.API_BASE}/api/emergencia").openConnection()
                    as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8_000
                readTimeout = 8_000
                setRequestProperty("Accept", "application/json")
            }
            try {
                if (conn.responseCode !in 200..299) {
                    error("Servidor respondeu ${conn.responseCode}")
                }
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val record = json.decodeFromString<TriageRecord>(body)
                // Só grava depois de desserializar: resposta malformada não
                // pode substituir um cache bom.
                context.dataStore.edit { it[RECORD_KEY] = body }
                record
            } finally {
                conn.disconnect()
            }
        }
    }
}
