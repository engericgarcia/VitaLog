import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Você envia o PDF",
    body: "O mesmo arquivo que já chega por e-mail ou WhatsApp. Foto do laudo de papel também serve.",
  },
  {
    n: "02",
    title: "O extrator estrutura",
    body: "Analito, valor, unidade, faixa de referência e data saem em JSON validado — não em texto solto.",
  },
  {
    n: "03",
    title: "Você confere",
    body: "Nada entra na série sem revisão quando a confiança é baixa. Um ponto errado é pior que um ponto faltando.",
  },
  {
    n: "04",
    title: "O histórico vira gráfico",
    body: "“Glicemia de Jejum”, “GLICOSE” e “GLIC” de três laboratórios viram uma série só.",
  },
];

/** Ilustra o problema com dados reais de laudo brasileiro, não com texto. */
const SPELLINGS = [
  { lab: "Laboratório A", printed: "Glicemia de Jejum", unit: "mg/dL" },
  { lab: "Laboratório B", printed: "GLICOSE", unit: "mg/dL" },
  { lab: "Laboratório C", printed: "Glicose (jejum)", unit: "mg/dL" },
  { lab: "Laboratório D", printed: "GLIC", unit: "mmol/L" },
];

export default function Home() {
  return (
    <div>
      <section className="hero-glow border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <p className="text-sm font-medium text-accent">Histórico de saúde de uma vida</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Seus exames espalhados por seis laboratórios, em uma linha do tempo só.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            A dificuldade nunca foi guardar exame — é que cada laboratório escreve o
            mesmo exame de um jeito, em unidade diferente, num PDF diferente. O
            Vitalog lê o laudo, normaliza contra um catálogo ancorado em LOINC e monta
            a série histórica que ninguém consegue ver hoje.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/painel"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              Ver a conta de exemplo
            </Link>
            <Link
              href="/enviar"
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium shadow-sm transition-colors hover:border-accent/40 hover:text-accent"
            >
              Enviar um laudo
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-2">
            A conta de exemplo já vem com 7 anos de exames — dá para explorar sem enviar nada.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <section className="mt-14">
          <h2 className="text-sm font-semibold tracking-wide text-muted">
            O mesmo exame, quatro grafias
          </h2>
          <div className="scroll-subtle mt-3 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Origem</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Como imprime</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Unidade</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Vira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SPELLINGS.map((s) => (
                  <tr key={s.printed}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{s.lab}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">{s.printed}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-muted">{s.unit}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs text-accent">
                        glucose-fasting
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-2">
            Quatro grafias, duas unidades, um exame. Sem resolver isso, não existe
            gráfico — existem quatro listas separadas, e três você nem sabe que são a
            mesma coisa.
          </p>
        </section>

        <section className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-surface p-5">
              <div className="text-xs font-semibold tracking-widest text-accent">{s.n}</div>
              <h3 className="mt-2.5 font-medium">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="mb-16 mt-14 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-medium">Sobre os dados</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Dado de saúde é dado pessoal sensível pela LGPD (Art. 5º, II). Este é um
            projeto de portfólio: a conta de demonstração usa dados{" "}
            <strong className="font-medium text-foreground">inteiramente sintéticos</strong>,
            os nomes de laboratório são fictícios, e nada aqui deve receber informação
            real de saúde de ninguém. As faixas de referência exibidas são as do
            próprio laudo — o app não interpreta resultado nem substitui avaliação médica.
          </p>
        </section>
      </div>
    </div>
  );
}
