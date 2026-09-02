import { describe, expect, it } from "vitest";
import { computeFlag, toCanonical } from "./units";

describe("toCanonical", () => {
  it("converte unidade SI para a convencional brasileira", () => {
    expect(toCanonical("glucose-fasting", 5.5, "mmol/L")?.value).toBeCloseTo(99.1, 1);
    expect(toCanonical("creatinine", 88.4, "µmol/L")?.value).toBeCloseTo(1.0, 3);
    expect(toCanonical("vitamin-d", 75, "nmol/L")?.value).toBeCloseTo(30.05, 2);
    expect(toCanonical("cholesterol-ldl", 3.5, "mmol/L")?.value).toBeCloseTo(135.3, 1);
  });

  it("aceita grafias equivalentes da mesma unidade", () => {
    expect(toCanonical("creatinine", 88.4, "umol/L")?.value).toBeCloseTo(1.0, 3);
    expect(toCanonical("ferritin", 45, "µg/L")?.value).toBe(45);
    expect(toCanonical("tsh", 2.1, "mUI/L")?.converted).toBe(false);
  });

  it("não converte o que já está na unidade canônica", () => {
    expect(toCanonical("glucose-fasting", 99, "mg/dL")).toEqual({
      value: 99,
      unit: "mg/dL",
      converted: false,
    });
  });

  it("assume a unidade canônica quando o laudo não traz nenhuma", () => {
    // Comum em porcentagem e contagens; não é chute arriscado.
    expect(toCanonical("hba1c", 5.6, null)?.converted).toBe(false);
  });

  it("devolve null para unidade desconhecida em vez de chutar", () => {
    // Um valor errado contamina a série em silêncio; um buraco é visível.
    expect(toCanonical("glucose-fasting", 99, "furlongs")).toBeNull();
    expect(toCanonical("cholesterol-ldl", 3.5, "g/L")).toBeNull();
  });

  it("devolve null para analito fora do catálogo", () => {
    expect(toCanonical("nao-existe", 1, "mg/dL")).toBeNull();
  });

  it("converte contagens entre /mm³ e 10³/µL", () => {
    expect(toCanonical("platelets", 250, "10^3/uL")?.value).toBe(250000);
    expect(toCanonical("leukocytes", 7.2, "mil/mm3")?.value).toBeCloseTo(7200, 0);
  });
});

describe("computeFlag", () => {
  it("marca abaixo, dentro e acima", () => {
    expect(computeFlag(104, 70, 99)).toBe("high");
    expect(computeFlag(18, 30, 100)).toBe("low");
    expect(computeFlag(85, 70, 99)).toBe("normal");
  });

  it("trata faixa aberta de um lado só", () => {
    expect(computeFlag(142, null, 130)).toBe("high");
    expect(computeFlag(120, null, 130)).toBe("normal");
    expect(computeFlag(35, 40, null)).toBe("low");
    expect(computeFlag(58, 40, null)).toBe("normal");
  });

  it("os limites são inclusivos — o valor exato da borda é normal", () => {
    expect(computeFlag(99, 70, 99)).toBe("normal");
    expect(computeFlag(70, 70, 99)).toBe("normal");
  });

  it("sem faixa, não inventa situação", () => {
    expect(computeFlag(42, null, null)).toBeNull();
  });
});
