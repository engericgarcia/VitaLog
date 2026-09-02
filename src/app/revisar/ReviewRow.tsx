"use client";

import { useState, useTransition } from "react";
import type { Analyte } from "@/db/schema";
import type { ReviewItem } from "@/lib/queries";
import { confirmResult, discardResult } from "./actions";

/**
 * Uma linha da fila de conferência.
 *
 * O valor lido fica sempre visível ao lado do seletor: a pessoa precisa
 * conferir o NÚMERO tanto quanto o nome do exame, e esconder um atrás do outro
 * transforma revisão em cliques automáticos.
 */
export function ReviewRow({
  item,
  analytes,
}: {
  item: ReviewItem;
  analytes: Analyte[];
}) {
  const [selected, setSelected] = useState(item.analyteId ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return null;

  const reasons = (item.reviewReasons as string[] | null) ?? [];

  function onConfirm() {
    if (!selected) return;
    startTransition(async () => {
      const res = await confirmResult(item.id, selected);
      if (res.ok) setDone(true);
      else setFeedback(res.message);
    });
  }

  function onDiscard() {
    startTransition(async () => {
      await discardResult(item.id);
      setDone(true);
    });
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium">{item.rawName}</div>
          <div className="tabular mt-1 text-sm text-muted">
            {item.valueNum ?? item.valueText ?? "—"} {item.rawUnit ?? ""}
            {item.refLow !== null || item.refHigh !== null ? (
              <span className="ml-2">
                (ref. {item.refLow ?? "—"}–{item.refHigh ?? "—"})
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-muted">
            {item.collectedAt ?? "sem data"}
            {item.labName ? ` · ${item.labName}` : ""}
            {item.confidence !== null ? ` · confiança ${item.confidence.toFixed(2)}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`analyte-${item.id}`}>
            Exame correspondente
          </label>
          <select
            id={`analyte-${item.id}`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Escolha o exame…</option>
            {analytes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.namePt} ({a.canonicalUnit})
              </option>
            ))}
          </select>

          <button
            onClick={onConfirm}
            disabled={!selected || pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Confirmar"}
          </button>
          <button
            onClick={onDiscard}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-accent-soft disabled:opacity-40"
          >
            Descartar
          </button>
        </div>
      </div>

      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {reasons.map((r) => (
            <li
              key={r}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
            >
              {r}
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <p className="mt-3 text-sm text-high">
          <span aria-hidden className="mr-1.5">▲</span>
          {feedback}
        </p>
      )}
    </li>
  );
}
