import { describe, expect, it } from "vitest";
import { suggestAnalytes } from "./suggest";

const ids = (name: string) => suggestAnalytes(name).map((s) => s.entry.id);

describe("suggestAnalytes", () => {
  it("sugere o analito certo para variações não catalogadas", () => {
    // Nenhum destes está no catálogo de aliases — é o caso de uso real.
    expect(ids("GLICOSE PP 2H")).toContain("glucose-fasting");
    expect(ids("Colesterol LDL fração")).toContain("cholesterol-ldl");
    expect(ids("Ferritina (imunoensaio)")).toContain("ferritin");
    expect(ids("TSH 3a geração")).toContain("tsh");
  });

  it("coloca o mais provável em primeiro", () => {
    expect(ids("Vitamina D total")[0]).toBe("vitamin-d");
    expect(ids("Hemoglobina glicada HbA1c")[0]).toBe("hba1c");
  });

  it("não sugere nada para o que não se parece com nada", () => {
    expect(suggestAnalytes("Parasitológico de fezes")).toEqual([]);
    expect(suggestAnalytes("")).toEqual([]);
    expect(suggestAnalytes("xyz")).toEqual([]);
  });

  it("ignora palavras genéricas de laudo", () => {
    // "dosagem de" e "sérico" não podem puxar sugestão sozinhos.
    expect(suggestAnalytes("Dosagem sérica de")).toEqual([]);
  });

  it("respeita o limite pedido", () => {
    expect(suggestAnalytes("colesterol", 2).length).toBeLessThanOrEqual(2);
  });
});
