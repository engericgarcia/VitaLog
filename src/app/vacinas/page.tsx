import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { StatTile } from "@/components/StatTile";
import { DEMO_USER_ID, getUser, getVaccinations, getVaccineCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const yearsSince = (iso: string) =>
  (Date.now() - new Date(`${iso}T00:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export default async function Vacinas() {
  let user, doses, catalog;
  try {
    [user, doses, catalog] = await Promise.all([
      getUser(DEMO_USER_ID),
      getVaccinations(DEMO_USER_ID),
      getVaccineCatalog(),
    ]);
  } catch (err) {
    return <SetupNotice reason={describeDbError(err)} />;
  }

  const byVaccine = new Map<string, typeof doses>();
  for (const d of doses) {
    byVaccine.set(d.vaccineId, [...(byVaccine.get(d.vaccineId) ?? []), d]);
  }

  /**
   * Reforço vencido = passou mais tempo desde a última dose do que o intervalo
   * do imunizante. É lembrete de agenda, não conduta clínica — por isso o texto
   * diz "converse com quem cuida de você" e não "tome a vacina".
   */
  const overdue = [...byVaccine.values()].flatMap((list) => {
    const latest = list[0];
    const interval = latest.boosterIntervalYears;
    if (!interval) return [];
    const elapsed = yearsSince(latest.appliedAt);
    return elapsed > interval
      ? [{ name: latest.vaccineName, since: latest.appliedAt, elapsed }]
      : [];
  });

  const missing = catalog.filter(
    (v) => !byVaccine.has(v.id) && v.partOfNationalSchedule,
  );
  const lastDose = doses[0];

  return (
    <div>
      <div className="hero-glow border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Carteira de vacinas</h1>
              <p className="mt-1.5 text-sm text-muted">
                {lastDose
                  ? `Última dose em ${fmt(lastDose.appliedAt)} · ${lastDose.vaccineName}`
                  : "Nenhuma dose registrada"}
              </p>
            </div>
            {user?.isDemo && (
              <span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                conta de exemplo
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile value={doses.length} label="Doses registradas" />
            <StatTile value={byVaccine.size} label="Imunizantes" />
            <StatTile
              value={overdue.length}
              label="Reforço vencido"
              tone={overdue.length > 0 ? "alert" : "neutral"}
            />
            <StatTile
              value={missing.length}
              label="Sem registro"
              hint="do calendário nacional"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pb-14">
        {overdue.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">Reforço possivelmente vencido</h2>
            </div>
            <ul className="divide-y divide-border">
              {overdue.map((o) => (
                <li
                  key={o.name}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-sm"
                >
                  <span aria-hidden className="text-high">▲</span>
                  <span className="font-medium">{o.name}</span>
                  <span className="text-muted">
                    última dose em {fmt(o.since)} — há{" "}
                    {plural(Math.floor(o.elapsed), "ano", "anos")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border bg-surface-2 px-5 py-3 text-xs text-muted">
              Cálculo simples de intervalo, com base no que está registrado aqui.
              Confirme com quem cuida de você antes de qualquer decisão.
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {[...byVaccine.entries()].map(([vaccineId, list]) => (
            <article
              key={vaccineId}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-accent/30"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-medium">{list[0].vaccineName}</h2>
                <span className="text-xs text-muted-2">{list[0].disease}</span>
              </div>

              {/* Linha do tempo vertical: a sequência de doses é a informação,
                  e uma lista solta não deixa isso visível. */}
              <ol className="relative mt-4 space-y-3 border-l border-border pl-4">
                {[...list].reverse().map((d) => (
                  <li key={d.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-accent ring-4 ring-[var(--surface)]"
                    />
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium">{d.doseLabel ?? "dose"}</span>
                      <span className="tabular text-muted">{fmt(d.appliedAt)}</span>
                    </div>
                    {d.site && (
                      <div className="text-xs text-muted-2">{d.site}</div>
                    )}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>

        {missing.length > 0 && (
          <section className="mt-8 rounded-2xl border border-dashed border-border-strong p-5">
            <h2 className="text-sm font-semibold">Sem registro nesta carteira</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Do calendário nacional, não há dose registrada de{" "}
              {missing.map((v) => v.name).join(", ")}. Pode ser que a dose exista e
              simplesmente não tenha sido cadastrada aqui.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
