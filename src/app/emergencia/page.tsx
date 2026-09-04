import Link from "next/link";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { DEMO_USER_ID, getEmergencyRecord } from "@/lib/queries";
import type { Allergy, Condition, Device, Procedure } from "@/db/schema";

export const dynamic = "force-dynamic";

const fmt = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "data não informada";

const age = (birth: string | null) => {
  if (!birth) return null;
  const d = new Date(`${birth}T00:00:00`);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

/**
 * Bloco de "não há registro".
 *
 * Existe porque a distinção mais perigosa desta tela é entre "esta pessoa não
 * tem alergia" e "ninguém registrou alergia nenhuma". Um campo vazio, em
 * triagem, é lido como a primeira coisa — e é a segunda. Então nunca fica
 * vazio: fica dizendo explicitamente que não sabe.
 */
function NoRecord({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-sm text-muted">
      Nenhum registro de {what}.{" "}
      <strong className="font-medium text-foreground">
        Ausência de registro não é ausência de {what}
      </strong>{" "}
      — confirme com o paciente ou acompanhante.
    </p>
  );
}

const SEVERITY_STYLE: Record<Allergy["severity"], string> = {
  anafilaxia: "border-high bg-high/10 text-high",
  grave: "border-high/50 bg-high/5 text-high",
  moderada: "border-border-strong bg-surface-2 text-foreground",
  leve: "border-border bg-surface-2 text-muted",
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-2">{count}</span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function Emergencia() {
  let record;
  try {
    record = await getEmergencyRecord(DEMO_USER_ID);
  } catch (err) {
    return <SetupNotice reason={describeDbError(err)} />;
  }

  const { user, allergies, conditions, procedures, devices } = record;
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Sem dados</h1>
        <p className="mt-2 text-muted">
          Rode <code className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">npm run db:seed</code>.
        </p>
      </div>
    );
  }

  const years = age(user.birthDate);
  const critical = conditions.filter((c) => c.criticalForTriage || c.status === "ativa");
  const resolved = conditions.filter((c) => !critical.includes(c));
  const surgeries = procedures.filter((p) => p.kind === "cirurgia");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 pb-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-high">
            Triagem · dados críticos
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {years !== null ? `${years} anos` : "idade não informada"}
            {user.birthDate ? ` · nascida em ${fmt(user.birthDate)}` : ""}
          </p>
        </div>
        <Link
          href="/painel"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-accent"
        >
          Sair da triagem
        </Link>
      </div>

      {/* Tipo sanguíneo primeiro: é a pergunta mais urgente e a mais fácil de errar. */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold tracking-wide">Tipo sanguíneo</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-4xl font-semibold leading-none tracking-tight">
            {user.bloodType ?? "—"}
          </span>
          {user.bloodType ? (
            <span className="text-sm text-muted">
              {user.bloodTypeSource === "laboratorio"
                ? "confirmado por laboratório"
                : user.bloodTypeSource === "carteira"
                  ? "copiado da carteirinha"
                  : "informado pelo paciente"}
            </span>
          ) : (
            <span className="text-sm text-muted">não registrado</span>
          )}
        </div>
        {/* Três estados distintos, e confundi-los é perigoso: tipo confirmado
            em laboratório, tipo de origem duvidosa, e nenhum tipo registrado.
            Só o do meio merece o aviso de transfusão. */}
        {!user.bloodType ? (
          <p className="mt-3 rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm text-muted">
            Nenhum tipo sanguíneo registrado.{" "}
            <strong className="font-medium text-foreground">
              Ausência de registro não é ausência de informação
            </strong>{" "}
            — tipe antes de qualquer transfusão.
          </p>
        ) : user.bloodTypeSource !== "laboratorio" ? (
          <p className="mt-3 rounded-lg border border-high/30 bg-high/5 px-3 py-2 text-sm text-high">
            <span aria-hidden className="mr-1.5">▲</span>
            Origem não laboratorial — <strong className="font-medium">não use para transfundir</strong>.
            Refaça a tipagem.
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid gap-4">
        <Section title="Alergias" count={allergies.length}>
          {allergies.length === 0 ? (
            <NoRecord what="alergia" />
          ) : (
            <ul className="space-y-2">
              {allergies.map((a: Allergy) => (
                <li
                  key={a.id}
                  className={`rounded-lg border px-3 py-2.5 ${SEVERITY_STYLE[a.severity]}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {(a.severity === "anafilaxia" || a.severity === "grave") && (
                      <span aria-hidden>▲</span>
                    )}
                    <span className="font-semibold">{a.substance}</span>
                    <span className="text-xs uppercase tracking-wide opacity-80">
                      {a.severity}
                    </span>
                  </div>
                  {a.reaction && (
                    <div className="mt-0.5 text-sm opacity-90">{a.reaction}</div>
                  )}
                  <div className="mt-0.5 text-xs opacity-70">
                    {a.category} · registrado em {fmt(a.notedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Dispositivos implantados" count={devices.length}>
          {devices.length === 0 ? (
            <NoRecord what="dispositivo implantado" />
          ) : (
            <ul className="space-y-2">
              {devices.map((d: Device) => (
                <li key={d.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                  <div className="font-medium">{d.name}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {[d.manufacturer, d.model].filter(Boolean).join(" ")} · implantado em{" "}
                    {fmt(d.implantedAt)}
                  </div>
                  {/* Compatibilidade com ressonância: null é "não se sabe", que é
                      diferente de "não pode" — e a tela não pode achatar os dois. */}
                  <div className="mt-1.5 text-sm">
                    {d.mriSafe === true ? (
                      <span className="text-normal">● Compatível com ressonância</span>
                    ) : d.mriSafe === false ? (
                      <span className="font-medium text-high">▲ NÃO fazer ressonância</span>
                    ) : (
                      <span className="text-high">
                        ▲ Compatibilidade com ressonância desconhecida — verificar antes
                      </span>
                    )}
                  </div>
                  {d.notes && <div className="mt-1 text-xs text-muted-2">{d.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Condições e comorbidades" count={conditions.length}>
          {conditions.length === 0 ? (
            <NoRecord what="condição" />
          ) : (
            <ul className="space-y-1.5">
              {[...critical, ...resolved].map((c: Condition) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  {c.icd10 && <span className="text-xs text-muted-2">{c.icd10}</span>}
                  <span className="text-xs text-muted">{c.status}</span>
                  {c.criticalForTriage && (
                    <span className="rounded-full border border-high/40 px-2 py-0.5 text-xs text-high">
                      relevante na triagem
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Cirurgias e procedimentos" count={procedures.length}>
          {procedures.length === 0 ? (
            <NoRecord what="cirurgia ou procedimento" />
          ) : (
            <ul className="space-y-1.5">
              {procedures.map((p: Procedure) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    {p.facility && <span className="ml-2 text-muted-2">{p.facility}</span>}
                  </span>
                  <span className="tabular text-muted">{fmt(p.performedAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {surgeries.length > 0 && (
            <p className="mt-2 text-xs text-muted-2">
              {surgeries.length} {surgeries.length === 1 ? "cirurgia" : "cirurgias"} no
              histórico — relevante para anestesia e via aérea.
            </p>
          )}
        </Section>
      </div>

      <p className="mt-6 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
        Esta tela reúne o que foi registrado neste app — ela não é um prontuário
        oficial e não substitui a anamnese. Dados de demonstração são sintéticos.
      </p>
    </div>
  );
}
