/**
 * Popula o banco: catálogo de analitos, catálogo de vacinas e a CONTA DEMO.
 *
 * A conta demo não é enfeite. Quem abre o projeto pela primeira vez — recrutador,
 * revisor, você mesmo daqui a seis meses — não tem um PDF de laudo à mão. Sem
 * dados já populados, a primeira tela é um formulário vazio e a pessoa fecha.
 *
 *   npm run db:seed
 *
 * Todos os dados de saúde aqui são SINTÉTICOS. Nomes de laboratório são
 * fictícios de propósito: não se atribui laudo inventado a empresa real.
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { CATALOG, normalizeName } from "../src/lib/clinical/catalog";
import * as schema from "../src/db/schema";

// Migrations e seed usam a conexão DIRETA (5432): o pooler de transação do
// Supabase não aceita os comandos DDL que o drizzle emite.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DIRECT_URL (ou DATABASE_URL) não definida.\n" +
      "Copie .env.example para .env.local e cole a connection string do Supabase.",
  );
  process.exit(1);
}

const client = postgres(url, {
  max: 1,
  prepare: false,
  // O migrator é idempotente e o Postgres avisa "já existe, pulando" em NOTICE.
  // Sem isto o seed cospe blocos que parecem erro e não são.
  onnotice: () => {},
});
const db = drizzle(client, { schema });

const DEMO_USER_ID = "demo-user";

const VACCINE_CATALOG = [
  { id: "hepatite-b", name: "Hepatite B", disease: "Hepatite B", dosesRecommended: 3, boosterIntervalYears: null },
  { id: "febre-amarela", name: "Febre amarela", disease: "Febre amarela", dosesRecommended: 1, boosterIntervalYears: null },
  { id: "triplice-viral", name: "Tríplice viral (SCR)", disease: "Sarampo, caxumba e rubéola", dosesRecommended: 2, boosterIntervalYears: null },
  { id: "dtpa", name: "dT / dTpa", disease: "Difteria, tétano e coqueluche", dosesRecommended: 3, boosterIntervalYears: 10 },
  { id: "influenza", name: "Influenza", disease: "Gripe", dosesRecommended: 1, boosterIntervalYears: 1 },
  { id: "covid-19", name: "COVID-19", disease: "COVID-19", dosesRecommended: 2, boosterIntervalYears: 1 },
  { id: "hpv", name: "HPV", disease: "Papilomavírus humano", dosesRecommended: 2, boosterIntervalYears: null },
  { id: "hepatite-a", name: "Hepatite A", disease: "Hepatite A", dosesRecommended: 2, boosterIntervalYears: null },
  { id: "pneumococica", name: "Pneumocócica", disease: "Doença pneumocócica", dosesRecommended: 1, boosterIntervalYears: null },
  { id: "meningococica-acwy", name: "Meningocócica ACWY", disease: "Doença meningocócica", dosesRecommended: 1, boosterIntervalYears: 5 },
  { id: "varicela", name: "Varicela", disease: "Catapora", dosesRecommended: 2, boosterIntervalYears: null },
  { id: "dengue", name: "Dengue", disease: "Dengue", dosesRecommended: 2, boosterIntervalYears: null },
];

/** Coletas da conta demo — 7 anos, laboratórios diferentes. */
const VISITS = [
  { date: "2019-04-12", lab: "Laboratório Vitali" },
  { date: "2020-06-03", lab: "Laboratório Vitali" },
  { date: "2021-05-19", lab: "Diagnóstico São Lucas" },
  { date: "2022-07-08", lab: "Diagnóstico São Lucas" },
  { date: "2023-06-21", lab: "Centro de Análises Aurora" },
  { date: "2024-05-15", lab: "Centro de Análises Aurora" },
  { date: "2025-06-10", lab: "Laboratório Vitali" },
];

/**
 * Trajetórias sintéticas com história clínica plausível:
 * vitamina D deficiente que melhora com reposição, LDL e triglicerídeos subindo,
 * HbA1c escorregando para pré-diabetes. Gráfico com narrativa, não ruído.
 *
 * `names` varia de propósito entre as coletas — é exatamente o problema que a
 * camada de normalização resolve, e a demo precisa mostrar isso funcionando.
 */
