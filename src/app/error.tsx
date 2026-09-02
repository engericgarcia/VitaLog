"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Algo quebrou aqui</h1>
      <p className="mt-2 text-muted">
        A página não conseguiu carregar. O erro foi registrado no console.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted">digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Tentar de novo
      </button>
    </div>
  );
}
