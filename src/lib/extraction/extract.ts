import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractedReportSchema, type ExtractedReport } from "./schema";

export const EXTRACTION_MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `Você extrai dados estruturados de laudos laboratoriais brasileiros.

Regras:
- Transcreva o que está IMPRESSO. Não calcule, não converta unidade, não interprete se um valor é bom ou ruim — outra camada faz isso.
- Nome do exame: copie a grafia exata do laudo, incluindo abreviações. "GLIC", "Glicemia de Jejum" e "Glicose" devem sair como estão.
- Números brasileiros usam vírgula decimal. Converta para ponto: "1,25" -> 1.25. Separador de milhar deve sumir: "250.000" -> 250000.
- Resultado qualitativo ("Não reagente", "Negativo", "< 0,3") vai em value_text com value_num null.
- Data da coleta e data de liberação são diferentes. Se só uma aparecer, preencha a que dá para identificar e deixe a outra null.
- Faixa de referência: "70 a 99" vira ref_low 70 / ref_high 99. "Até 200" vira ref_high 200 com ref_low null. Texto que não vira intervalo vai em ref_text.
- confidence baixa (< 0.7) quando o texto estiver borrado, cortado, girado, ou quando você estiver adivinhando.
- Não invente exame que não está no documento. Um laudo com 3 análises deve devolver 3 resultados.`;

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMime = (typeof IMAGE_TYPES)[number];

function buildDocumentBlock(
  data: Buffer,
  mime: string,
): Anthropic.ContentBlockParam {
  const b64 = data.toString("base64");

  if (mime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    };
  }
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) {
    return {
      type: "image",
      source: { type: "base64", media_type: mime as ImageMime, data: b64 },
    };
  }
  throw new ExtractionError(
    `Tipo de arquivo não suportado: ${mime}. Aceitos: PDF, JPEG, PNG, GIF, WebP.`,
  );
}

export interface ExtractionOutcome {
  report: ExtractedReport;
  /** Extração custa dinheiro; sem medir não se controla. */
  usage: { inputTokens: number; outputTokens: number };
}

const RETRYABLE_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lê um laudo (PDF ou foto) e devolve os resultados estruturados.
 *
 * Não toca no banco e não normaliza nada — é I/O puro, o que a torna fácil de
 * testar isoladamente.
 *
 * Repete em falha transitória (429, 5xx, queda de conexão) com espera
 * exponencial: o upload de um laudo é uma ação que o usuário fez de propósito e
 * não pode morrer por um pico de rate limit. Erro definitivo (chave inválida,
 * arquivo ilegível) não é repetido — só gastaria tempo e dinheiro.
 */
export async function extractReport(
  fileData: Buffer,
  mimeType: string,
  client: Anthropic = new Anthropic(),
): Promise<ExtractionOutcome> {
  const documentBlock = buildDocumentBlock(fileData, mimeType);

  let response;
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRYABLE_ATTEMPTS; attempt++) {
    try {
      response = await attemptParse(client, documentBlock);
      break;
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof Anthropic.RateLimitError ||
        err instanceof Anthropic.APIConnectionError ||
        (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500);

      if (!retryable || attempt === RETRYABLE_ATTEMPTS) break;
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  if (!response) throw toExtractionError(lastError);

  if (response.stop_reason === "refusal") {
    throw new ExtractionError(
      `O modelo recusou processar este documento (${response.stop_details?.category ?? "sem categoria"}).`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError(
      "Laudo longo demais: a resposta foi truncada. Divida o PDF e reenvie.",
    );
  }
  if (!response.parsed_output) {
    throw new ExtractionError("A resposta não bateu com o schema esperado.");
  }

  return {
    report: response.parsed_output,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

function toExtractionError(err: unknown): ExtractionError {
  if (err instanceof ExtractionError) return err;
  if (err instanceof Anthropic.RateLimitError) {
    return new ExtractionError("Limite de requisições atingido. Tente de novo em instantes.", err);
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return new ExtractionError("ANTHROPIC_API_KEY ausente ou inválida.", err);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ExtractionError("Falha de conexão com a API.", err);
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new ExtractionError(
      "A API recusou o arquivo. PDFs protegidos por senha ou com mais de 100 páginas não são aceitos.",
      err,
    );
  }
  return new ExtractionError("Erro inesperado ao chamar a API.", err);
}

async function attemptParse(
  client: Anthropic,
  documentBlock: Anthropic.ContentBlockParam,
) {
  return client.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: [
          documentBlock, // documento antes do texto: melhora a leitura
          {
            type: "text",
            text: "Extraia todos os resultados deste laudo, seguindo as regras.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ExtractedReportSchema) },
  });
}
