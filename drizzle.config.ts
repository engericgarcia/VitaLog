import { existsSync } from "node:fs";
import type { Config } from "drizzle-kit";

// drizzle-kit não lê .env.local sozinho.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations devem usar a conexão DIRETA (porta 5432), não o pooler de
    // transação (6543): pgbouncer não suporta os comandos DDL que o drizzle emite.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