const SERIES: Array<{
  analyteId: string;
  names: string[];
  unit: string;
  values: number[];
  ref: [number | null, number | null];
}> = [
  { analyteId: "vitamin-d", names: ["Vitamina D (25-OH)", "25-HIDROXIVITAMINA D", "Vit. D 25-OH", "Vitamina D", "VITAMINA D 25 OH", "Vitamina D (25-hidroxi)", "Vit D"], unit: "ng/mL", values: [18.2, 21.4, 26.8, 33.1, 38.6, 41.2, 42.7], ref: [30, 100] },
  { analyteId: "cholesterol-ldl", names: ["LDL Colesterol", "COLESTEROL LDL", "LDL-c", "LDL Colesterol", "LDL COLESTEROL", "LDL (calculado)", "LDL Colesterol"], unit: "mg/dL", values: [108, 114, 121, 127, 134, 139, 142], ref: [null, 130] },
  { analyteId: "cholesterol-hdl", names: ["HDL Colesterol", "COLESTEROL HDL", "HDL-c", "HDL Colesterol", "HDL COLESTEROL", "HDL", "HDL Colesterol"], unit: "mg/dL", values: [58, 56, 54, 51, 49, 47, 46], ref: [40, null] },
  { analyteId: "cholesterol-total", names: ["Colesterol Total", "COLESTEROL TOTAL", "Colesterol total", "Colesterol Total", "COLESTEROL TOTAL", "Colesterol total", "Colesterol Total"], unit: "mg/dL", values: [185, 191, 198, 204, 212, 218, 221], ref: [null, 190] },
  { analyteId: "triglycerides", names: ["Triglicerídeos", "TRIGLICERIDEOS", "Triglicérides", "Triglicerídeos", "TRIGLICERIDES", "Triglicerídeos", "TG"], unit: "mg/dL", values: [95, 108, 119, 132, 148, 157, 165], ref: [null, 150] },
  { analyteId: "glucose-fasting", names: ["Glicemia de Jejum", "GLICOSE", "Glicose (jejum)", "Glicemia de jejum", "GLICOSE EM JEJUM", "Glicemia jejum", "GLIC"], unit: "mg/dL", values: [88, 91, 94, 97, 99, 102, 104], ref: [70, 99] },
  { analyteId: "hba1c", names: ["Hemoglobina Glicada", "HEMOGLOBINA GLICOSILADA", "HbA1c", "Hemoglobina glicada (A1c)", "HEMOGLOBINA GLICADA", "HbA1c", "Hemoglobina glicada"], unit: "%", values: [5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9], ref: [null, 5.7] },
  { analyteId: "tsh", names: ["TSH", "TSH ULTRASSENSIVEL", "TSH", "TSH ultrassensível", "TSH", "Hormônio Tireoestimulante", "TSH"], unit: "µUI/mL", values: [2.1, 1.9, 2.4, 2.2, 2.0, 2.3, 2.1], ref: [0.4, 4.5] },
  { analyteId: "ferritin", names: ["Ferritina", "FERRITINA", "Ferritina sérica", "Ferritina", "FERRITINA", "Ferritina", "Ferritina"], unit: "ng/mL", values: [22, 25, 31, 36, 40, 44, 45], ref: [30, 400] },
  { analyteId: "hemoglobin", names: ["Hemoglobina", "HEMOGLOBINA", "Hb", "Hemoglobina", "HEMOGLOBINA", "Hemoglobina", "Hb"], unit: "g/dL", values: [12.1, 12.3, 12.6, 12.9, 13.0, 13.1, 13.2], ref: [12, 17.5] },
  { analyteId: "creatinine", names: ["Creatinina", "CREATININA", "Creatinina sérica", "Creatinina", "CREATININA", "Creatinina", "Creatinina"], unit: "mg/dL", values: [0.78, 0.81, 0.79, 0.83, 0.8, 0.82, 0.84], ref: [0.6, 1.3] },
  { analyteId: "alt", names: ["TGP (ALT)", "ALT/TGP", "TGP", "ALT (TGP)", "TGP ALT", "ALT", "TGP (ALT)"], unit: "U/L", values: [19, 22, 24, 27, 31, 34, 33], ref: [null, 41] },
  { analyteId: "crp", names: ["Proteína C Reativa", "PCR", "PCR ultrassensível", "Proteína C reativa", "PCR", "Proteína C Reativa", "PCR"], unit: "mg/L", values: [1.1, 0.9, 1.4, 1.8, 2.2, 2.6, 2.4], ref: [null, 5] },
];

function flagOf(v: number, low: number | null, high: number | null) {
  if (low === null && high === null) return null;
  if (low !== null && v < low) return "low" as const;
  if (high !== null && v > high) return "high" as const;
  return "normal" as const;
}

