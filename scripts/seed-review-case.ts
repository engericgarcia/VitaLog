/**
 * Insere um resultado pendente de conferência, para exercitar a tela /revisar
 * e o aprendizado de alias sem precisar de uma chave de API.
 *   npx tsx scripts/seed-review-case.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("DIRECT_URL não definida"); process.exit(1); }
const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql, { schema });

async function main() {
  const reportId = randomUUID();
  await db.insert(schema.labReports).values({
    id: reportId,
    userId: "demo-user",
    labName: "Laboratório Teste",
    collectedAt: "2026-08-20",
    fileName: "teste-conferencia.pdf",
    fileMime: "application/pdf",
    status: "extracted",
    extractionModel: "teste",
  });

  // "Dosagem de Glicemia Pós-Prandial" não está no catálogo — vai para revisão.
  await db.insert(schema.labResults).values({
    id: randomUUID(),
    reportId,
    userId: "demo-user",
    analyteId: null,
    rawName: "GLICOSE PP 2H",
    rawUnit: "mg/dL",
    valueNum: 118,
    refLow: 70,
    refHigh: 140,
    collectedAt: "2026-08-20",
    confidence: 0.55,
    reviewReasons: ["Analito não reconhecido no catálogo", "Confiança baixa na leitura (0.55)"],
    reviewed: false,
  });

  console.log("✓ caso de conferência inserido: \"GLICOSE PP 2H\"");
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
