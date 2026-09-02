import Link from "next/link";
import { notFound } from "next/navigation";
import { FlagBadge } from "@/components/FlagBadge";
import { SeriesChart } from "@/components/SeriesChart";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { DEMO_USER_ID, getSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

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

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/painel" className="text-sm text-muted transition-colors hover:text-accent">
        ← Painel
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{series.namePt}</h1>
          <p className="mt-1 text-sm text-muted">
            Referência: {refText} · {points.length} medições entre {fmt(points[0].date)} e{" "}
            {fmt(latest.date)}
          </p>
        </div>
        {/* Alinha à esquerda no celular: quando o cabeçalho quebra em duas
            linhas, alinhar à direita joga o número para o meio da tela, longe
            do título a que ele pertence. */}
        <div className="text-left sm:text-right">
          <div className="text-3xl font-semibold leading-none">
            {latest.value >= 1000 ? latest.value.toLocaleString("pt-BR") : latest.value}
            <span className="ml-1 text-base font-normal text-muted">{series.unit}</span>
          </div>
          <div className="mt-2">
            <FlagBadge flag={latest.flag} />
          </div>
        </div>
      </header>

      {series.description && (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          {series.description}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <SeriesChart points={points} unit={series.unit} />
        <p className="mt-2 text-xs text-muted">
          A faixa sombreada é o intervalo de referência do laudo. Cada marcador é uma
          coleta, colorido pela situação daquele resultado.
        </p>
      </section>

      {/* Tabela: o valor nunca pode existir só dentro de um tooltip. */}
      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-wide text-muted">Todas as medições</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Coleta</th>
                <th className="px-4 py-2.5 font-medium">Resultado</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium">Laboratório</th>
                <th className="px-4 py-2.5 font-medium">Impresso como</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p, i) => (
                <tr key={`${p.date}-${i}`} className="border-b border-border last:border-0">
                  <td className="tabular whitespace-nowrap px-4 py-2.5">{fmt(p.date)}</td>
                  <td className="tabular whitespace-nowrap px-4 py-2.5 font-medium">
                    {p.value >= 1000 ? p.value.toLocaleString("pt-BR") : p.value} {p.unit}
                  </td>
                  <td className="px-4 py-2.5"><FlagBadge flag={p.flag} compact /></td>
                  <td className="px-4 py-2.5 text-muted">{p.labName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{p.rawName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {spellings.length > 1 && (
        <section className="mt-6 rounded-xl border border-border bg-accent-soft p-5">
          <h2 className="text-sm font-medium text-accent">
            {spellings.length} grafias, uma série
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Ao longo dos anos este exame apareceu nos laudos como{" "}
            {spellings.map((s, i) => (
              <span key={s}>
                <span className="font-medium text-foreground">“{s}”</span>
                {i < spellings.length - 2 ? ", " : i === spellings.length - 2 ? " e " : ""}
              </span>
            ))}
            . A normalização contra o catálogo é o que permite que virem um gráfico
            só em vez de {spellings.length} listas separadas.
          </p>
        </section>
      )}
    </div>
  );
}
