"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { analyteAliases, labResults } from "@/db/schema";
import { normalizeName } from "@/lib/clinical/catalog";
import { computeFlag, toCanonical } from "@/lib/extraction/units";
import { DEMO_USER_ID } from "@/lib/queries";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * Confirma um resultado da fila de revisão.
 *
 * Faz três coisas, e a terceira é a que importa a longo prazo:
 *   1. canoniza o valor com o analito que a pessoa escolheu;
 *   2. libera o resultado para a série;
 *   3. GRAVA A GRAFIA como alias aprendido — na próxima vez que este laboratório
 *      escrever "GLIC", o extrator resolve sozinho.
 *
 * Sem o passo 3, a pessoa corrige a mesma coisa para sempre.
 */
export async function confirmResult(
  resultId: string,
  analyteId: string,
): Promise<ActionResult> {
  const [row] = await db
    .select()
    .from(labResults)
    .where(and(eq(labResults.id, resultId), eq(labResults.userId, DEMO_USER_ID)))
    .limit(1);

  if (!row) return { ok: false, message: "Resultado não encontrado." };

  let canonicalValue: number | null = null;
  let canonicalUnit: string | null = null;

  if (row.valueNum !== null) {
    const converted = toCanonical(analyteId, row.valueNum, row.rawUnit);
    if (!converted) {
      return {
        ok: false,
        message: `A unidade "${row.rawUnit ?? "—"}" não é conhecida para esse analito. Escolha outro exame ou trate a unidade primeiro.`,
      };
    }
    canonicalValue = converted.value;
    canonicalUnit = converted.unit;
  }

  const flag =
    canonicalValue !== null ? computeFlag(canonicalValue, row.refLow, row.refHigh) : null;

  await db
    .update(labResults)
    .set({
      analyteId,
      canonicalValue,
      canonicalUnit,
      flag,
      reviewed: true,
      reviewReasons: null,
    })
    .where(eq(labResults.id, resultId));

  const alias = normalizeName(row.rawName);
  if (alias) {
    await db
      .insert(analyteAliases)
      .values({ analyteId, alias, origin: "learned" })
      // Já existir é normal quando o que baixou a confiança foi a leitura, não o nome.
      .onConflictDoNothing({ target: analyteAliases.alias });
  }

  revalidatePath("/revisar");
  revalidatePath("/painel");
  revalidatePath(`/exames/${analyteId}`);

  return { ok: true, message: "Confirmado e adicionado ao histórico." };
}

/** Descarta um resultado que não deve virar série (exame irrelevante, lixo de OCR). */
export async function discardResult(resultId: string): Promise<ActionResult> {
  await db
    .delete(labResults)
    .where(and(eq(labResults.id, resultId), eq(labResults.userId, DEMO_USER_ID)));

  revalidatePath("/revisar");
  return { ok: true, message: "Resultado descartado." };
}
