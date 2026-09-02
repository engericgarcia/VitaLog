import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { labReports, labResults } from "@/db/schema";
import { EXTRACTION_MODEL, ExtractionError, extractReport } from "@/lib/extraction/extract";
import { normalizeReport } from "@/lib/extraction/normalize";
import { DEMO_USER_ID, getLearnedAliases } from "@/lib/queries";

/** PDF de laudo raramente passa de 2 MB; 12 MB cobre foto de celular com folga. */
const MAX_BYTES = 12 * 1024 * 1024;

const ACCEPTED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada. Defina em .env.local para usar a extração." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande (${(file.size / 1e6).toFixed(1)} MB). Limite: 12 MB.` },
      { status: 413 },
    );
  }
  // Checar aqui evita gastar uma chamada de API para descobrir que o tipo não serve.
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo não suportado: ${file.type || "desconhecido"}. Envie PDF, PNG, JPEG, GIF ou WebP.` },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const reportId = randomUUID();

  try {
    const { report: extracted, usage } = await extractReport(buffer, file.type);

    // Aliases que humanos já confirmaram — é o que faz o catálogo melhorar com o uso.
    const learned = await getLearnedAliases();
    const normalized = normalizeReport(extracted, learned);

    await db.insert(labReports).values({
      id: reportId,
      userId: DEMO_USER_ID,
      labName: normalized.labName,
      collectedAt: normalized.collectedAt,
      issuedAt: normalized.issuedAt,
      fileName: file.name,
      fileMime: file.type,
      // Extração bruta guardada para auditoria: dá para reprocessar sem o arquivo.
      extractionRaw: extracted,
      extractionModel: EXTRACTION_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      status: "extracted",
    });

    if (normalized.results.length > 0) {
      // Um insert só: um laudo de hemograma completo tem dezenas de linhas, e
      // uma ida ao banco por linha desperdiça conexão do pooler.
      await db.insert(labResults).values(
        normalized.results.map((r) => ({
          id: r.id,
          reportId,
          userId: DEMO_USER_ID,
          analyteId: r.analyteId,
          rawName: r.rawName,
          rawUnit: r.rawUnit,
          valueNum: r.valueNum,
          valueText: r.valueText,
          canonicalValue: r.canonicalValue,
          canonicalUnit: r.canonicalUnit,
          refLow: r.refLow,
          refHigh: r.refHigh,
          refText: r.refText,
          flag: r.flag,
          collectedAt: normalized.collectedAt,
          confidence: r.confidence,
          reviewReasons: r.needsReview ? r.reviewReasons : null,
          // Só entra direto na série o que foi reconhecido com confiança.
          reviewed: !r.needsReview,
        })),
      );
    }

    return NextResponse.json({
      reportId,
      labName: normalized.labName,
      collectedAt: normalized.collectedAt,
      total: normalized.results.length,
      reviewCount: normalized.reviewCount,
      results: normalized.results,
    });
  } catch (err) {
    if (err instanceof ExtractionError) {
      // Registra a falha para dar para investigar depois sem depender de log.
      await db
        .insert(labReports)
        .values({
          id: reportId,
          userId: DEMO_USER_ID,
          fileName: file.name,
          fileMime: file.type,
          status: "failed",
          extractionError: err.message,
        })
        .catch(() => {}); // registrar a falha não pode causar uma segunda falha

      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[upload] erro inesperado", err);
    return NextResponse.json({ error: "Erro interno ao processar o laudo." }, { status: 500 });
  }
}
