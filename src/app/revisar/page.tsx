import Link from "next/link";
import { SetupNotice, describeDbError } from "@/components/SetupNotice";
import { DEMO_USER_ID, getAnalyteCatalog, getReviewQueue } from "@/lib/queries";
import { ReviewRow } from "./ReviewRow";

export const dynamic = "force-dynamic";

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
        <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-medium">Nada para conferir</p>
          <p className="mt-1 text-sm text-muted">
            Tudo que foi enviado até agora já está no histórico.
          </p>
          <Link
            href="/enviar"
            className="mt-5 inline-block rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent-soft"
          >
            Enviar um laudo
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {queue.length} {queue.length === 1 ? "resultado aguardando" : "resultados aguardando"}
          </p>
          <ul className="mt-3 space-y-3">
            {queue.map((item) => (
              <ReviewRow key={item.id} item={item} analytes={analytes} />
            ))}
          </ul>
        </>
        )}
      </div>
    </div>
  );
}
