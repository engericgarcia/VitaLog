import { describe, expect, it } from "vitest";
import { ALIAS_INDEX, BY_ID, CATALOG, normalizeName } from "./catalog";

/**
 * Testes de integridade do catálogo. Não verificam comportamento de código —
 * verificam que o CATÁLOGO, que é dado editado à mão, não ficou inconsistente.
 * É o tipo de erro que passa despercebido até a série de alguém sair errada.
 */
describe("catálogo de analitos", () => {
  it("não tem id duplicado", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("não tem alias apontando para dois analitos diferentes", () => {
    // O bug mais perigoso possível aqui: "colesterol" caindo em LDL e em total.
    const seen = new Map<string, string>();
    const conflicts: string[] = [];

    for (const entry of CATALOG) {
      for (const alias of [entry.namePt, entry.nameEn, ...entry.aliases]) {
        const key = normalizeName(alias);
        if (!key) continue;
        const owner = seen.get(key);
        if (owner && owner !== entry.id) {
          conflicts.push(`"${key}" → ${owner} e ${entry.id}`);
        }
        seen.set(key, owner ?? entry.id);
      }
    }

    expect(conflicts).toEqual([]);
  });

  it("todo analito tem ao menos um alias além do nome", () => {
    const semAlias = CATALOG.filter((e) => e.aliases.length === 0).map((e) => e.id);
    expect(semAlias).toEqual([]);
  });

  it("faixa de referência é coerente quando os dois limites existem", () => {
    const invalidas = CATALOG.filter(
      (e) => e.refLow !== null && e.refHigh !== null && e.refLow >= e.refHigh,
    ).map((e) => e.id);
    expect(invalidas).toEqual([]);
  });

  it("código LOINC, quando presente, tem o formato NNNNN-N", () => {
    const malformados = CATALOG.filter(
      (e) => e.loinc !== null && !/^\d{1,6}-\d$/.test(e.loinc),
    ).map((e) => `${e.id}: ${e.loinc}`);
    expect(malformados).toEqual([]);
  });

  it("o índice de aliases cobre todo o catálogo", () => {
    for (const entry of CATALOG) {
      expect(ALIAS_INDEX.get(normalizeName(entry.namePt))).toBe(entry.id);
      expect(BY_ID.get(entry.id)).toBe(entry);
    }
  });
});

describe("normalizeName", () => {
  it("remove acento, pontuação e caixa", () => {
    expect(normalizeName("Glicemia de Jejum (soro)")).toBe("glicemia de jejum soro");
    expect(normalizeName("VITAMINA D 25-OH")).toBe("vitamina d 25 oh");
    expect(normalizeName("  Ácido   Úrico  ")).toBe("acido urico");
  });

  it("devolve string vazia para entrada sem conteúdo útil", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ---   ")).toBe("");
  });
});
