import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Schema Postgres (Supabase).
 *
 * Datas de coleta são `text` em ISO YYYY-MM-DD, não `date`: um laudo traz o DIA
 * da coleta, sem hora e sem fuso. Guardar como timestamp criaria um fuso que o
 * dado não tem e faria a mesma coleta aparecer em dias diferentes conforme o
 * servidor. Carimbos de auditoria (`created_at`) são timestamptz de verdade.
 */

/**
 * Pessoa dona do histórico. Sexo e data de nascimento não são decoração:
 * faixa de referência de várias análises (hemoglobina, creatinina, ferritina)
 * depende de ambos.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: text("birth_date"), // ISO YYYY-MM-DD
  sex: text("sex", { enum: ["female", "male", "other"] }),
  bloodType: text("blood_type", {
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  }),
  /**
   * De onde veio o tipo sanguíneo. É um campo de segurança, não de metadado:
   * tipo informado pelo próprio paciente NUNCA pode ser usado para transfundir
   * — a tipagem tem que ser refeita. A tela de emergência precisa dizer isso.
   */
  bloodTypeSource: text("blood_type_source", {
    enum: ["laboratorio", "informado", "carteira"],
  }),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Catálogo canônico de analitos, ancorado em LOINC.
 *
 * É o que permite que "Glicose", "Glicemia de jejum" e "GLIC" — três laboratórios,
 * três grafias — caiam na mesma série temporal. Sem isto, o gráfico não existe.
 */
export const analytes = pgTable(
  "analytes",
  {
    id: text("id").primaryKey(), // slug: "glucose-fasting"
    loincCode: text("loinc_code"), // ex.: "1558-6"
    namePt: text("name_pt").notNull(),
    nameEn: text("name_en"),
    category: text("category").notNull(), // hematologia, bioquimica, hormonios...
    canonicalUnit: text("canonical_unit").notNull(),
    /** Faixa de referência genérica adulta; a do laudo sempre tem precedência. */
    refLow: doublePrecision("ref_low"),
    refHigh: doublePrecision("ref_high"),
    /** Direção clínica "boa" — usado só para colorir gráfico, nunca para diagnosticar. */
    higherIsBetter: boolean("higher_is_better"),
    description: text("description"),
  },
  (t) => [index("analytes_category_idx").on(t.category)],
);

/**
 * Camada de normalização: toda grafia que já vimos apontando para um analito.
 * O extrator consulta isto ANTES de perguntar ao modelo, e grava aqui o que
 * o humano confirmar na tela de revisão — o catálogo aprende com o uso.
 */
