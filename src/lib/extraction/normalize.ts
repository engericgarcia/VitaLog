import { randomUUID } from "node:crypto";
import { ALIAS_INDEX, BY_ID, normalizeName } from "@/lib/clinical/catalog";
import { computeFlag, toCanonical } from "./units";
import type { ExtractedReport, ExtractedResult } from "./schema";

/** Abaixo disto, o resultado não entra na série sem um humano confirmar. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Ruído que laboratório adiciona ao nome sem mudar o exame.
 * Removido só na SEGUNDA tentativa de casamento — nunca na primeira, para não
 * colapsar exames que de fato se distinguem por essas palavras.
 */
const NOISE_WORDS = new Set([
  "serico", "serica", "soro", "plasma", "sangue", "sanguineo",
  "dosagem", "de", "do", "da", "em", "no", "na",
  "pesquisa", "determinacao", "exame", "material",
]);

function stripNoise(normalized: string): string {
  return normalized
    .split(" ")
    .filter((w) => !NOISE_WORDS.has(w))
    .join(" ")
    .trim();
}

/**
 * Casa o nome impresso no laudo com um analito do catálogo.
 *
 * Duas passadas, ambas determinísticas — nada de similaridade difusa. Um
 * casamento errado aqui contamina a série histórica silenciosamente, e isso é
 * pior do que não casar: o não-casado aparece na fila de revisão.
 *
 * `learnedAliases` vem do banco (aliases confirmados por humanos na revisão),
 * então o catálogo melhora com o uso.
 */
export function resolveAnalyte(
  rawName: string,
  learnedAliases?: ReadonlyMap<string, string>,
): string | null {
  const normalized = normalizeName(rawName);
  if (!normalized) return null;

  const direct = learnedAliases?.get(normalized) ?? ALIAS_INDEX.get(normalized);
  if (direct) return direct;

  const stripped = stripNoise(normalized);
  if (stripped && stripped !== normalized) {
    const viaStripped =
      learnedAliases?.get(stripped) ?? ALIAS_INDEX.get(stripped);
    if (viaStripped) return viaStripped;
  }

  return null;
}

export interface NormalizedResult {
  id: string;
  analyteId: string | null;
  rawName: string;
  rawUnit: string | null;
  valueNum: number | null;
  valueText: string | null;
  canonicalValue: number | null;
  canonicalUnit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  flag: "low" | "normal" | "high" | "abnormal" | null;
  confidence: number;
  needsReview: boolean;
  /** Por que precisa de revisão — vira o texto da tela de revisão. */
  reviewReasons: string[];
}

export function normalizeResult(
  raw: ExtractedResult,
  learnedAliases?: ReadonlyMap<string, string>,
): NormalizedResult {
  const reasons: string[] = [];
  const analyteId = resolveAnalyte(raw.raw_name, learnedAliases);

  if (!analyteId) reasons.push("Analito não reconhecido no catálogo");
  if (raw.confidence < REVIEW_CONFIDENCE_THRESHOLD) {
    reasons.push(`Confiança baixa na leitura (${raw.confidence.toFixed(2)})`);
  }

  let canonicalValue: number | null = null;
  let canonicalUnit: string | null = null;

  if (analyteId && raw.value_num !== null) {
    const converted = toCanonical(analyteId, raw.value_num, raw.unit);
    if (converted) {
      canonicalValue = converted.value;
      canonicalUnit = converted.unit;
    } else {
      reasons.push(
        `Unidade "${raw.unit}" desconhecida para ${BY_ID.get(analyteId)?.namePt ?? analyteId}`,
      );
    }
  }

  // Faixa do laudo tem precedência; catálogo é só rede de segurança.
  const catalogEntry = analyteId ? BY_ID.get(analyteId) : undefined;
  const refLow = raw.ref_low ?? catalogEntry?.refLow ?? null;
  const refHigh = raw.ref_high ?? catalogEntry?.refHigh ?? null;

  let flag: NormalizedResult["flag"] = null;
  if (canonicalValue !== null) {
    flag = computeFlag(canonicalValue, refLow, refHigh);
  } else if (raw.value_text) {
    const t = normalizeName(raw.value_text);
    if (t.includes("nao reagente") || t.includes("negativo")) flag = "normal";
    else if (t.includes("reagente") || t.includes("positivo")) flag = "abnormal";
  }

  return {
    id: randomUUID(),
    analyteId,
    rawName: raw.raw_name,
    rawUnit: raw.unit,
    valueNum: raw.value_num,
    valueText: raw.value_text,
    canonicalValue,
    canonicalUnit,
    refLow,
    refHigh,
    refText: raw.ref_text,
    flag,
    confidence: raw.confidence,
    needsReview: reasons.length > 0,
    reviewReasons: reasons,
  };
}

export interface NormalizedReport {
  labName: string | null;
  collectedAt: string | null;
  issuedAt: string | null;
  results: NormalizedResult[];
  /** Quantos exigem olho humano antes de virar ponto no gráfico. */
  reviewCount: number;
}

export function normalizeReport(
  extracted: ExtractedReport,
  learnedAliases?: ReadonlyMap<string, string>,
): NormalizedReport {
  const results = extracted.results.map((r) => normalizeResult(r, learnedAliases));
  return {
    labName: extracted.lab_name,
    collectedAt: extracted.collected_at,
    issuedAt: extracted.issued_at,
    results,
    reviewCount: results.filter((r) => r.needsReview).length,
  };
}
