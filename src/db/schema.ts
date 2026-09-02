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

export type User = typeof users.$inferSelect;
export type Analyte = typeof analytes.$inferSelect;
export type LabReport = typeof labReports.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type Vaccine = typeof vaccines.$inferSelect;
export type Vaccination = typeof vaccinations.$inferSelect;
