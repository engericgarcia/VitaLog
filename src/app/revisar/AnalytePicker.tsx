"use client";

import { useMemo, useState } from "react";
import type { Analyte } from "@/db/schema";
import { suggestAnalytes } from "@/lib/clinical/suggest";

const fold = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Escolha do analito na conferência.
 *
 * Substitui um <select> de trinta opções — que no celular vira uma roleta e no
 * desktop obriga a ler a lista inteira. Aqui o caminho comum é um toque numa
 * sugestão; a busca existe para o resto.
 *
 * A sugestão NUNCA vem pré-selecionada. Ela ordena as opções; quem decide é a
 * pessoa. Pré-selecionar transformaria a conferência em apertar "Confirmar"
 * sem olhar, que é justamente o que esta tela existe para evitar.
 */
export function AnalytePicker({
  rawName,
  analytes,
  value,
  onChange,
  disabled,
}: {
  rawName: string;
  analytes: Analyte[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const byId = useMemo(
    () => new Map(analytes.map((a) => [a.id, a])),
    [analytes],
  );

  const suggestions = useMemo(
    () =>
      suggestAnalytes(rawName, 3)
        .map((s) => byId.get(s.entry.id))
        .filter((a): a is Analyte => Boolean(a)),
    [rawName, byId],
  );

  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return analytes.slice(0, 8);
    return analytes
      .filter((a) => fold(a.namePt).includes(q) || fold(a.id).includes(q))
      .slice(0, 8);
  }, [analytes, query]);

  const selected = value ? byId.get(value) : undefined;

  if (selected) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
          <span aria-hidden>✓</span>
          {selected.namePt}
          <span className="font-normal opacity-70">{selected.canonicalUnit}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange("");
            setSearching(false);
            setQuery("");
          }}
          disabled={disabled}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-40"
        >
          trocar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {suggestions.length > 0 && !searching && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-2">Talvez seja:</span>
          {suggestions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              disabled={disabled}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-40"
            >
              {a.namePt}
            </button>
          ))}
        </div>
      )}

      {!searching ? (
        <button
          type="button"
          onClick={() => setSearching(true)}
          disabled={disabled}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-40"
        >
          {suggestions.length > 0 ? "escolher outro exame" : "escolher o exame"}
        </button>
      ) : (
        <div>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no catálogo…"
            aria-label="Buscar exame no catálogo"
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-2 focus:border-accent/50 focus:ring-4 focus:ring-[var(--accent-ring)] sm:max-w-sm"
          />
          <ul className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border bg-surface">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted-2">
                Nada encontrado no catálogo.
              </li>
            ) : (
              results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onChange(a.id)}
                    disabled={disabled}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-40"
                  >
                    <span>{a.namePt}</span>
                    <span className="text-xs text-muted-2">{a.canonicalUnit}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
