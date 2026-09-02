/**
 * Carrega .env.local para scripts fora do Next.
 *
 * O Next lê .env.local sozinho, mas `tsx scripts/...` e o drizzle-kit não —
 * sem isto o seed falha com "DATABASE_URL não definida" mesmo com o arquivo
 * preenchido, que é uma pegadinha cara de diagnosticar.
 *
 * Usa process.loadEnvFile (nativo do Node 20.12+), sem dependência extra.
 */
import { existsSync } from "node:fs";

export function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return false;
  process.loadEnvFile(file);
  return true;
}

loadEnv();
