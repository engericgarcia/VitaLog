"use client";

import { useState, useTransition } from "react";
import type { Analyte } from "@/db/schema";
import { REVIEW_CONFIDENCE_THRESHOLD } from "@/lib/extraction/normalize";
import type { ReviewItem } from "@/lib/queries";
import { AnalytePicker } from "./AnalytePicker";
import { confirmResult, discardResult } from "./actions";

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "sem data";

/**
 * Barra de confiança da leitura.
 *
 * Usa o teal de acento, nunca as cores de situação: confiança é sobre o OCR ter
 * lido direito, não sobre o resultado estar dentro ou fora da referência.
 * Misturar as duas escalas faria "leitura duvidosa" parecer "exame alterado".
 */
function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="w-28">
      <div className="flex items-baseline justify-between text-[0.7rem] text-muted-2">
        <span>confiança</span>
        <span className="tabular">{pct}%</span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
        {/* Marca do limiar: acima dela o resultado entraria sozinho na série. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-border-strong"
          style={{ left: `${REVIEW_CONFIDENCE_THRESHOLD * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ReviewRow({
  item,
  analytes,
  onResolved,
}: {
  item: ReviewItem;
  analytes: Analyte[];
  onResolved: () => void;
}) {
  const [selected, setSelected] = useState(item.analyteId ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reasons = (item.reviewReasons as string[] | null) ?? [];

  /**
   * A ação do servidor revalida a rota, então a linha some sozinha quando dá
   * certo — o contador de "resolvidos agora" na fila é que dá o retorno. Só o
   * erro precisa ser exibido aqui, porque nesse caso nada muda na tela.
   */
  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) onResolved();
      else setFeedback(res.message);
    });
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div className="min-w-0">
          {/* O que o laudo diz, literalmente. */}
          <div className="font-medium">{item.rawName}</div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular text-lg font-semibold">
              {item.valueNum ?? item.valueText ?? "—"}
              {item.rawUnit ? (
                <span className="ml-1 text-sm font-normal text-muted">{item.rawUnit}</span>
              ) : null}
            </span>
            {(item.refLow !== null || item.refHigh !== null) && (
              <span className="tabular text-xs text-muted-2">
                referência {item.refLow ?? "—"}–{item.refHigh ?? "—"}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-2">
            {fmtDate(item.collectedAt)}
            {item.labName ? ` · ${item.labName}` : ""}
          </div>
        </div>
        {item.confidence !== null && <Confidence value={item.confidence} />}
      </div>

      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-5 pt-3">
          {reasons.map((r) => (
            <li
              key={r}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted"
            >
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-border bg-surface-2 px-5 py-4">
        <AnalytePicker
          rawName={item.rawName}
          analytes={analytes}
          value={selected}
          onChange={setSelected}
          disabled={pending}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => run(() => confirmResult(item.id, selected))}
            disabled={!selected || pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Confirmar e adicionar"}
          </button>
          <button
            onClick={() => run(() => discardResult(item.id))}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
          >
            Descartar
          </button>
          {!selected && (
            <span className="text-xs text-muted-2">
              escolha o exame para poder confirmar
            </span>
          )}
        </div>

        {feedback && (
          <p className="mt-3 text-sm text-high">
            <span aria-hidden className="mr-1.5">▲</span>
            {feedback}
          </p>
        )}
      </div>
    </li>
  );
}
