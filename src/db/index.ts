import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Cliente Postgres (Supabase), criado sob demanda.
 *
 * A criação é PREGUIÇOSA de propósito. Se o cliente fosse construído na
 * avaliação do módulo, `next build` passaria a exigir DATABASE_URL — e o build
 * não deveria precisar de banco nenhum. Do jeito que está, a conexão só nasce
 * na primeira query de verdade, e a falta de configuração vira uma tela de
 * ajuda em runtime em vez de um build quebrado.
 *
 * Duas armadilhas de serverless resolvidas aqui:
 *
 * 1. `prepare: false` — a Vercel conecta pelo pooler de transação do Supabase
 *    (porta 6543, pgbouncer), que não suporta prepared statements. Sem isto o
 *    app funciona local e quebra em produção, que é o pior modo de falhar.
 *
 * 2. Singleton global — em dev o hot reload reavalia o módulo a cada save. Sem
 *    cache, cada alteração abre um novo pool e o Supabase corta por limite de
 *    conexões depois de alguns minutos editando arquivo.
 */
const globalForDb = globalThis as unknown as {
  __vitalogSql?: ReturnType<typeof postgres>;
  __vitalogDb?: Db;
};

function getDb(): Db {
  if (globalForDb.__vitalogDb) return globalForDb.__vitalogDb;

  const { DATABASE_URL } = getEnv();
  const sql =
    globalForDb.__vitalogSql ??
    postgres(DATABASE_URL, {
      prepare: false,
      // O pooler já mantém as conexões; abrir muitas por instância só desperdiça.
      max: process.env.NODE_ENV === "production" ? 1 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });

  const instance = drizzle(sql, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__vitalogSql = sql;
    globalForDb.__vitalogDb = instance;
  }
  return instance;
}

/**
 * Proxy para preservar a ergonomia de `db.select()` sem construir o cliente na
 * importação. Métodos são religados ao alvo real para não perder o `this`.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop) as unknown;
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
