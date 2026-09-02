import { z } from "zod";

/**
 * Validação de ambiente no boot.
 *
 * Sem isto, um DATABASE_URL faltando vira um erro de conexão críptico três
 * camadas abaixo, em produção, no meio de uma request. Aqui falha na hora, com
 * o nome da variável e o que fazer.
 */
const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL não definida — pegue a connection string no Supabase (Settings → Database)")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL precisa ser uma URL Postgres (postgres:// ou postgresql://)",
    ),
  /** Só necessária para a extração de laudos; o resto do app funciona sem. */
  ANTHROPIC_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ambiente inválida:\n${details}\n\n` +
        `Copie .env.example para .env.local e preencha os valores.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** A extração está disponível? Usado para degradar a UI em vez de quebrar. */
export function hasExtractionKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
