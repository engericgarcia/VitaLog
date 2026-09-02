/**
 * Número de resumo no topo do painel.
 *
 * Sem `tabular-nums` de propósito: largura fixa de dígito serve para comparar
 * números empilhados numa tabela, mas deixa um número grande e isolado com
 * espaçamento frouxo.
 */
export function StatTile({
  value,
  label,
  hint,
  tone = "neutral",
}: {
  value: string | number;
  label: string;
  hint?: string;
  tone?: "neutral" | "alert";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <div
        className={`text-2xl font-semibold leading-none ${
          tone === "alert" ? "text-high" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs font-medium text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-2">{hint}</div>}
    </div>
  );
}
