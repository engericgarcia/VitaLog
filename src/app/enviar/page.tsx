import { hasExtractionKey } from "@/lib/env";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";

/**
 * A mensagem de "extração desligada" tem dois públicos diferentes.
 *
 * Em desenvolvimento quem lê é quem clonou o repositório, e precisa de
 * instrução acionável. Em produção quem lê é um visitante do portfólio, para
 * quem "edite o .env.local" não significa nada — ele precisa entender por que
 * o botão não está lá, não como consertar a máquina de outra pessoa.
 */
function ExtractionDisabled({ isProd }: { isProd: boolean }) {
  if (isProd) {
    return (
      <div className="mt-7 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">Envio desligado nesta demonstração</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Ler um laudo custa uma chamada à API do Claude, e esta é uma demonstração
          aberta — deixar o envio ligado significaria pagar pelo upload de qualquer
          pessoa que passe por aqui.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          O pipeline de extração está no repositório e funciona: rodando o projeto
          localmente com uma chave própria, esta tela lê o PDF, estrutura os
          resultados e devolve para conferência. O que você vê no{" "}
          <a href="/painel" className="text-accent underline">painel</a> é o
          resultado desse fluxo.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">Extração indisponível</h2>
      <p className="mt-1.5 text-sm text-muted">
        Falta a variável{" "}
        <code className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">
          ANTHROPIC_API_KEY
        </code>{" "}
        no <code className="font-mono text-xs">.env.local</code>. O resto do app
        funciona normalmente sem ela — só o envio de laudos depende da API.
      </p>
      <p className="mt-3 text-sm text-muted">
        Crie uma chave em{" "}
        <span className="font-mono text-xs">console.anthropic.com</span>, cole no
        arquivo e reinicie o servidor de desenvolvimento.
      </p>
    </div>
  );
}

export default function Enviar() {
  const enabled = hasExtractionKey();
  const isProd = process.env.NODE_ENV === "production";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Enviar laudo</h1>
      <p className="mt-2 text-muted">
        PDF do laboratório ou foto do laudo de papel. O extrator lê, estrutura e
        devolve para você conferir — nada entra no histórico sem revisão.
      </p>

      {/* Melhor dizer antes que a extração está desligada do que deixar a pessoa
          escolher um arquivo, esperar e só então receber um erro. */}
      {enabled ? <UploadForm /> : <ExtractionDisabled isProd={isProd} />}
    </div>
  );
}
