import Link from "next/link";

/**
 * Tela mostrada quando o banco não responde.
 *
 * O caso comum não é "o Supabase caiu" — é alguém que acabou de clonar o repo e
 * ainda não criou o .env.local. Um stack trace aqui faz a pessoa desistir; uma
 * lista de três comandos faz ela continuar.
 */
export function SetupNotice({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Banco não configurado</h1>
      <p className="mt-2 text-muted">{reason}</p>

      <ol className="mt-7 space-y-4 text-sm">
        <li className="rounded-xl border border-border bg-surface p-4">
          <div className="font-medium">1. Crie um projeto no Supabase</div>
          <p className="mt-1 text-muted">
            Em <span className="font-mono text-xs">Settings → Database → Connection string</span>,
            copie a URL do <strong className="font-medium text-foreground">Transaction pooler</strong>{" "}
            (porta 6543) e a da conexão direta (porta 5432).
          </p>
        </li>
        <li className="rounded-xl border border-border bg-surface p-4">
          <div className="font-medium">2. Preencha o .env.local</div>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs text-muted">
{`cp .env.example .env.local
# cole DATABASE_URL (6543) e DIRECT_URL (5432)`}
          </pre>
        </li>
        <li className="rounded-xl border border-border bg-surface p-4">
          <div className="font-medium">3. Aplique o schema e popule</div>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs text-muted">
{`npm run db:seed`}
          </pre>
        </li>
      </ol>

      <p className="mt-6 text-sm text-muted">
        Depois disso, volte para o{" "}
        <Link href="/painel" className="text-accent underline">painel</Link>.
      </p>
    </div>
  );
}

/**
 * Traduz a falha em algo acionável. Mensagem de driver de banco é escrita para
 * quem mantém o driver, não para quem está tentando rodar o projeto.
 */
export function describeDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("Configuração de ambiente inválida") || msg.includes("DATABASE_URL")) {
    return "A variável DATABASE_URL não está definida ou não é uma URL Postgres válida.";
  }
  if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN") || msg.includes("getaddrinfo")) {
    return "O host do banco não foi encontrado. Confira se a connection string foi copiada inteira.";
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
    return "Não foi possível conectar ao banco. Ele pode estar pausado — projetos gratuitos do Supabase hibernam após alguns dias sem uso.";
  }
  if (msg.includes("password") || msg.includes("authentication")) {
    return "Autenticação recusada. Verifique a senha dentro da connection string.";
  }
  if (msg.includes('relation "') && msg.includes("does not exist")) {
    return "As tabelas ainda não existem neste banco. Rode `npm run db:seed` para aplicar o schema.";
  }
  return `Falha ao consultar o banco: ${msg}`;
}
