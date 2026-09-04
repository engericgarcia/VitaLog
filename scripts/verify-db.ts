/**
 * Inspeciona o banco REAL: tabelas, tipos de coluna, índices e contagens.
 * Serve para conferir que o schema que o drizzle descreve é o que o Postgres
 * de fato criou — typecheck não garante isso.
 *
 *   npx tsx scripts/verify-db.ts
 */
import "./load-env";
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("DIRECT_URL não definida"); process.exit(1); }
const sql = postgres(url, {
  max: 1,
  prepare: false,
  // O migrator é idempotente e o Postgres avisa "já existe, pulando" em NOTICE.
  // Sem isto o seed cospe blocos que parecem erro e não são.
  onnotice: () => {},
});

async function main() {
  const [{ version }] = await sql`select version()`;
  console.log(`\n${version.split(",")[0]}\n`);

  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name`;

  console.log(`Tabelas (${tables.length}):`);
  for (const { table_name } of tables) {
    const cols = await sql<{ column_name: string; data_type: string; is_nullable: string }[]>`
      select column_name, data_type, is_nullable from information_schema.columns
      where table_schema='public' and table_name=${table_name} order by ordinal_position`;
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*)::text as count from ${sql(table_name)}`;
    console.log(`  ${table_name.padEnd(18)} ${String(cols.length).padStart(2)} colunas  ${count.padStart(4)} linhas`);
  }

  const idx = await sql<{ indexname: string; tablename: string }[]>`
    select indexname, tablename from pg_indexes
    where schemaname='public' and indexname not like '%_pkey' order by tablename, indexname`;
  console.log(`\nÍndices não-PK (${idx.length}):`);
  for (const i of idx) console.log(`  ${i.tablename.padEnd(18)} ${i.indexname}`);

  // A consulta que o painel realmente faz — se ela funcionar, o painel funciona.
  const series = await sql<{ analyte_id: string; pontos: string; ultimo: number }[]>`
    select analyte_id, count(*)::text as pontos, max(canonical_value) as ultimo
    from lab_results where reviewed = true and analyte_id is not null
    group by analyte_id order by analyte_id limit 5`;
  console.log(`\nAmostra de séries:`);
  for (const s of series) console.log(`  ${s.analyte_id.padEnd(20)} ${s.pontos} pontos`);

  const [{ jsonb_ok }] = await sql<{ jsonb_ok: string }[]>`
    select pg_typeof(extraction_raw)::text as jsonb_ok from lab_reports limit 1`;
  console.log(`\nTipo de extraction_raw: ${jsonb_ok}`);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
