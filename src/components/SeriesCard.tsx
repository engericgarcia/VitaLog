import Link from "next/link";
import { FlagBadge } from "./FlagBadge";
import { Sparkline } from "./Sparkline";
import type { AnalyteSeries } from "@/lib/queries";

const fmt = (v: number) => (v >= 1000 ? v.toLocaleString("pt-BR") : String(v));

/**
 * Variação entre a primeira e a última medição.
 *
 * Deliberadamente neutro em julgamento: mostra direção e magnitude, não se é
 * bom ou ruim. "HDL caiu 12" pode ser ruim e "ferritina subiu 23" pode ser
 * ótimo — quem decide isso é quem cuida da pessoa, não um cartão.
 */
function Delta({ series }: { series: AnalyteSeries }) {
  if (series.delta === null || series.points.length < 2) {
    return <span className="text-muted-2">medição única</span>;
  }
  const d = series.delta;
  if (Math.abs(d) < 1e-9) return <span className="text-muted-2">estável</span>;

  const mag = Math.abs(d) >= 1000
    ? Math.abs(d).toLocaleString("pt-BR")
    : Math.abs(Number(d.toFixed(2)));

  return (
    <span className="text-muted">
      <span aria-hidden>{d > 0 ? "↑" : "↓"}</span>{" "}
      <span className="tabular">{mag}</span>{" "}
      <span className="text-muted-2">
        desde {new Date(`${series.points[0].date}T00:00:00`).getFullYear()}
      </span>
    </span>
  );
}

export function SeriesCard({ series }: { series: AnalyteSeries }) {
  const { latest, points } = series;
  const outOfRange = latest.flag === "high" || latest.flag === "low";

  return (
    <Link
      href={`/exames/${series.analyteId}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* Faixa lateral na cor da situação. Reforço visual, nunca canal único —
          o badge com glifo e texto ao lado é que carrega a informação. */}
      {outOfRange && (
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-[3px] ${
            latest.flag === "high" ? "bg-high" : "bg-low"
          }`}
        />
      )}

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <h3 className="min-w-0 truncate font-medium leading-snug transition-colors group-hover:text-accent">
          {series.namePt}
        </h3>
        <FlagBadge flag={latest.flag} compact />
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[1.75rem] font-semibold leading-none tracking-tight">
              {fmt(latest.value)}
            </span>
            <span className="text-sm text-muted">{series.unit}</span>
          </div>
          <div className="mt-2 text-xs">
            <Delta series={series} />
          </div>
        </div>
        <Sparkline values={points.map((p) => p.value)} flag={latest.flag} />
      </div>

      <div className="mt-4 border-t border-border px-4 py-2.5 text-xs text-muted-2">
        {points.length} medições ·{" "}
        {new Date(`${points[0].date}T00:00:00`).getFullYear()}–
        {new Date(`${latest.date}T00:00:00`).getFullYear()}
      </div>
    </Link>
  );
}
