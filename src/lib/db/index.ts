import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://negocialar:negocialar_dev_password@localhost:5433/negocialar_db";

const isRemote =
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export * from "./schema";
