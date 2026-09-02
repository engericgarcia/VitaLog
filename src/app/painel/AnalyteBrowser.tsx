"use client";

import { useMemo, useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import type { AnalyteSeries } from "@/lib/queries";

const CATEGORY_LABELS: Record<string, string> = {
  hematologia: "Hematologia",
  bioquimica: "Bioquímica",
  lipidograma: "Lipidograma",
  hormonios: "Hormônios",
  vitaminas: "Vitaminas e minerais",
  inflamacao: "Inflamação",
  marcadores: "Marcadores",
};

/** Ordem clínica de leitura, não alfabética — é como um laudo se organiza. */
const CATEGORY_ORDER = [
  "hematologia",
  "bioquimica",
  "lipidograma",
  "hormonios",
  "vitaminas",
  "inflamacao",
  "marcadores",
];

type Filter = "todos" | "alterados" | "normais";
type SortKey = "categoria" | "nome" | "variacao";

const isOut = (s: AnalyteSeries) =>
  s.latest.flag === "high" || s.latest.flag === "low";

/** Sem acento e sem caixa, para "vitamina" achar "Vitamina D (25-OH)". */
const fold = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AnalyteBrowser({ series }: { series: AnalyteSeries[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<SortKey>("categoria");

  const counts = useMemo(
    () => ({
      todos: series.length,
      alterados: series.filter(isOut).length,
      normais: series.filter((s) => !isOut(s)).length,
    }),
    [series],
  );

  const visible = useMemo(() => {
    const q = fold(query.trim());
    let out = series.filter((s) => {
      if (filter === "alterados" && !isOut(s)) return false;
      if (filter === "normais" && isOut(s)) return false;
      if (!q) return true;
      // Busca também na grafia impressa no laudo: quem procura por "GLIC"
      // provavelmente está com o papel na mão.
      return (
        fold(s.namePt).includes(q) ||
        s.points.some((p) => fold(p.rawName).includes(q))
      );
    });

    if (sort === "nome") {
      out = [...out].sort((a, b) => a.namePt.localeCompare(b.namePt, "pt-BR"));
    } else if (sort === "variacao") {
      // Maior movimento primeiro, em proporção ao próprio valor — variar 40 em
      // plaquetas não é comparável a variar 40 em TSH.
      const rel = (s: AnalyteSeries) =>
        s.delta === null || !s.points[0].value
          ? 0
          : Math.abs(s.delta / s.points[0].value);
      out = [...out].sort((a, b) => rel(b) - rel(a));
    }
    return out;
  }, [series, query, filter, sort]);

  const grouped = useMemo(() => {
    if (sort !== "categoria") return null;
    const map = new Map<string, AnalyteSeries[]>();
    for (const s of visible) {
      map.set(s.category, [...(map.get(s.category) ?? []), s]);
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [visible, sort]);

  const chips: Array<{ key: Filter; label: string }> = [
    { key: "todos", label: `Tudo ${counts.todos}` },
    { key: "alterados", label: `Fora da faixa ${counts.alterados}` },
    { key: "normais", label: `Dentro ${counts.normais}` },
  ];

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2"
          >
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar exame…"
            aria-label="Buscar exame"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-2 focus:border-accent/50 focus:ring-4 focus:ring-[var(--accent-ring)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scroll-subtle">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                aria-pressed={filter === c.key}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === c.key
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="ordenar">Ordenar por</label>
          <select
            id="ordenar"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-muted shadow-sm outline-none transition-colors focus:border-accent/50"
          >
            <option value="categoria">Por categoria</option>
            <option value="nome">Por nome</option>
            <option value="variacao">Maior variação</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
          <p className="font-medium">Nenhum exame corresponde</p>
          <p className="mt-1 text-sm text-muted">
            {query
              ? `Nada encontrado para "${query.trim()}".`
              : "Ajuste o filtro para ver outros resultados."}
          </p>
          {(query || filter !== "todos") && (
            <button
              onClick={() => {
                setQuery("");
                setFilter("todos");
              }}
              className="mt-5 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent-soft hover:text-accent"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : grouped ? (
        grouped.map(([category, items]) => (
          <div key={category} className="mt-8">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-foreground">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <span className="text-xs text-muted-2">{items.length}</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <SeriesCard key={s.analyteId} series={s} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <SeriesCard key={s.analyteId} series={s} />
          ))}
        </div>
      )}
    </section>
  );
}