export const analyteAliases = pgTable(
  "analyte_aliases",
  {
    id: serial("id").primaryKey(),
    analyteId: text("analyte_id")
      .notNull()
      .references(() => analytes.id, { onDelete: "cascade" }),
    /** Sempre gravado normalizado: minúsculo, sem acento, sem pontuação. */
    alias: text("alias").notNull(),
    /** "seed" = veio do catálogo inicial; "learned" = confirmado por um humano. */
    origin: text("origin", { enum: ["seed", "learned"] }).notNull().default("seed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("analyte_aliases_alias_unq").on(t.alias)],
);

/**
 * Um documento enviado — o PDF do laboratório, foto do laudo, etc.
 * Guardamos o payload bruto da extração para auditoria: se o modelo errar,
 * dá para reprocessar sem pedir o arquivo de novo.
 */
export const labReports = pgTable(
  "lab_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    labName: text("lab_name"),
    /** Data da COLETA — é ela que ordena a série, não a data do upload. */
    collectedAt: text("collected_at"), // ISO YYYY-MM-DD
    issuedAt: text("issued_at"),
    fileName: text("file_name"),
    fileMime: text("file_mime"),
    storageKey: text("storage_key"),
    status: text("status", {
      enum: ["pending", "extracted", "reviewed", "failed"],
    })
      .notNull()
      .default("pending"),
    extractionModel: text("extraction_model"),
    extractionRaw: jsonb("extraction_raw"),
    extractionError: text("extraction_error"),
    /** Tokens gastos na extração — extração custa dinheiro; sem medir não se controla. */
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lab_reports_user_collected_idx").on(t.userId, t.collectedAt)],
);

/**
 * Uma medição individual. Guarda o que o laudo dizia (rawName/value/unit) E a
 * versão canônica (canonicalValue na unidade do catálogo). Nunca sobrescrevemos
 * o original: se a conversão estiver errada, o dado de origem continua lá.
 */
export const labResults = pgTable(
  "lab_results",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => labReports.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null = o extrator não reconheceu o analito; cai na fila de revisão. */
    analyteId: text("analyte_id").references(() => analytes.id),

    rawName: text("raw_name").notNull(),
    rawUnit: text("raw_unit"),
    valueNum: doublePrecision("value_num"),
    /** Resultados qualitativos: "Não reagente", "Negativo", "< 0,3". */
    valueText: text("value_text"),

    canonicalValue: doublePrecision("canonical_value"),
    canonicalUnit: text("canonical_unit"),

    refLow: doublePrecision("ref_low"),
    refHigh: doublePrecision("ref_high"),
    refText: text("ref_text"),
    flag: text("flag", { enum: ["low", "normal", "high", "abnormal"] }),

    collectedAt: text("collected_at"),
    /** 0..1 — confiança do extrator. Abaixo do limiar, exige revisão humana. */
    confidence: doublePrecision("confidence"),
    reviewed: boolean("reviewed").notNull().default(false),
    /** Motivos pelos quais caiu na revisão; some quando o humano confirma. */
    reviewReasons: jsonb("review_reasons").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lab_results_series_idx").on(t.userId, t.analyteId, t.collectedAt),
    index("lab_results_report_idx").on(t.reportId),
    index("lab_results_review_idx").on(t.userId, t.reviewed),
  ],
);

/** Catálogo de imunizantes do calendário nacional + viagem/particular. */
export const vaccines = pgTable("vaccines", {
  id: text("id").primaryKey(), // slug: "hepatite-b"
  name: text("name").notNull(),
  disease: text("disease").notNull(),
  /** Doses do esquema completo em adulto; null quando é dose única/anual. */
  dosesRecommended: integer("doses_recommended"),
  boosterIntervalYears: doublePrecision("booster_interval_years"),
  partOfNationalSchedule: boolean("part_of_national_schedule").notNull().default(true),
});

export const vaccinations = pgTable(
  "vaccinations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vaccineId: text("vaccine_id")
      .notNull()
      .references(() => vaccines.id),
    doseLabel: text("dose_label"), // "1ª dose", "reforço", "anual 2025"
    appliedAt: text("applied_at").notNull(), // ISO YYYY-MM-DD
    lot: text("lot"),
    manufacturer: text("manufacturer"),
    site: text("site"), // UBS, clínica, farmácia
    source: text("source", { enum: ["manual", "extracted", "imported"] })
      .notNull()
      .default("manual"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vaccinations_user_idx").on(t.userId, t.appliedAt)],
);


/**
 * ─── Prontuário ────────────────────────────────────────────────────────────
 * As tabelas abaixo existem para a triagem: são o que alguém precisa saber
 * sobre você em trinta segundos, quando você talvez não esteja consciente para
 * contar. Diferente das séries de exame, aqui o valor não está na tendência ao
 * longo do tempo — está em não faltar.
 */

/**
 * Alergias e reações adversas.
 *
 * `severity` não é enfeite: é o que ordena a lista na tela de emergência.
 * Anafilaxia a um antibiótico precisa saltar aos olhos antes de uma
 * intolerância leve.
 */
export const allergies = pgTable(
  "allergies",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    substance: text("substance").notNull(),
    category: text("category", {
      enum: ["medicamento", "alimento", "ambiental", "material", "outro"],
    }).notNull(),
    severity: text("severity", {
      enum: ["leve", "moderada", "grave", "anafilaxia"],
    }).notNull(),
    reaction: text("reaction"),
    notedAt: text("noted_at"), // ISO YYYY-MM-DD
    source: text("source", { enum: ["profissional", "informado", "extraido"] })
      .notNull()
      .default("informado"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("allergies_user_idx").on(t.userId, t.severity)],
);

/** Comorbidades e condições crônicas. */
export const conditions = pgTable(
  "conditions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icd10: text("icd10"),
    status: text("status", { enum: ["ativa", "controlada", "resolvida"] })
      .notNull()
      .default("ativa"),
    /** Marca o que a triagem precisa ver mesmo estando controlada (ex.: epilepsia). */
    criticalForTriage: boolean("critical_for_triage").notNull().default(false),
    diagnosedAt: text("diagnosed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conditions_user_idx").on(t.userId, t.status)],
);

/** Cirurgias, procedimentos e internações. */
export const procedures = pgTable(
  "procedures",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["cirurgia", "procedimento", "internacao"] })
      .notNull()
      .default("procedimento"),
    performedAt: text("performed_at"), // ISO YYYY-MM-DD
    facility: text("facility"),
    professional: text("professional"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("procedures_user_idx").on(t.userId, t.performedAt)],
);

/**
 * Dispositivos implantados: marca-passo, stent, prótese, DIU.
 *
 * `mriSafe` é o campo que justifica a tabela existir. Levar alguém com
 * marca-passo antigo para uma ressonância pode matar — e é exatamente o tipo
 * de informação que ninguém lembra de perguntar com o paciente inconsciente.
 */
export const devices = pgTable(
  "devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serial: text("serial"),
    implantedAt: text("implanted_at"),
    facility: text("facility"),
    /** null = não se sabe, que é diferente de "não pode". A tela distingue. */
    mriSafe: boolean("mri_safe"),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("devices_user_idx").on(t.userId, t.active)],
);

/** Atendimentos: consulta, emergência, internação. Público ou privado. */
export const encounters = pgTable(
  "encounters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["consulta", "emergencia", "internacao", "exame", "vacinacao"],
    }).notNull(),
    occurredAt: text("occurred_at").notNull(), // ISO YYYY-MM-DD
    facility: text("facility"),
    specialty: text("specialty"),
    professional: text("professional"),
    /** Rede de origem — o ponto do projeto é justamente que as duas convivam. */
    network: text("network", { enum: ["sus", "convenio", "particular"] }),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("encounters_user_idx").on(t.userId, t.occurredAt)],
);

export type Allergy = typeof allergies.$inferSelect;
export type Condition = typeof conditions.$inferSelect;
export type Procedure = typeof procedures.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Encounter = typeof encounters.$inferSelect;

export type User = typeof users.$inferSelect;
export type Analyte = typeof analytes.$inferSelect;
export type LabReport = typeof labReports.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type Vaccine = typeof vaccines.$inferSelect;
export type Vaccination = typeof vaccinations.$inferSelect;
