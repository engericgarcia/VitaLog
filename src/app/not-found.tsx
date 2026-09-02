import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 text-muted">
        Esse endereço não existe — pode ser um exame que ainda não tem medição
        registrada.
      </p>
      <Link
        href="/painel"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Ir para o painel
      </Link>
    </div>
  );
}
