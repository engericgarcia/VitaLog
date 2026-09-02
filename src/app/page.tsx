import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Você envia o PDF do laboratório",
    body: "O mesmo arquivo que já chega por e-mail ou WhatsApp. Foto do laudo de papel também serve.",
  },
  {
    n: "02",
    title: "O extrator lê e estrutura",
    body: "Analito, valor, unidade, faixa de referência e data da coleta saem em JSON validado — não em texto solto.",
  },
  {
    n: "03",
    title: "Você confere o que foi lido",
    body: "Nada entra na série sem passar por revisão quando a confiança é baixa. Um ponto errado é pior que um ponto faltando.",
  },
  {
    n: "04",
    title: "O histórico vira gráfico",
    body: "“Glicemia de Jejum”, “GLICOSE” e “GLIC” de três laboratórios diferentes viram uma série só.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Histórico de saúde de uma vida</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Seus exames espalhados por seis laboratórios, em uma linha do tempo só.
        </h1>
        <p className="mt-5 text-lg text-muted">
          A dificuldade nunca foi guardar exame — é que cada laboratório escreve o
          mesmo exame de um jeito, em unidade diferente, num PDF diferente. O
          Vitalog lê o laudo, normaliza contra um catálogo ancorado em LOINC e
          monta a série histórica que ninguém consegue ver hoje.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/painel"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Ver a conta de exemplo
          </Link>
          <Link
            href="/enviar"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent-soft"
          >
            Enviar um laudo
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted">
          A conta de exemplo já vem com 7 anos de exames — dá para explorar sem
          enviar nada.
        </p>
      </section>

      <section className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-surface p-5">
            <div className="text-xs font-semibold tracking-widest text-accent">{s.n}</div>
            <h2 className="mt-2.5 font-medium">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-medium">Sobre os dados</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Dado de saúde é dado pessoal sensível pela LGPD (Art. 5º, II). Este é um
          projeto de portfólio: a conta de demonstração usa dados{" "}
          <strong className="font-medium text-foreground">inteiramente sintéticos</strong>,
          os nomes de laboratório são fictícios, e nada aqui deve receber
          informação real de saúde de ninguém. As faixas de referência exibidas são
          as do próprio laudo — o app não interpreta resultado nem substitui
          avaliação médica.
        </p>
      </section>
    </div>
  );
}