async function main() {
  console.log("→ aplicando migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("→ catálogo de analitos");
  for (const entry of CATALOG) {
    await db
      .insert(schema.analytes)
      .values({
        id: entry.id,
        loincCode: entry.loinc,
        namePt: entry.namePt,
        nameEn: entry.nameEn,
        category: entry.category,
        canonicalUnit: entry.unit,
        refLow: entry.refLow,
        refHigh: entry.refHigh,
        higherIsBetter: entry.higherIsBetter ?? null,
        description: entry.description ?? null,
      })
      .onConflictDoNothing();

    const seen = new Set<string>();
    for (const alias of [entry.namePt, entry.nameEn, ...entry.aliases]) {
      const key = normalizeName(alias);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      await db
        .insert(schema.analyteAliases)
        .values({ analyteId: entry.id, alias: key, origin: "seed" })
        .onConflictDoNothing();
    }
  }

  console.log("→ catálogo de vacinas");
  for (const v of VACCINE_CATALOG) {
    await db.insert(schema.vaccines).values(v).onConflictDoNothing();
  }

  console.log("→ conta demo");
  await db
    .insert(schema.users)
    .values({
      id: DEMO_USER_ID,
      name: "Ana Beatriz Moreira",
      birthDate: "1988-03-14",
      sex: "female",
      bloodType: "O+",
      bloodTypeSource: "laboratorio",
      isDemo: true,
    })
    // Atualiza em vez de ignorar: com onConflictDoNothing, campos novos
    // (tipo sanguíneo, por exemplo) nunca chegavam à linha já existente.
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: "Ana Beatriz Moreira",
        birthDate: "1988-03-14",
        sex: "female",
        bloodType: "O+",
        bloodTypeSource: "laboratorio",
        isDemo: true,
      },
    });

  // Idempotência: limpa o histórico da demo antes de repopular.
  await db.delete(schema.labReports).where(eq(schema.labReports.userId, DEMO_USER_ID));
  await db.delete(schema.vaccinations).where(eq(schema.vaccinations.userId, DEMO_USER_ID));

  for (const [i, visit] of VISITS.entries()) {
    const reportId = randomUUID();
    await db.insert(schema.labReports).values({
      id: reportId,
      userId: DEMO_USER_ID,
      labName: visit.lab,
      collectedAt: visit.date,
      issuedAt: visit.date,
      fileName: `laudo-${visit.date}.pdf`,
      fileMime: "application/pdf",
      status: "reviewed",
      extractionModel: "seed",
    });

    for (const s of SERIES) {
      const value = s.values[i];
      await db.insert(schema.labResults).values({
        id: randomUUID(),
        reportId,
        userId: DEMO_USER_ID,
        analyteId: s.analyteId,
        rawName: s.names[i],
        rawUnit: s.unit,
        valueNum: value,
        canonicalValue: value,
        canonicalUnit: s.unit,
        refLow: s.ref[0],
        refHigh: s.ref[1],
        flag: flagOf(value, s.ref[0], s.ref[1]),
        collectedAt: visit.date,
        confidence: 1,
        reviewed: true,
      });
    }
  }


  console.log("→ prontuário da conta demo");
  // Idempotência: o prontuário é reescrito inteiro a cada seed.
  for (const t of [schema.allergies, schema.conditions, schema.procedures, schema.devices, schema.encounters]) {
    await db.delete(t).where(eq(t.userId, DEMO_USER_ID));
  }

  /**
   * O prontuário conversa com os exames de propósito: dislipidemia combina com
   * o LDL subindo, pré-diabetes com a HbA1c em 5,9. Demo que se contradiz não
   * demonstra nada.
   */
  const allergies: Array<[string, "medicamento" | "alimento" | "ambiental" | "material" | "outro", "leve" | "moderada" | "grave" | "anafilaxia", string, string]> = [
    ["Dipirona", "medicamento", "anafilaxia", "Edema de glote e hipotensão", "2012-08-03"],
    ["Frutos do mar", "alimento", "grave", "Urticária generalizada e broncoespasmo", "2007-01-20"],
    ["Látex", "material", "moderada", "Dermatite de contato", "2011-11-05"],
    ["Ácaro", "ambiental", "leve", "Rinite sazonal", "2015-04-10"],
  ];
  for (const [substance, category, severity, reaction, notedAt] of allergies) {
    await db.insert(schema.allergies).values({
      id: randomUUID(), userId: DEMO_USER_ID, substance, category, severity,
      reaction, notedAt, source: "profissional",
    });
  }

  const conditions: Array<[string, string | null, "ativa" | "controlada" | "resolvida", boolean, string]> = [
    ["Dislipidemia", "E78.5", "ativa", false, "2023-06-21"],
    ["Pré-diabetes", "R73.0", "ativa", false, "2024-05-15"],
    ["Enxaqueca com aura", "G43.1", "controlada", true, "2010-02-18"],
    ["Rinite alérgica", "J30.4", "controlada", false, "2015-04-10"],
  ];
  for (const [name, icd10, status, criticalForTriage, diagnosedAt] of conditions) {
    await db.insert(schema.conditions).values({
      id: randomUUID(), userId: DEMO_USER_ID, name, icd10, status,
      criticalForTriage, diagnosedAt,
    });
  }

  const procedures: Array<[string, "cirurgia" | "procedimento" | "internacao", string, string]> = [
    ["Apendicectomia por videolaparoscopia", "cirurgia", "2011-11-05", "Hospital São Camilo"],
    ["Parto cesáreo", "cirurgia", "2019-09-27", "Maternidade Santa Clara"],
    ["Endoscopia digestiva alta", "procedimento", "2023-03-14", "Centro de Endoscopia Aurora"],
  ];
  for (const [name, kind, performedAt, facility] of procedures) {
    await db.insert(schema.procedures).values({
      id: randomUUID(), userId: DEMO_USER_ID, name, kind, performedAt, facility,
    });
  }

  await db.insert(schema.devices).values({
    id: randomUUID(), userId: DEMO_USER_ID,
    name: "DIU hormonal (levonorgestrel)",
    manufacturer: "Bayer", model: "Mirena",
    implantedAt: "2020-06-11", facility: "Clínica Vida Mulher",
    mriSafe: true, active: true,
    notes: "Compatível com ressonância até 3 T.",
  });

  const encounters: Array<["consulta" | "emergencia" | "internacao" | "exame" | "vacinacao", string, string, string, "sus" | "convenio" | "particular", string]> = [
    ["emergencia", "2012-08-03", "Pronto-socorro Municipal", "Emergência", "sus", "Reação anafilática a dipirona. Adrenalina IM, observação 12 h."],
    ["cirurgia" as never, "2011-11-05", "Hospital São Camilo", "Cirurgia geral", "convenio", "Apendicite aguda."],
    ["consulta", "2023-06-21", "Clínica Integrada Aurora", "Clínica médica", "convenio", "Check-up anual. Iniciado acompanhamento de perfil lipídico."],
    ["consulta", "2024-05-15", "Clínica Integrada Aurora", "Endocrinologia", "convenio", "HbA1c em elevação. Orientação nutricional."],
    ["consulta", "2025-06-10", "Clínica Integrada Aurora", "Clínica médica", "convenio", "Reforço de orientação; manter acompanhamento semestral."],
  ];
  for (const [kind, occurredAt, facility, specialty, network, summary] of encounters) {
    await db.insert(schema.encounters).values({
      id: randomUUID(), userId: DEMO_USER_ID,
      kind: kind === ("cirurgia" as never) ? "internacao" : kind,
      occurredAt, facility, specialty, network, summary,
    });
  }

  const shots: Array<[string, string, string]> = [
    ["hepatite-b", "1ª dose", "2005-03-10"],
    ["hepatite-b", "2ª dose", "2005-04-14"],
    ["hepatite-b", "3ª dose", "2005-09-12"],
    ["triplice-viral", "1ª dose", "1989-04-02"],
    ["triplice-viral", "2ª dose", "2006-08-21"],
    ["febre-amarela", "dose única", "2018-01-30"],
    ["hpv", "1ª dose", "2014-05-06"],
    ["hpv", "2ª dose", "2014-11-11"],
    ["dtpa", "reforço", "2019-07-22"],
    ["covid-19", "1ª dose", "2021-06-18"],
    ["covid-19", "2ª dose", "2021-09-03"],
    ["covid-19", "reforço", "2022-02-11"],
    ["influenza", "anual 2023", "2023-04-19"],
    ["influenza", "anual 2024", "2024-04-08"],
    ["influenza", "anual 2025", "2025-04-14"],
  ];
  for (const [vaccineId, doseLabel, appliedAt] of shots) {
    await db.insert(schema.vaccinations).values({
      id: randomUUID(),
      userId: DEMO_USER_ID,
      vaccineId,
      doseLabel,
      appliedAt,
      site: "UBS Vila Mariana",
      source: "manual",
    });
  }

  console.log(
    `✓ pronto — ${CATALOG.length} analitos, ${VACCINE_CATALOG.length} vacinas, ` +
      `${VISITS.length} coletas x ${SERIES.length} análises, ${shots.length} doses,\n` +
      `  ${allergies.length} alergias, ${conditions.length} condições, ` +
      `${procedures.length} procedimentos, 1 dispositivo, ${encounters.length} atendimentos`,
  );
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
