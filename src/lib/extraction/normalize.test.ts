import { describe, expect, it } from "vitest";
import { normalizeReport, normalizeResult, resolveAnalyte } from "./normalize";
import type { ExtractedResult } from "./schema";

const result = (over: Partial<ExtractedResult> = {}): ExtractedResult => ({
  raw_name: "Glicemia de Jejum",
  value_num: 104,
  value_text: null,
  unit: "mg/dL",
  ref_low: 70,
  ref_high: 99,
  ref_text: null,
  confidence: 0.98,
  ...over,
});

describe("resolveAnalyte", () => {
  it("casa todas as grafias de glicose na mesma série", () => {
    // O argumento central do produto: seis laboratórios, um gráfico.
    for (const nome of [
      "Glicemia de Jejum", "GLICOSE", "Glicose (jejum)", "GLIC",
      "Glicemia jejum", "Glicose sérica", "Dosagem de glicose", "glicose em jejum",
    ]) {
      expect(resolveAnalyte(nome), nome).toBe("glucose-fasting");
    }
  });

  it("não confunde as frações do lipidograma entre si", () => {
    expect(resolveAnalyte("LDL-c")).toBe("cholesterol-ldl");
    expect(resolveAnalyte("COLESTEROL HDL")).toBe("cholesterol-hdl");
    expect(resolveAnalyte("Colesterol Total")).toBe("cholesterol-total");
    expect(resolveAnalyte("LDL (calculado)")).toBe("cholesterol-ldl");
  });

  it("remove ruído do laboratório na segunda passada", () => {
    expect(resolveAnalyte("Dosagem de Ferritina sérica")).toBe("ferritin");
    expect(resolveAnalyte("Creatinina no soro")).toBe("creatinine");
  });

  it("devolve null para o que não conhece, em vez de aproximar", () => {
    expect(resolveAnalyte("Anticorpo anti-HBs")).toBeNull();
    expect(resolveAnalyte("Parasitológico de fezes")).toBeNull();
    expect(resolveAnalyte("")).toBeNull();
  });

  it("aceita aliases aprendidos na revisão humana", () => {
    const learned = new Map([["anticorpo anti hbs", "hepatite-b-titer"]]);
    expect(resolveAnalyte("Anticorpo anti-HBs", learned)).toBe("hepatite-b-titer");
  });
});

describe("normalizeResult", () => {
  it("canoniza valor e marca a situação", () => {
    const r = normalizeResult(result());
    expect(r.analyteId).toBe("glucose-fasting");
    expect(r.canonicalValue).toBe(104);
    expect(r.flag).toBe("high");
    expect(r.needsReview).toBe(false);
  });

  it("preserva o valor original ao lado do canônico", () => {
    const r = normalizeResult(result({ value_num: 5.5, unit: "mmol/L" }));
    expect(r.valueNum).toBe(5.5);
    expect(r.rawUnit).toBe("mmol/L");
    expect(r.canonicalValue).toBeCloseTo(99.1, 1);
    expect(r.canonicalUnit).toBe("mg/dL");
  });

  it("manda para revisão o analito desconhecido", () => {
    const r = normalizeResult(result({ raw_name: "Exame Misterioso" }));
    expect(r.analyteId).toBeNull();
    expect(r.needsReview).toBe(true);
    expect(r.reviewReasons.join()).toContain("não reconhecido");
  });

  it("manda para revisão quando a confiança é baixa", () => {
    const r = normalizeResult(result({ confidence: 0.4 }));
    expect(r.needsReview).toBe(true);
    expect(r.reviewReasons.join()).toContain("Confiança baixa");
  });

  it("manda para revisão quando a unidade é desconhecida", () => {
    const r = normalizeResult(result({ unit: "mg/mL" }));
    expect(r.canonicalValue).toBeNull();
    expect(r.needsReview).toBe(true);
    expect(r.reviewReasons.join()).toContain("desconhecida");
  });

  it("a faixa do laudo tem precedência sobre a do catálogo", () => {
    // Catálogo diz 70–99; este laboratório usa 75–105.
    const r = normalizeResult(result({ value_num: 102, ref_low: 75, ref_high: 105 }));
    expect(r.refHigh).toBe(105);
    expect(r.flag).toBe("normal");
  });

  it("cai para a faixa do catálogo quando o laudo não traz nenhuma", () => {
    const r = normalizeResult(result({ ref_low: null, ref_high: null }));
    expect(r.refHigh).toBe(99);
    expect(r.flag).toBe("high");
  });

  it("interpreta resultado qualitativo", () => {
    const naoReagente = normalizeResult(
      result({ raw_name: "HIV", value_num: null, value_text: "Não Reagente", unit: null }),
    );
    expect(naoReagente.flag).toBe("normal");

    const reagente = normalizeResult(
      result({ raw_name: "HIV", value_num: null, value_text: "Reagente", unit: null }),
    );
    expect(reagente.flag).toBe("abnormal");
  });
});

describe("normalizeReport", () => {
  it("conta quantos exigem conferência humana", () => {
    const report = normalizeReport({
      lab_name: "Laboratório Vitali",
      collected_at: "2025-06-10",
      issued_at: "2025-06-12",
      patient_name: null,
      notes: null,
      results: [
        result(),
        result({ raw_name: "Exame Misterioso" }),
        result({ confidence: 0.3 }),
      ],
    });

    expect(report.results).toHaveLength(3);
    expect(report.reviewCount).toBe(2);
    expect(report.labName).toBe("Laboratório Vitali");
    expect(report.collectedAt).toBe("2025-06-10");
  });
});
