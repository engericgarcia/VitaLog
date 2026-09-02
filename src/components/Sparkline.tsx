import { flagColorVar } from "./FlagBadge";

/**
 * Sparkline em SVG puro — sem biblioteca e sem JS no cliente. Não tem eixo nem
 * rótulo de propósito: o número que importa está no card ao lado; a linha só
 * mostra a forma da trajetória. Último ponto marcado com a cor da situação.
 */
export function Sparkline({
  values,
  flag,
  width = 132,
  height = 34,
}: {
  values: number[];
  flag: string | null;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <div style={{ width, height }} />;

  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Tendência de ${values.length} medições`}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* anel na cor da superfície separa o marcador da linha */}
      <circle cx={lastX} cy={lastY} r={4.5} fill="var(--surface)" />
      <circle cx={lastX} cy={lastY} r={3} fill={flagColorVar(flag)} />
    </svg>
  );
}
