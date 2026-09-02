import Link from "next/link";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { DEMO_USER_ID, getAnalyteCatalog, getReviewQueue } from "@/lib/queries";
import { ReviewQueue } from "./ReviewQueue";

export const dynamic = "force-dynamic";

/**
 * Fila vazia é o estado NORMAL desta tela, não uma falha.
 *
 * Por isso ela não se desculpa: explica a garantia que o produto oferece, que é
 * justamente o motivo de existir. Quem chega aqui pela navegação, sem ter
 * enviado nada, precisa entender o que este lugar faz.
 */
function EmptyQueue({ isDev }: { isDev: boolean }) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10">
      <div className="mx-auto max-w-lg text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-xl text-accent"
        >
          ✓
        </span>
        <h2 className="mt-4 text-lg font-medium">Nada para conferir</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tudo que foi enviado até agora já está no histórico. Esta fila se enche
          quando o extrator lê algo com confiança baixa ou encontra um exame que
          não existe no catálogo — e enquanto o resultado estiver aqui, ele{" "}
          <strong className="font-medium text-foreground">não entra na sua série</strong>.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/enviar"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Enviar um laudo
          </Link>
          <Link
            href="/painel"
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/40 hover:text-accent"
          >
            Ver o painel
          </Link>
        </div>

        {isDev && (
          <p className="mt-6 border-t border-border pt-4 text-xs text-muted-2">
            Para exercitar esta tela sem chave de API, rode{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">
              npm run db:review-case
            </code>
          </p>
        )}
      </div>
    </div>
  );
}

export default async function Revisar() {
  let queue, analytes;
  try {
    [queue, analytes] = await Promise.all([
      getReviewQueue(DEMO_USER_ID),
      getAnalyteCatalog(),
    ]);
  } catch (err) {
    return <SetupNotice reason={describeDbError(err)} />;
  }

  return (
    <div>
      <div className="hero-glow border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <h1 className="text-3xl font-semibold tracking-tight">Conferência</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted">
            Resultados que o extrator não reconheceu com segurança. Nenhum entra na
            série antes de você confirmar — e o que você confirmar aqui ensina o
            catálogo a reconhecer aquela grafia sozinho da próxima vez.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pb-14">
        {queue.length === 0 ? (
          <EmptyQueue isDev={process.env.NODE_ENV !== "production"} />
        ) : (
          <ReviewQueue items={queue} analytes={analytes} />
        )}
      </div>
    </div>
  );
}
