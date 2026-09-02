import { BY_ID, normalizeName } from "@/lib/clinical/catalog";

/**
 * Conversão para a unidade canônica do catálogo.
 *
 * Laboratório brasileiro costuma usar unidade convencional (mg/dL), mas laudo
 * internacional e alguns aparelhos usam SI (mmol/L). Sem converter, o gráfico
 * de colesterol de quem fez um exame fora do país tem um degrau falso.
 *
 * Fatores são multiplicativos: canonico = valor * fator.
 */
const FACTORS: Record<string, Record<string, number>> = {
  "glucose-fasting": { "mmol/l": 18.0182 },
  "cholesterol-total": { "mmol/l": 38.67 },
  "cholesterol-hdl": { "mmol/l": 38.67 },
  "cholesterol-ldl": { "mmol/l": 38.67 },
  triglycerides: { "mmol/l": 88.57 },
  creatinine: { "umol/l": 1 / 88.4, "µmol/l": 1 / 88.4 },
  urea: { "mmol/l": 6.006 },
  "uric-acid": { "umol/l": 1 / 59.48, "µmol/l": 1 / 59.48 },
  "vitamin-d": { "nmol/l": 1 / 2.496 },
  "vitamin-b12": { "pmol/l": 1 / 0.738 },
  iron: { "umol/l": 5.587, "µmol/l": 5.587 },
  // Contagens: laudo alterna entre /mm³ e 10³/µL (mil por µL).
  leukocytes: { "10^3/ul": 1000, "10³/µl": 1000, "mil/mm3": 1000, "k/ul": 1000 },
  platelets: { "10^3/ul": 1000, "10³/µl": 1000, "mil/mm3": 1000, "k/ul": 1000 },
  ferritin: { "ug/l": 1, "µg/l": 1 }, // µg/L é numericamente igual a ng/mL
  crp: { "mg/dl": 10 },
};

/** Unidades que são a mesma coisa escrita de outro jeito. */
const SYNONYMS: Record<string, string> = {
  "mg/dl": "mg/dl",
  "mgdl": "mg/dl",
  "u/l": "u/l",
  "ui/l": "u/l",
  "g/dl": "g/dl",
  "ng/ml": "ng/ml",
  "pg/ml": "pg/ml",
  "uui/ml": "µui/ml",
  "µui/ml": "µui/ml",
  "uiu/ml": "µui/ml",
  // mUI/L (pt) e mIU/L (en) são ambos numericamente iguais a µUI/mL.
  // Atenção: mUI/mL NÃO entra aqui — é mil vezes maior.
  "mui/l": "µui/ml",
  "miu/l": "µui/ml",
  "ug/dl": "µg/dl",
  "µg/dl": "µg/dl",
};

function canonUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const u = unit.trim().toLowerCase().replace(/\s+/g, "");
  return SYNONYMS[u] ?? u;
}

export interface Converted {
  value: number;
  unit: string;
  /** true quando o valor foi multiplicado por um fator (útil para exibir "convertido"). */
  converted: boolean;
}

/**
 * Devolve o valor na unidade canônica do analito, ou null quando a unidade do
 * laudo é desconhecida — nesse caso o resultado vai para revisão humana em vez
 * de entrar torto na série. Preferimos um buraco no gráfico a um ponto errado.
 */
export function toCanonical(
  analyteId: string,
  value: number,
  rawUnit: string | null,
): Converted | null {
  const entry = BY_ID.get(analyteId);
  if (!entry) return null;

  const target = canonUnit(entry.unit);
  const source = canonUnit(rawUnit);

  // Sem unidade no laudo: assumimos a canônica (comum em % e contagens).
  if (!source) return { value, unit: entry.unit, converted: false };
  if (source === target) return { value, unit: entry.unit, converted: false };

  const factor = FACTORS[analyteId]?.[source];
  if (factor === undefined) return null;

  return {
    value: Number((value * factor).toPrecision(6)),
    unit: entry.unit,
    converted: true,
  };
}

export type Flag = "low" | "normal" | "high";

/**
 * Marca o resultado contra a faixa de referência. A faixa do LAUDO tem
 * precedência sobre a do catálogo — método e população variam por laboratório.
 */
export function computeFlag(
  value: number,
  refLow: number | null,
  refHigh: number | null,
): Flag | null {
  if (refLow === null && refHigh === null) return null;
  if (refLow !== null && value < refLow) return "low";
  if (refHigh !== null && value > refHigh) return "high";
  return "normal";
}

export { normalizeName };
