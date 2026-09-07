package br.com.vitalog.triagem.data

import kotlinx.serialization.Serializable

/**
 * Espelho do JSON de /api/emergencia.
 *
 * Todo campo opcional é nullable de verdade, e a interface distingue null de
 * vazio. Num prontuário de triagem, "não informado" e "não tem" são coisas
 * diferentes — colapsar os dois num valor padrão seria perigoso.
 */
@Serializable
data class TriageRecord(
    val syncedAt: String,
    val patient: Patient,
    val allergies: List<Allergy> = emptyList(),
    val conditions: List<Condition> = emptyList(),
    val devices: List<Device> = emptyList(),
    val procedures: List<Procedure> = emptyList(),
)

@Serializable
data class Patient(
    val name: String,
    val birthDate: String? = null,
    val sex: String? = null,
    val bloodType: String? = null,
    val bloodTypeSource: String? = null,
    val isDemo: Boolean = false,
)

@Serializable
data class Allergy(
    val substance: String,
    val category: String,
    val severity: String,
    val reaction: String? = null,
    val notedAt: String? = null,
)

@Serializable
data class Condition(
    val name: String,
    val icd10: String? = null,
    val status: String,
    val criticalForTriage: Boolean = false,
)

@Serializable
data class Device(
    val name: String,
    val manufacturer: String? = null,
    val model: String? = null,
    val implantedAt: String? = null,
    /** null = não se sabe, que é diferente de false ("não pode"). */
    val mriSafe: Boolean? = null,
    val notes: String? = null,
)

@Serializable
data class Procedure(
    val name: String,
    val kind: String,
    val performedAt: String? = null,
    val facility: String? = null,
)
