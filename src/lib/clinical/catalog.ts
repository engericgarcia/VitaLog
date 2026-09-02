/**
 * Catálogo canônico de analitos.
 *
 * ┌─ ATENÇÃO ────────────────────────────────────────────────────────────────┐
 * │ Os códigos LOINC abaixo foram levantados como ponto de partida e ainda   │
 * │ NÃO foram conferidos um a um contra a base oficial (https://loinc.org).  │
 * │ Antes de qualquer uso clínico ou de interoperabilidade real, rode a      │
 * │ conferência. Para o produto funcionar (agrupar séries), o que importa é  │
 * │ o `id` canônico — o LOINC é para trocar dado com outros sistemas.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * As faixas de referência são genéricas de adulto. A faixa do laudo SEMPRE tem
 * precedência: laboratórios calibram método e população de formas diferentes.
 */

export type AnalyteCategory =
  | "hematologia"
  | "bioquimica"
  | "lipidograma"
  | "hormonios"
  | "vitaminas"
  | "inflamacao"
  | "marcadores";

export interface CatalogEntry {
  id: string;
  loinc: string | null;
  namePt: string;
  nameEn: string;
  category: AnalyteCategory;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  higherIsBetter?: boolean;
  description?: string;
  /** Grafias reais vistas em laudos brasileiros. Normalizadas na ingestão. */
  aliases: string[];
}

