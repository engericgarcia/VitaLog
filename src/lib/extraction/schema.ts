import { z } from "zod";

/**
 * Contrato de saída do extrator. É deliberadamente "burro": pedimos ao modelo
 * o que está ESCRITO no laudo, não o que ele acha que o valor significa.
 * Interpretação (canonizar analito, converter unidade, marcar alterado) é
 * feita em código determinístico depois — dá para testar, versionar e auditar.
 */
export const ExtractedResultSchema = z.object({
  raw_name: z
    .string()
    .describe("Nome do exame exatamente como impresso no laudo."),
  value_num: z
    .number()
    .nullable()
    .describe("Valor numérico. Use ponto decimal. null se for qualitativo."),
  value_text: z
    .string()
    .nullable()
    .describe(
      'Resultado não numérico como impresso: "Não reagente", "Negativo", "< 0,3".',
    ),
  unit: z.string().nullable().describe("Unidade como impressa: mg/dL, U/L, %."),
  ref_low: z.number().nullable().describe("Limite inferior da referência do laudo."),
  ref_high: z.number().nullable().describe("Limite superior da referência do laudo."),
  ref_text: z
    .string()
    .nullable()
    .describe('Referência quando não é um intervalo simples: "Até 200", "Desejável < 190".'),
  confidence: z
    .number()
    .describe("0 a 1. Reduza quando o texto estiver borrado, cortado ou ambíguo."),
});

export const ExtractedReportSchema = z.object({
  lab_name: z.string().nullable().describe("Nome do laboratório."),
  collected_at: z
    .string()
    .nullable()
    .describe("Data da COLETA em YYYY-MM-DD. É ela que ordena a série histórica."),
  issued_at: z.string().nullable().describe("Data de liberação do laudo em YYYY-MM-DD."),
  patient_name: z.string().nullable().describe("Nome do paciente, se visível."),
  results: z.array(ExtractedResultSchema),
  notes: z
    .string()
    .nullable()
    .describe("Qualquer coisa que atrapalhou a leitura (página cortada, borrão)."),
});

export type ExtractedResult = z.infer<typeof ExtractedResultSchema>;
export type ExtractedReport = z.infer<typeof ExtractedReportSchema>;
