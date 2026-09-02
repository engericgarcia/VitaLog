import Link from "next/link";
import { FlagBadge } from "@/components/FlagBadge";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { Sparkline } from "@/components/Sparkline";
import { DEMO_USER_ID, getAllSeries, getReports, getUser } from "@/lib/queries";
import type { AnalyteSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  hematologia: "Hematologia",
  bioquimica: "Bioquímica",
  lipidograma: "Lipidograma",
  hormonios: "Hormônios",
  vitaminas: "Vitaminas e minerais",
  inflamacao: "Inflamação",
  marcadores: "Marcadores",
};

function formatValue(v: number) {
  return v >= 1000 ? v.toLocaleString("pt-BR") : String(v);
}

function DeltaNote({ series }: { series: AnalyteSeries }) {
  if (series.delta === null || series.points.length < 2) return null;
  const d = series.delta;
  if (Math.abs(d) < 1e-9) return <span className="text-muted">estável</span>;

  const arrow = d > 0 ? "↑" : "↓";
  const magnitude = Math.abs(d) >= 1000 ? Math.abs(d).toLocaleString("pt-BR") : Math.abs(Number(d.toFixed(2)));
  const first = series.points[0];

  return (
    <span className="text-muted">
      {arrow} {magnitude} desde{" "}
      {new Date(`${first.date}T00:00:00`).getFullYear()}
    </span>
  );
}

function SeriesCard({ series }: { series: AnalyteSeries }) {
  const { latest } = series;
  return (
    <Link
      href={`/exames/${series.analyteId}`}
      className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium group-hover:text-accent">{series.namePt}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {series.points.length} medições · desde{" "}
            {new Date(`${series.points[0].date}T00:00:00`).getFullYear()}
          </p>
        </div>
        <FlagBadge flag={latest.flag} compact />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          {/* Sem tabular-nums no número grande: largura igual deixa o dígito frouxo. */}
          <div className="text-2xl font-semibold leading-none">
            {formatValue(latest.value)}
            <span className="ml-1 text-sm font-normal text-muted">{series.unit}</span>
          </div>
          <div className="mt-1.5 text-xs">
            <DeltaNote series={series} />
          </div>
        </div>
        <Sparkline values={series.points.map((p) => p.value)} flag={latest.flag} />
      </div>
    </Link>
  );
}

export default async function Painel() {
  // Banco indisponível não é exceção rara aqui: projeto gratuito do Supabase
  // hiberna, e quem acabou de clonar ainda não tem .env.local.
  let user, series, reports;
  try {
    [user, series, reports] = await Promise.all([
      getUser(DEMO_USER_ID),
      getAllSeries(DEMO_USER_ID),
      getReports(DEMO_USER_ID),
    ]);
  } catch (err) {
    return <SetupNotice reason={describeDbError(err)} />;
  }

  if (!user || series.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Nenhum dado ainda</h1>
        <p className="mt-2 text-muted">
          Rode <code className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">npm run db:seed</code>{" "}
          para popular a conta de exemplo, ou{" "}
          <Link href="/enviar" className="text-accent underline">envie um laudo</Link>.
        </p>
      </div>
    );
  }

  const altered = series.filter((s) => s.latest.flag === "high" || s.latest.flag === "low");
  const byCategory = new Map<string, AnalyteSeries[]>();
  for (const s of series) {
    byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);
  }

  const lastCollection = reports[0]?.collectedAt;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {reports.length} coletas · {series.length} análises acompanhadas
            {lastCollection
              ? ` · última em ${new Date(`${lastCollection}T00:00:00`).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </div>
        {user.isDemo && (
          <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            conta de exemplo · dados sintéticos
          </span>
        )}
      </header>

      {altered.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">
            Fora da faixa de referência na última coleta
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {altered.map((s) => (
              <li key={s.analyteId}>
                <Link
                  href={`/exames/${s.analyteId}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent-soft"
                >
                  <span className="font-medium">{s.namePt}</span>
                  <span className="tabular text-muted">
                    {formatValue(s.latest.value)} {s.unit}
                  </span>
                  <FlagBadge flag={s.latest.flag} compact />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Estar fora da faixa não significa doença. Leve o histórico a quem cuida de você.
          </p>
        </section>
      )}

      {[...byCategory.entries()].map(([category, items]) => (
        <section key={category} className="mt-10">
          <h2 className="text-sm font-medium tracking-wide text-muted">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <SeriesCard key={s.analyteId} series={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
