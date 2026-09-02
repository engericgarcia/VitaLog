import Link from "next/link";
import { FlagBadge } from "@/components/FlagBadge";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { StatTile } from "@/components/StatTile";
import { DEMO_USER_ID, getAllSeries, getReports, getUser } from "@/lib/queries";
import { AnalyteBrowser } from "./AnalyteBrowser";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const fmtValue = (v: number) => (v >= 1000 ? v.toLocaleString("pt-BR") : String(v));

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

  const altered = series.filter(
    (s) => s.latest.flag === "high" || s.latest.flag === "low",
  );
  const last = reports[0];
  const firstYear = Math.min(
    ...series.map((s) => new Date(`${s.points[0].date}T00:00:00`).getFullYear()),
  );
  const spanYears = new Date().getFullYear() - firstYear;

  return (
    <div>
      <div className="hero-glow border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{user.name}</h1>
              <p className="mt-1.5 text-sm text-muted">
                {last?.collectedAt
                  ? `Última coleta em ${fmtDate(last.collectedAt)}`
                  : "Sem coletas registradas"}
                {last?.labName ? ` · ${last.labName}` : ""}
              </p>
            </div>
            {user.isDemo && (
              <span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                conta de exemplo · dados sintéticos
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile value={reports.length} label="Coletas" />
            <StatTile value={series.length} label="Análises acompanhadas" />
            <StatTile
              value={altered.length}
              label="Fora da faixa"
              tone={altered.length > 0 ? "alert" : "neutral"}
              hint="na última coleta"
            />
            <StatTile
              value={spanYears > 0 ? `${spanYears} anos` : "—"}
              label="De histórico"
              hint={`desde ${firstYear}`}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-14">
        {altered.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">
                Fora da faixa de referência na última coleta
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {altered.map((s) => (
                <li key={s.analyteId}>
                  <Link
                    href={`/exames/${s.analyteId}`}
                    // Coluna no celular: com flex-wrap, só os nomes longos
                    // quebravam, deixando a lista irregular. Uniformizar é mais
                    // legível do que deixar cada linha decidir sozinha.
                    className="flex flex-col gap-1.5 px-5 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="font-medium">{s.namePt}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular text-sm text-muted">
                        {fmtValue(s.latest.value)} {s.unit}
                      </span>
                      <FlagBadge flag={s.latest.flag} compact />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-border bg-surface-2 px-5 py-3 text-xs text-muted">
              Estar fora da faixa não significa doença. Leve o histórico a quem cuida de você.
            </p>
          </section>
        )}

        <AnalyteBrowser series={series} />
      </div>
    </div>
  );
}
