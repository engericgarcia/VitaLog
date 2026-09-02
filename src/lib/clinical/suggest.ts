import { CATALOG, normalizeName, type CatalogEntry } from "./catalog";

/**
 * Sugere analitos prováveis para um nome que o catálogo não reconheceu.
 *
 * ┌─ Por que aqui pode ser difuso e na ingestão não ─────────────────────────┐
 * │ `resolveAnalyte` é deliberadamente determinístico: um casamento errado   │
 * │ na ingestão entra em silêncio na série e ninguém percebe.                │
 * │                                                                          │
 * │ Aqui é o oposto. A sugestão nunca é aplicada sozinha — ela ordena as     │
 * │ opções para um humano que vai confirmar. Errar a ordem custa um clique;  │
 * │ não sugerir nada custa procurar em trinta itens.                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export interface Suggestion {
  entry: CatalogEntry;
  score: number;
}

/** Palavras que aparecem em quase todo laudo e não distinguem nada. */
const STOPWORDS = new Set([
  "de", "do", "da", "em", "no", "na", "e", "com",
  "serico", "serica", "soro", "plasma", "sangue", "total", "livre",
  "dosagem", "pesquisa", "exame", "material",
]);

function tokens(text: string): Set<string> {
  return new Set(
    normalizeName(text)
      .split(" ")
      // Tokens de um caractere entram: o "D" de "Vitamina D" é exatamente o
      // que a distingue da B12. Filtrá-los fazia as duas empatarem.
      .filter((t) => t.length > 0 && !STOPWORDS.has(t)),
  );
}

/** Índice montado uma vez: cada analito com o conjunto de tokens de todas as suas grafias. */
const TOKEN_INDEX: Array<{ entry: CatalogEntry; tokens: Set<string> }> = CATALOG.map(
  (entry) => {
    const all = new Set<string>();
    for (const name of [entry.namePt, entry.nameEn ?? "", ...entry.aliases]) {
      for (const t of tokens(name)) all.add(t);
    }
    return { entry, tokens: all };
  },
);

function score(queryTokens: Set<string>, entryTokens: Set<string>): number {
  if (queryTokens.size === 0 || entryTokens.size === 0) return 0;

  let exact = 0;
  let partial = 0;
  for (const q of queryTokens) {
    if (entryTokens.has(q)) {
      exact++;
      continue;
    }
    // Prefixo conta menos: "glic" sugere "glicose", mas com menos convicção
    // do que a palavra inteira.
    for (const e of entryTokens) {
      if (e.startsWith(q) || q.startsWith(e)) {
        partial += 0.6;
        break;
      }
    }
  }

  const matched = exact + partial;
  if (matched === 0) return 0;

  // O divisor é limitado a 2 de propósito. Nome de laudo carrega ruído
  // ("PP 2H", "3a geração", "imunoensaio") que não deveria enterrar um acerto
  // forte: quem escreve "TSH 3a geração" quer TSH, e dividir por três tokens
  // fazia a sugestão sumir. Um acerto exato num termo distintivo basta.
  const denom = Math.max(1, Math.min(queryTokens.size, 2));

  // Penalidade leve por entrada com muitos sinônimos, só para desempatar em
  // favor da mais específica.
  return matched / denom / (1 + Math.log1p(entryTokens.size) * 0.06);
}

export function suggestAnalytes(rawName: string, limit = 3): Suggestion[] {
  const q = tokens(rawName);
  if (q.size === 0) return [];

  return TOKEN_INDEX.map(({ entry, tokens: t }) => ({ entry, score: score(q, t) }))
    .filter((s) => s.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
