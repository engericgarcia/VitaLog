import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { DEMO_USER_ID, getUser, getVaccinations, getVaccineCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const yearsSince = (iso: string) =>
  (Date.now() - new Date(`${iso}T00:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000);

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
   * do imunizante. É um lembrete de agenda, não conduta clínica — por isso o
   * texto diz "converse com quem cuida de você" e não "tome a vacina".
   */
  const overdue = [...byVaccine.entries()].flatMap(([, list]) => {
    const latest = list[0];
    const interval = latest.boosterIntervalYears;
    if (!interval) return [];
    const elapsed = yearsSince(latest.appliedAt);
    return elapsed > interval
      ? [{ name: latest.vaccineName, since: latest.appliedAt, elapsed }]
      : [];
  });

  const missing = catalog.filter((v) => !byVaccine.has(v.id) && v.partOfNationalSchedule);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carteira de vacinas</h1>
          <p className="mt-1 text-sm text-muted">
            {doses.length} doses registradas · {byVaccine.size} imunizantes
          </p>
        </div>
        {user?.isDemo && (
          <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            conta de exemplo
          </span>
        )}
      </header>

      {overdue.length > 0 && (
        <section className="mt-7 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Reforço possivelmente vencido</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {overdue.map((o) => (
              <li key={o.name} className="flex flex-wrap items-baseline gap-x-2">
                <span aria-hidden className="text-high">▲</span>
                <span className="font-medium">{o.name}</span>
                <span className="text-muted">
                  última dose em {fmt(o.since)} — há {plural(Math.floor(o.elapsed), "ano", "anos")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Cálculo simples de intervalo, com base no que está registrado aqui.
            Confirme com quem cuida de você antes de qualquer decisão.
          </p>
        </section>
      )}

      <section className="mt-8 space-y-3">
        {[...byVaccine.entries()].map(([vaccineId, list]) => (
          <article key={vaccineId} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{list[0].vaccineName}</h2>
              <span className="text-xs text-muted">{list[0].disease}</span>
            </div>
            <ol className="mt-3 space-y-2">
              {[...list].reverse().map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="tabular w-24 shrink-0 whitespace-nowrap text-muted">{fmt(d.appliedAt)}</span>
                  <span className="font-medium">{d.doseLabel ?? "dose"}</span>
                  {d.site && <span className="text-muted">{d.site}</span>}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      {missing.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Sem registro nesta carteira</h2>
          <p className="mt-1.5 text-sm text-muted">
            Do calendário nacional, não há dose registrada de:{" "}
            {missing.map((v) => v.name).join(", ")}. Pode ser que a dose exista e não
            tenha sido cadastrada.
          </p>
        </section>
      )}
    </div>
  );
}
