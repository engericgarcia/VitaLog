/**
 * Esqueleto com a forma real da página (cabeçalho + grade de cards), para o
 * conteúdo não "pular" quando chegar. Sem animação de pulso: em tela cheia ela
 * cansa mais do que informa.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-56 rounded-md bg-border/60" />
      <div className="mt-3 h-4 w-80 rounded-md bg-border/40" />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
