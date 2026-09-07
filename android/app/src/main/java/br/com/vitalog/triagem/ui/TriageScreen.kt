package br.com.vitalog.triagem.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.vitalog.triagem.TriageUiState
import br.com.vitalog.triagem.data.*
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val BR = DateTimeFormatter.ofPattern("dd/MM/yyyy")

private fun fmt(iso: String?): String =
    iso?.let { runCatching { LocalDate.parse(it).format(BR) }.getOrNull() } ?: "data não informada"

private fun ageFrom(iso: String?): Int? =
    iso?.let {
        runCatching {
            Duration.between(LocalDate.parse(it).atStartOfDay(), LocalDate.now().atStartOfDay())
                .toDays().div(365.2425).toInt()
        }.getOrNull()
    }

/** Quanto tempo faz que o prontuário veio do servidor, em linguagem simples. */
private fun freshness(iso: String): String = runCatching {
    val mins = Duration.between(Instant.parse(iso), Instant.now()).toMinutes()
    when {
        mins < 2 -> "sincronizado agora"
        mins < 60 -> "sincronizado há $mins min"
        mins < 60 * 24 -> "sincronizado há ${mins / 60} h"
        else -> "sincronizado há ${mins / (60 * 24)} dias"
    }
}.getOrDefault("data de sincronização desconhecida")

@Composable
private fun Card(title: String, count: Int? = null, body: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            if (count != null && count > 0) {
                Spacer(Modifier.width(6.dp))
                Text("$count", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(12.dp))
        body()
    }
}

/**
 * Bloco de "não há registro".
 *
 * Mesma regra da versão web, e é a mais importante desta tela: campo vazio em
 * triagem é lido como "esta pessoa não tem", quando na verdade diz "ninguém
 * registrou". Nunca fica vazio — declara a ignorância.
 */
@Composable
private fun NoRecord(what: String) {
    Text(
        "Nenhum registro de $what. Ausência de registro não é ausência de $what — confirme com o paciente.",
        fontSize = 13.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(12.dp),
    )
}

@Composable
private fun AllergyRow(a: Allergy) {
    val severe = a.severity == "anafilaxia" || a.severity == "grave"
    val tint = if (severe) highColor() else MaterialTheme.colorScheme.onSurface
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(
                if (severe) highColor().copy(alpha = 0.08f)
                else MaterialTheme.colorScheme.surfaceVariant
            )
            .border(
                1.dp,
                if (severe) highColor().copy(alpha = 0.5f) else Color.Transparent,
                RoundedCornerShape(10.dp),
            )
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (severe) {
                Text("▲ ", color = tint, fontSize = 14.sp)
            }
            Text(a.substance, fontWeight = FontWeight.SemiBold, color = tint, fontSize = 16.sp)
            Spacer(Modifier.width(8.dp))
            Text(
                a.severity.uppercase(),
                fontSize = 11.sp,
                color = tint.copy(alpha = 0.85f),
            )
        }
        a.reaction?.let {
            Spacer(Modifier.height(2.dp))
            Text(it, fontSize = 13.sp, color = tint.copy(alpha = 0.9f))
        }
        Spacer(Modifier.height(2.dp))
        Text(
            "${a.category} · registrado em ${fmt(a.notedAt)}",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun TriageScreen(state: TriageUiState, onRefresh: () -> Unit) {
    val record = state.record

    if (state.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (record == null) {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Prontuário ainda não baixado", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                state.networkError
                    ?: "Conecte-se uma vez para guardar o prontuário no aparelho. Depois disso ele funciona sem sinal.",
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(20.dp))
            Button(onClick = onRefresh) { Text("Tentar de novo") }
        }
        return
    }

    val p = record.patient
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "TRIAGEM · DADOS CRÍTICOS",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = highColor(),
        )
        Text(p.name, fontSize = 28.sp, fontWeight = FontWeight.SemiBold)
        Text(
            listOfNotNull(
                ageFrom(p.birthDate)?.let { "$it anos" },
                p.birthDate?.let { "nascida em ${fmt(it)}" },
            ).joinToString(" · "),
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Estado da cópia local. Numa emergência importa saber se o dado é de
        // hoje ou de seis meses atrás, e o app não pode fingir que está online.
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                freshness(record.syncedAt),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (state.networkError != null) {
                Text(
                    " · offline",
                    fontSize = 12.sp,
                    color = highColor(),
                )
            }
            Spacer(Modifier.weight(1f))
            TextButton(onClick = onRefresh, enabled = !state.refreshing) {
                Text(if (state.refreshing) "Atualizando…" else "Atualizar")
            }
        }

        Card("Tipo sanguíneo") {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    p.bloodType ?: "—",
                    fontSize = 40.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    when {
                        p.bloodType == null -> "não registrado"
                        p.bloodTypeSource == "laboratorio" -> "confirmado por laboratório"
                        p.bloodTypeSource == "carteira" -> "copiado da carteirinha"
                        else -> "informado pelo paciente"
                    },
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
            }
            // Três estados, e só o do meio recebe o aviso de transfusão.
            if (p.bloodType == null) {
                Spacer(Modifier.height(10.dp))
                NoRecord("tipo sanguíneo")
            } else if (p.bloodTypeSource != "laboratorio") {
                Spacer(Modifier.height(10.dp))
                Text(
                    "▲ Origem não laboratorial — não use para transfundir. Refaça a tipagem.",
                    fontSize = 13.sp,
                    color = highColor(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(highColor().copy(alpha = 0.08f))
                        .padding(12.dp),
                )
            }
        }

        Card("Alergias", record.allergies.size) {
            if (record.allergies.isEmpty()) NoRecord("alergia")
            else Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                record.allergies.forEach { AllergyRow(it) }
            }
        }

        Card("Dispositivos implantados", record.devices.size) {
            if (record.devices.isEmpty()) NoRecord("dispositivo implantado")
            else Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                record.devices.forEach { d ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(12.dp),
                    ) {
                        Text(d.name, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                        Text(
                            listOfNotNull(d.manufacturer, d.model).joinToString(" ")
                                .ifBlank { "fabricante não informado" } +
                                " · implantado em ${fmt(d.implantedAt)}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(4.dp))
                        // "Não se sabe" grita tanto quanto "não pode".
                        when (d.mriSafe) {
                            true -> Text("● Compatível com ressonância", fontSize = 13.sp, color = normalColor())
                            false -> Text("▲ NÃO fazer ressonância", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = highColor())
                            null -> Text("▲ Compatibilidade com ressonância desconhecida — verificar antes", fontSize = 13.sp, color = highColor())
                        }
                    }
                }
            }
        }

        Card("Condições e comorbidades", record.conditions.size) {
            if (record.conditions.isEmpty()) NoRecord("condição")
            else Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                record.conditions.forEach { c ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(c.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        Spacer(Modifier.width(8.dp))
                        Text(c.status, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (c.criticalForTriage) {
                            Spacer(Modifier.weight(1f))
                            Text("relevante na triagem", fontSize = 11.sp, color = highColor())
                        }
                    }
                }
            }
        }

        Card("Cirurgias e procedimentos", record.procedures.size) {
            if (record.procedures.isEmpty()) NoRecord("cirurgia ou procedimento")
            else Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                record.procedures.forEach { pr ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(12.dp),
                    ) {
                        Text(pr.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        Text(
                            listOfNotNull(pr.facility, fmt(pr.performedAt)).joinToString(" · "),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        if (p.isDemo) {
            Text(
                "Conta de demonstração — dados sintéticos. Esta tela não é um prontuário oficial e não substitui a anamnese.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}
