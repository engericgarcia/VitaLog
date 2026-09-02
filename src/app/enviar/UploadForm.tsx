"use client";

import Link from "next/link";
import { useState } from "react";
import { FlagBadge } from "@/components/FlagBadge";
import type { NormalizedResult } from "@/lib/extraction/normalize";

interface UploadResponse {
  reportId: string;
  labName: string | null;
  collectedAt: string | null;
  total: number;
  reviewCount: number;
  results: NormalizedResult[];
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);

    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Falha ao processar o laudo.");
      else setResult(json as UploadResponse);
    } catch {
      setError("Não foi possível falar com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-7 rounded-xl border border-border bg-surface p-5">
        <label className="block text-sm font-medium" htmlFor="file">
          Arquivo do laudo
        </label>
        <input
          id="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
        />
        <p className="mt-2 text-xs text-muted">PDF, PNG, JPEG ou WebP · até 12 MB</p>

        <button
          type="submit"
          disabled={!file || busy}
          className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Lendo o laudo…" : "Extrair resultados"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-high/30 bg-high/8 p-4 text-sm">
          <span aria-hidden className="mr-2 text-high">▲</span>
          {error}
        </div>
      )}

      {result && (
        <section className="mt-7">
          <h2 className="font-medium">
            {result.total} resultados lidos
            {result.labName ? ` · ${result.labName}` : ""}
            {result.collectedAt ? ` · coleta em ${result.collectedAt}` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {result.reviewCount > 0
              ? `${result.reviewCount} precisam da sua conferência antes de entrar no histórico.`
              : "Todos foram reconhecidos com confiança alta."}
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Impresso no laudo</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Reconhecido como</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{r.rawName}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5">
                      {r.valueNum ?? r.valueText} {r.rawUnit ?? ""}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.analyteId ? (
                        <span className="text-muted">{r.analyteId}</span>
                      ) : (
                        <span className="text-high">não reconhecido</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.needsReview ? (
                        <span className="text-xs text-muted">{r.reviewReasons.join(" · ")}</span>
                      ) : (
                        <FlagBadge flag={r.flag} compact />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.reviewCount > 0 && (
            <Link
              href="/revisar"
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Conferir os {result.reviewCount} pendentes
            </Link>
          )}
        </section>
      )}
    </>
  );
}
