// Aplica as migrations de supabase/migrations em ordem e registra cada uma em public.app_migrations.
//
//   npm run db:migrate                                   aplica as pendentes (banco local)
//   npm run db:migrate -- --ensaio                       aplica as pendentes numa transação e desfaz (ROLLBACK)
//   npm run db:migrate -- --baseline-ate=<arquivo.sql>   registra como já aplicadas, sem rodar, até esse arquivo
//   npm run db:test:migrate                              banco descartável de testes (NEGOCIAR_LAR_TEST_DATABASE_URL)
//   ... -- --confirmar-remoto                            obrigatório para banco que não seja localhost
//
// O alvo vem de DATABASE_URL (ou .env.local/.env). O host é exibido antes de qualquer alteração.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { Client } from "pg";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/lib/db/schema";
import { SUPABASE_ROOT_CA } from "../src/lib/db/supabase-ca";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const args = process.argv.slice(2);
const rehearsal = args.includes("--ensaio");
const remoteConfirmed = args.includes("--confirmar-remoto");
const baselineThrough = args.find((arg) => arg.startsWith("--baseline-ate="))?.split("=")[1];

const testMode = args.includes("--teste");
const url = testMode ? process.env.NEGOCIAR_LAR_TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url) throw new Error(testMode ? "Configure NEGOCIAR_LAR_TEST_DATABASE_URL com um banco local descartável." : "Configure DATABASE_URL.");
const target = new URL(url);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
if (testMode && (!local || !target.pathname.toLowerCase().includes("test"))) {
  throw new Error("--teste só aceita banco local cujo nome contenha test.");
}
console.log(`Banco alvo: ${target.hostname}${target.port ? `:${target.port}` : ""}${target.pathname} ${rehearsal ? "(ENSAIO, termina em ROLLBACK)" : ""}`);
if (!local && !remoteConfirmed) throw new Error("Banco remoto: rode de novo com --confirmar-remoto depois de conferir o host acima.");

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
const checksum = (sql: string) => createHash("sha256").update(sql).digest("hex");
// Arquivos antigos com BEGIN/COMMIT próprios não podem rodar dentro de outra transação.
const ownsTransaction = (sql: string) => /^\s*(begin|commit)\s*;/im.test(sql);

const supabase = /supabase\.(co|com)$/.test(target.hostname);
const client = new Client({ connectionString: url, ssl: local ? undefined : { ca: supabase ? (process.env.SUPABASE_DB_CA_CERT || SUPABASE_ROOT_CA) : undefined, rejectUnauthorized: true } });

async function ensureLedger() {
  await client.query(`create table if not exists public.app_migrations (
    name text primary key, checksum text not null, applied_at timestamp not null default now())`);
  await client.query(`do $$ begin
    alter table public.app_migrations enable row level security;
    if exists (select 1 from pg_roles where rolname = 'anon') and exists (select 1 from pg_roles where rolname = 'authenticated') then
      revoke all on table public.app_migrations from public, anon, authenticated;
      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_migrations') then
        create policy "deny browser api access" on public.app_migrations as restrictive for all to anon, authenticated using (false) with check (false);
      end if;
    end if;
  end $$`);
}

// Toda coluna que o código lê precisa existir: confere depois do ensaio e da aplicação (pega um baseline errado antes do push).
async function verifySchema() {
  const rows = (await client.query("select table_name, column_name from information_schema.columns where table_schema = 'public'")).rows;
  const existing = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
  const tables = Object.values(schema as Record<string, unknown>).filter((value) => value instanceof PgTable) as InstanceType<typeof PgTable>[];
  const missing = tables.flatMap((table) => { const config = getTableConfig(table); return config.columns.map((column) => `${config.name}.${column.name}`); })
    .filter((column) => !existing.has(column));
  if (missing.length) throw new Error(`Colunas que o código usa e não existem no banco: ${missing.join(", ")}. Aplique a migration que as cria antes de publicar.`);
  console.log("Conferência: todas as colunas do código existem no banco.");
}

async function main() {
  await client.connect();
  try {
    if (!rehearsal) await ensureLedger();
    const applied = new Map<string, string>();
    const ledgerExists = (await client.query("select to_regclass('public.app_migrations') as ledger")).rows[0].ledger;
    if (ledgerExists) for (const row of (await client.query("select name, checksum from public.app_migrations")).rows) applied.set(row.name, row.checksum);

    if (baselineThrough) {
      if (rehearsal) throw new Error("--baseline-ate não combina com --ensaio.");
      if (!files.includes(baselineThrough)) throw new Error(`Arquivo ${baselineThrough} não existe em supabase/migrations.`);
      for (const name of files.filter((file) => file <= baselineThrough && !applied.has(file))) {
        await client.query("insert into public.app_migrations (name, checksum) values ($1, $2)", [name, checksum(readFileSync(path.join(dir, name), "utf8"))]);
        console.log(`registrada sem rodar: ${name}`);
      }
      return;
    }

    for (const [name, sum] of applied) {
      const file = path.join(dir, name);
      if (files.includes(name) && checksum(readFileSync(file, "utf8")) !== sum) console.warn(`ATENÇÃO: ${name} mudou depois de aplicada.`);
    }
    const pending = files.filter((file) => !applied.has(file));
    if (!pending.length) { console.log("Nenhuma migration pendente."); await verifySchema(); return; }

    if (rehearsal) {
      await client.query("begin");
      try {
        for (const name of pending) {
          const sql = readFileSync(path.join(dir, name), "utf8");
          if (ownsTransaction(sql)) throw new Error(`${name} tem BEGIN/COMMIT próprio e não pode ser ensaiada; registre com --baseline-ate se já estiver no banco.`);
          await client.query(sql);
          console.log(`ensaiada: ${name}`);
        }
        await client.query("set constraints all immediate");
        await verifySchema();
        console.log("Ensaio concluído sem erro; desfazendo.");
      } finally {
        await client.query("rollback");
      }
      return;
    }

    for (const name of pending) {
      const sql = readFileSync(path.join(dir, name), "utf8");
      if (ownsTransaction(sql)) {
        await client.query(sql);
        await client.query("insert into public.app_migrations (name, checksum) values ($1, $2)", [name, checksum(sql)]);
      } else {
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query("insert into public.app_migrations (name, checksum) values ($1, $2)", [name, checksum(sql)]);
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
      console.log(`aplicada: ${name}`);
    }
    await verifySchema();
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