export const CATALOG: CatalogEntry[] = [
  // ─── Hematologia ────────────────────────────────────────────────────────
  {
    id: "hemoglobin",
    loinc: "718-7",
    namePt: "Hemoglobina",
    nameEn: "Hemoglobin",
    category: "hematologia",
    unit: "g/dL",
    refLow: 12.0,
    refHigh: 17.5,
    aliases: ["hemoglobina", "hb", "hgb", "hemoglobina hb"],
  },
  {
    id: "hematocrit",
    loinc: "4544-3",
    namePt: "Hematócrito",
    nameEn: "Hematocrit",
    category: "hematologia",
    unit: "%",
    refLow: 36,
    refHigh: 52,
    aliases: ["hematocrito", "ht", "hct"],
  },
  {
    id: "erythrocytes",
    loinc: "789-8",
    namePt: "Eritrócitos",
    nameEn: "Erythrocytes",
    category: "hematologia",
    unit: "milhões/mm³",
    refLow: 4.0,
    refHigh: 5.9,
    aliases: ["eritrocitos", "hemacias", "hemácias", "glóbulos vermelhos", "globulos vermelhos", "rbc"],
  },
  {
    id: "leukocytes",
    loinc: "6690-2",
    namePt: "Leucócitos",
    nameEn: "Leukocytes",
    category: "hematologia",
    unit: "/mm³",
    refLow: 4000,
    refHigh: 11000,
    aliases: ["leucocitos", "leucocitos totais", "globulos brancos", "glóbulos brancos", "wbc"],
  },
  {
    id: "platelets",
    loinc: "777-3",
    namePt: "Plaquetas",
    nameEn: "Platelets",
    category: "hematologia",
    unit: "/mm³",
    refLow: 150000,
    refHigh: 450000,
    aliases: ["plaquetas", "plt", "contagem de plaquetas"],
  },
  {
    id: "mcv",
    loinc: "787-2",
    namePt: "VCM",
    nameEn: "Mean corpuscular volume",
    category: "hematologia",
    unit: "fL",
    refLow: 80,
    refHigh: 100,
    aliases: ["vcm", "volume corpuscular medio", "volume corpuscular médio"],
  },

  // ─── Bioquímica ─────────────────────────────────────────────────────────
  {
    id: "glucose-fasting",
    loinc: "1558-6",
    namePt: "Glicose em jejum",
    nameEn: "Fasting glucose",
    category: "bioquimica",
    unit: "mg/dL",
    refLow: 70,
    refHigh: 99,
    description: "≥126 mg/dL em duas ocasiões sugere diabetes; 100–125, pré-diabetes.",
    aliases: [
      "glicose", "glicemia", "glicemia de jejum", "glicose em jejum",
      "glicose jejum", "glic", "glicemia jejum", "glicose serica", "glicose sérica",
    ],
  },
  {
    id: "hba1c",
    loinc: "4548-4",
    namePt: "Hemoglobina glicada",
    nameEn: "Hemoglobin A1c",
    category: "bioquimica",
    unit: "%",
    refLow: null,
    refHigh: 5.7,
    description: "Média glicêmica dos últimos ~3 meses.",
    aliases: [
      "hemoglobina glicada", "hemoglobina glicosilada", "hba1c", "a1c",
      "hb glicada", "hemoglobina glicada a1c",
    ],
  },
  {
    id: "creatinine",
    loinc: "2160-0",
    namePt: "Creatinina",
    nameEn: "Creatinine",
    category: "bioquimica",
    unit: "mg/dL",
    refLow: 0.6,
    refHigh: 1.3,
    aliases: ["creatinina", "creatinina serica", "creatinina sérica", "creat"],
  },
  {
    id: "urea",
    loinc: "22664-7",
    namePt: "Ureia",
    nameEn: "Urea",
    category: "bioquimica",
    unit: "mg/dL",
    refLow: 15,
    refHigh: 45,
    aliases: ["ureia", "uréia", "ureia serica", "uréia sérica"],
  },
  {
    id: "uric-acid",
    loinc: "3084-1",
    namePt: "Ácido úrico",
    nameEn: "Uric acid",
    category: "bioquimica",
    unit: "mg/dL",
    refLow: 2.4,
    refHigh: 7.0,
    aliases: ["acido urico", "ácido úrico", "urato"],
  },
  {
    id: "ast",
    loinc: "1920-8",
    namePt: "TGO / AST",
    nameEn: "Aspartate aminotransferase",
    category: "bioquimica",
    unit: "U/L",
    refLow: null,
    refHigh: 40,
    aliases: ["tgo", "ast", "tgo ast", "ast tgo", "aspartato aminotransferase", "transaminase oxalacetica"],
  },
  {
    id: "alt",
    loinc: "1742-6",
    namePt: "TGP / ALT",
    nameEn: "Alanine aminotransferase",
    category: "bioquimica",
    unit: "U/L",
    refLow: null,
    refHigh: 41,
    aliases: ["tgp", "alt", "tgp alt", "alt tgp", "alanina aminotransferase", "transaminase piruvica"],
  },
  {
    id: "ggt",
    loinc: "2324-2",
    namePt: "Gama GT",
    nameEn: "Gamma-glutamyl transferase",
    category: "bioquimica",
    unit: "U/L",
    refLow: null,
    refHigh: 60,
    aliases: ["gama gt", "gama glutamil transferase", "ggt", "gamma gt", "y-gt"],
  },
  {
    id: "alkaline-phosphatase",
    loinc: "6768-6",
    namePt: "Fosfatase alcalina",
    nameEn: "Alkaline phosphatase",
    category: "bioquimica",
    unit: "U/L",
    refLow: 40,
    refHigh: 130,
    aliases: ["fosfatase alcalina", "fa", "alp"],
  },

  // ─── Lipidograma ────────────────────────────────────────────────────────
  {
    id: "cholesterol-total",
    loinc: "2093-3",
    namePt: "Colesterol total",
    nameEn: "Total cholesterol",
    category: "lipidograma",
    unit: "mg/dL",
    refLow: null,
    refHigh: 190,
    aliases: ["colesterol total", "colesterol", "col total", "ct"],
  },
  {
    id: "cholesterol-hdl",
    loinc: "2085-9",
    namePt: "HDL",
    nameEn: "HDL cholesterol",
    category: "lipidograma",
    unit: "mg/dL",
    refLow: 40,
    refHigh: null,
    higherIsBetter: true,
    aliases: ["hdl", "colesterol hdl", "hdl colesterol", "hdl c"],
  },
  {
    id: "cholesterol-ldl",
    loinc: "13457-7",
    namePt: "LDL",
    nameEn: "LDL cholesterol",
    category: "lipidograma",
    unit: "mg/dL",
    refLow: null,
    refHigh: 130,
    description: "Alvo depende do risco cardiovascular individual.",
    aliases: ["ldl", "colesterol ldl", "ldl colesterol", "ldl c", "ldl calculado"],
  },
  {
    id: "triglycerides",
    loinc: "2571-8",
    namePt: "Triglicerídeos",
    nameEn: "Triglycerides",
    category: "lipidograma",
    unit: "mg/dL",
    refLow: null,
    refHigh: 150,
    aliases: ["triglicerideos", "triglicerídeos", "triglicerides", "trigliceridios", "tg"],
  },

  // ─── Hormônios ──────────────────────────────────────────────────────────
  {
    id: "tsh",
    loinc: "3016-3",
    namePt: "TSH",
    nameEn: "Thyrotropin",
    category: "hormonios",
    unit: "µUI/mL",
    refLow: 0.4,
    refHigh: 4.5,
    aliases: ["tsh", "hormonio tireoestimulante", "tsh ultrassensivel", "tsh ultra sensivel", "tirotrofina"],
  },
  {
    id: "free-t4",
    loinc: "3024-7",
    namePt: "T4 livre",
    nameEn: "Free thyroxine",
    category: "hormonios",
    unit: "ng/dL",
    refLow: 0.7,
    refHigh: 1.8,
    aliases: ["t4 livre", "tiroxina livre", "ft4", "t4l"],
  },
  {
    id: "testosterone-total",
    loinc: "2986-8",
    namePt: "Testosterona total",
    nameEn: "Total testosterone",
    category: "hormonios",
    unit: "ng/dL",
    refLow: 240,
    refHigh: 870,
    aliases: ["testosterona", "testosterona total", "testo total"],
  },
  {
    id: "cortisol",
    loinc: "2143-6",
    namePt: "Cortisol",
    nameEn: "Cortisol",
    category: "hormonios",
    unit: "µg/dL",
    refLow: 5,
    refHigh: 25,
    aliases: ["cortisol", "cortisol basal", "cortisol serico", "cortisol matinal"],
  },

  // ─── Vitaminas e minerais ───────────────────────────────────────────────
  {
    id: "vitamin-d",
    loinc: "1989-3",
    namePt: "Vitamina D (25-OH)",
    nameEn: "25-hydroxyvitamin D",
    category: "vitaminas",
    unit: "ng/mL",
    refLow: 30,
    refHigh: 100,
    higherIsBetter: true,
    aliases: [
      "vitamina d", "vitamina d 25 oh", "25 hidroxivitamina d", "25 oh vitamina d",
      "vit d", "calcidiol", "vitamina d3",
    ],
  },
  {
    id: "vitamin-b12",
    loinc: "2132-9",
    namePt: "Vitamina B12",
    nameEn: "Vitamin B12",
    category: "vitaminas",
    unit: "pg/mL",
    refLow: 200,
    refHigh: 900,
    higherIsBetter: true,
    aliases: ["vitamina b12", "b12", "cobalamina", "vit b12"],
  },
  {
    id: "ferritin",
    loinc: "2276-4",
    namePt: "Ferritina",
    nameEn: "Ferritin",
    category: "vitaminas",
    unit: "ng/mL",
    refLow: 30,
    refHigh: 400,
    aliases: ["ferritina", "ferritina serica", "ferritina sérica"],
  },
  {
    id: "iron",
    loinc: "2498-4",
    namePt: "Ferro sérico",
    nameEn: "Iron",
    category: "vitaminas",
    unit: "µg/dL",
    refLow: 60,
    refHigh: 170,
    aliases: ["ferro", "ferro serico", "ferro sérico", "fe"],
  },

  // ─── Inflamação ─────────────────────────────────────────────────────────
  {
    id: "crp",
    loinc: "1988-5",
    namePt: "Proteína C reativa",
    nameEn: "C-reactive protein",
    category: "inflamacao",
    unit: "mg/L",
    refLow: null,
    refHigh: 5,
    aliases: ["pcr", "proteina c reativa", "proteína c reativa", "pcr ultrassensivel", "crp"],
  },
  {
    id: "esr",
    loinc: "4537-7",
    namePt: "VHS",
    nameEn: "Erythrocyte sedimentation rate",
    category: "inflamacao",
    unit: "mm/h",
    refLow: null,
    refHigh: 20,
    aliases: ["vhs", "velocidade de hemossedimentacao", "hemossedimentacao", "esr"],
  },

  // ─── Marcadores ─────────────────────────────────────────────────────────
  {
    id: "psa-total",
    loinc: "2857-1",
    namePt: "PSA total",
    nameEn: "Prostate specific antigen",
    category: "marcadores",
    unit: "ng/mL",
    refLow: null,
    refHigh: 4.0,
    aliases: ["psa", "psa total", "antigeno prostatico especifico"],
  },
];

/**
 * Normalização de texto para casar aliases: minúsculo, sem acento, sem
 * pontuação, espaços colapsados. "Glicemia de Jejum (soro)" -> "glicemia de jejum soro".
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Índice alias-normalizado -> id do analito, montado uma vez no boot. */
export const ALIAS_INDEX: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const entry of CATALOG) {
    for (const alias of [entry.namePt, entry.nameEn, ...entry.aliases]) {
      const key = normalizeName(alias);
      if (key && !map.has(key)) map.set(key, entry.id);
    }
  }
  return map;
})();

export const BY_ID: ReadonlyMap<string, CatalogEntry> = new Map(
  CATALOG.map((e) => [e.id, e]),
);
