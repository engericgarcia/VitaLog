"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { flagColorVar } from "./FlagBadge";
import type { SeriesPoint } from "@/lib/queries";

const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${month}/${d.getFullYear()}`;
};

/**
 * Arredonda o domínio para números legíveis. Sem isto o eixo sai com 5,93 /
 * 35,93 / 65,93 — tick quebrado obriga o leitor a decodificar a escala antes de
 * ler o dado.
 */
function niceBounds(min: number, max: number): [number, number] {
  const span = max - min || Math.abs(max) || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const unit = span / 4 / step >= 5 ? step * 5 : span / 4 / step >= 2 ? step * 2 : step;
  return [Math.floor(min / unit) * unit, Math.ceil(max / unit) * unit];
}

/**
 * Série temporal de um analito.
 *
 * A linha usa o teal de acento, NUNCA uma cor de situação — verde/laranja aqui
 * significam "dentro/fora da referência" e reaproveitá-los para identidade de
 * série destruiria esse significado. Situação aparece só nos marcadores.
 *
 * A faixa de referência é desenhada como área de fundo: é o contexto que
 * transforma "42" em "42, e isso é bom".
 */
export function SeriesChart({
  points,
  unit,
  height = 300,
}: {
  points: SeriesPoint[];
  unit: string;
  height?: number;
}) {
  const refLow = points[points.length - 1]?.refLow ?? null;
  const refHigh = points[points.length - 1]?.refHigh ?? null;

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = dataMax - dataMin || Math.abs(dataMax) || 1;

  // A faixa de referência só entra no domínio se estiver perto dos dados. Sem
  // este limite, um teto de referência distante (vit. D vai até 100, os valores
  // ficam em 18–43) achata a trajetória inteira no rodapé do gráfico — o
  // contexto engoliria justamente o que o leitor veio ver.
  const nearLow = refLow !== null && refLow > dataMin - spread ? refLow : null;
  const nearHigh = refHigh !== null && refHigh < dataMax + spread ? refHigh : null;
  const [min, max] = niceBounds(
    Math.min(dataMin, nearLow ?? dataMin),
    Math.max(dataMax, nearHigh ?? dataMax),
  );
  const pad = (max - min) * 0.08;

  // Recortada ao domínio visível: a faixa continua dizendo "acima daqui é normal"
  // mesmo quando o teto fica fora da vista.
  const bandLow = refLow !== null ? Math.max(refLow, min - pad) : min - pad;
  const bandHigh = refHigh !== null ? Math.min(refHigh, max + pad) : max + pad;

  const data = points.map((p) => ({ ...p, label: fmtDate(p.date) }));
  const firstIdx = 0;
  const lastIdx = data.length - 1;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 34, bottom: 8, left: 4 }}>
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="var(--border)"
            strokeWidth={1}
          />

          {/* Faixa de referência do laboratório — o "normal" desenhado, não descrito. */}
          {(refLow !== null || refHigh !== null) && bandHigh > bandLow && (
            <ReferenceArea
              y1={bandLow}
              y2={bandHigh}
              fill="var(--band)"
              fillOpacity={1}
              stroke="none"
              ifOverflow="hidden"
            />
          )}
          {/* Linha no limite que estiver visível: marca a borda do "normal". */}
          {refLow !== null && refLow > min && refLow < max && (
            <ReferenceLine y={refLow} stroke="var(--border)" strokeWidth={1} />
          )}
          {refHigh !== null && refHigh > min && refHigh < max && (
            <ReferenceLine y={refHigh} stroke="var(--border)" strokeWidth={1} />
          )}

          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            height={28}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => (v >= 10000 ? `${v / 1000}k` : String(v))}
          />

          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SeriesPoint & { label: string };
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                  <div className="tabular font-semibold text-foreground">
                    {p.value} {unit}
                  </div>
                  <div className="mt-1 text-muted">
                    {new Date(`${p.date}T00:00:00`).toLocaleDateString("pt-BR")}
                    {p.labName ? ` · ${p.labName}` : ""}
                  </div>
                  {/* Mostra a grafia original: prova visível de que várias viraram uma série. */}
                  <div className="mt-0.5 text-muted">impresso como “{p.rawName}”</div>
                </div>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) => {
              const { cx, cy, index, payload } = props as {
                cx: number; cy: number; index: number; payload: SeriesPoint;
              };
              return (
                <g key={index}>
                  <circle cx={cx} cy={cy} r={5.5} fill="var(--surface)" />
                  <circle cx={cx} cy={cy} r={4} fill={flagColorVar(payload.flag)} />
                </g>
              );
            }}
            activeDot={{ r: 7, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            label={(props) => {
              // Rótulo direto só na primeira e na última medição — número em todo
              // ponto vira ruído e ninguém lê.
              const { x, y, index, value } = props as {
                x?: number | string; y?: number | string; index?: number; value?: number | string;
              };
              if (index !== firstIdx && index !== lastIdx) return <g key={index} />;
              return (
                <text
                  key={index}
                  x={Number(x)}
                  y={Number(y) - 12}
                  textAnchor={index === lastIdx ? "end" : "start"}
                  className="tabular"
                  fill="var(--foreground)"
                  fontSize={12}
                  fontWeight={600}
                >
                  {value}
                </text>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
