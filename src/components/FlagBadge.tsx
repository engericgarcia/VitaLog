/**
 * Indicador de situação do resultado.
 *
 * Cor NUNCA aparece sozinha: verde e laranja são o par clássico de confusão em
 * daltonismo (deutan/protan), e "dentro" vs "acima da referência" é justamente a
 * distinção que mais importa aqui. Por isso todo badge carrega glifo + texto —
 * a cor é reforço, não o canal de informação.
 */
const STYLES = {
  low: { label: "abaixo da referência", glyph: "▼", cls: "text-low border-low/30 bg-low/8" },
  normal: { label: "dentro da referência", glyph: "●", cls: "text-normal border-normal/30 bg-normal/8" },
  high: { label: "acima da referência", glyph: "▲", cls: "text-high border-high/30 bg-high/8" },
  abnormal: { label: "alterado", glyph: "▲", cls: "text-high border-high/30 bg-high/8" },
} as const;

export type FlagValue = keyof typeof STYLES;

export function FlagBadge({
  flag,
  compact = false,
}: {
  flag: string | null;
  compact?: boolean;
}) {
  if (!flag || !(flag in STYLES)) return null;
  const s = STYLES[flag as FlagValue];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      <span aria-hidden className="text-[0.65rem] leading-none">{s.glyph}</span>
      {compact ? s.label.split(" ")[0] : s.label}
    </span>
  );
}

export function flagColorVar(flag: string | null): string {
  if (flag === "low") return "var(--low)";
  if (flag === "high" || flag === "abnormal") return "var(--high)";
  if (flag === "normal") return "var(--normal)";
  return "var(--muted)";
}
