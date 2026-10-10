import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL precisa estar configurada em produção.");
}

const connectionString = process.env.DATABASE_URL || "postgresql://negocialar:negocialar_dev_password@localhost:5433/negocialar_db";

const isSupabase = connectionString.includes("supabase.com") || connectionString.includes("supabase.co");
const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname);
const isRemote = isSupabase || (process.env.NODE_ENV === "production" && !isLocalhost);

const pool = new Pool({
  connectionString,
  ssl: isRemote
    ? {
        ca: isSupabase ? (process.env.SUPABASE_DB_CA_CERT || SUPABASE_ROOT_CA) : undefined,
        rejectUnauthorized: true,
      }
    : undefined,
  // Na Vercel cada instância abre o próprio pool: poucas conexões por instância para não esgotar o Supabase.
  max: Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export * from "./schema";
