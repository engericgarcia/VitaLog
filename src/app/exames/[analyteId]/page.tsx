import Link from "next/link";
import { notFound } from "next/navigation";
import { FlagBadge } from "@/components/FlagBadge";
import { SeriesChart } from "@/components/SeriesChart";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { StatTile } from "@/components/StatTile";
import { DEMO_USER_ID, getSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const num = (v: number) => (v >= 1000 ? v.toLocaleString("pt-BR") : String(v));

export default async function ExameDetalhe({
  params,
}: {
  params: Promise<{ analyteId: string }>;
}) {
  const { analyteId } = await params;

  let series;
  try {
    series = await getSeries(DEMO_USER_ID, analyteId);
  } catch (err) {
    return <SetupNotice reason={describeDbError(err)} />;
  }
  if (!series) notFound();

  const { latest, points } = series;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const refText =
    latest.refLow !== null && latest.refHigh !== null
      ? `${latest.refLow} – ${latest.refHigh} ${series.unit}`
      : latest.refHigh !== null
        ? `até ${latest.refHigh} ${series.unit}`
        : latest.refLow !== null
          ? `acima de ${latest.refLow} ${series.unit}`
          : "sem faixa informada";

  // Grafias distintas do mesmo exame ao longo dos anos — o argumento do produto,
  // visível em vez de explicado.
  const spellings = [...new Set(points.map((p) => p.rawName))];
  const delta = series.delta;

  return (
    <div>
      <div className="hero-glow border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <Link
            href="/painel"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
          >
            <span aria-hidden>←</span> Painel
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight">{series.namePt}</h1>
              <p className="mt-1.5 text-sm text-muted">
                Referência {refText} · {points.length} medições entre{" "}
                {fmt(points[0].date)} e {fmt(latest.date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold leading-none tracking-tight">
                  {num(latest.value)}
                </span>
                <span className="text-base text-muted">{series.unit}</span>
              </div>
              <FlagBadge flag={latest.flag} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              value={num(points[0].value)}
              label="Primeira medição"
              hint={fmt(points[0].date)}
            />
            <StatTile value={num(min)} label="Menor registrado" />
            <StatTile value={num(max)} label="Maior registrado" />
            <StatTile
              value={
                delta === null
                  ? "—"
                  : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${num(Math.abs(Number(delta.toFixed(2))))}`
              }
              label="Variação total"
              hint={`desde ${new Date(`${points[0].date}T00:00:00`).getFullYear()}`}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pb-14">
        {series.description && (
          <p className="mt-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-sm">
            {series.description}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <SeriesChart points={points} unit={series.unit} />
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-2">
            A faixa sombreada é o intervalo de referência do laudo. Cada marcador é uma
            coleta, colorido pela situação daquele resultado.
          </p>
        </section>

        {/* Tabela: o valor nunca pode existir só dentro de um tooltip. */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Todas as medições</h2>
          <div className="scroll-subtle mt-3 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Coleta</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Resultado</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Situação</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Laboratório</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Impresso como</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...points].reverse().map((p, i) => (
                  <tr key={`${p.date}-${i}`} className="transition-colors hover:bg-surface-2">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{fmt(p.date)}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5 font-medium">
                      {num(p.value)} {p.unit}
                    </td>
                    <td className="px-4 py-2.5"><FlagBadge flag={p.flag} compact /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{p.labName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{p.rawName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {spellings.length > 1 && (
          <section className="mt-6 rounded-2xl border border-accent/20 bg-accent-soft p-5">
            <h2 className="text-sm font-semibold text-accent">
              {spellings.length} grafias, uma série
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ao longo dos anos este exame apareceu nos laudos como{" "}
              {spellings.map((s, i) => (
                <span key={s}>
                  <span className="font-medium text-foreground">“{s}”</span>
                  {i < spellings.length - 2 ? ", " : i === spellings.length - 2 ? " e " : ""}
                </span>
              ))}
              . A normalização contra o catálogo é o que permite que virem um gráfico
              só, em vez de {spellings.length} listas separadas.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
