import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://negocialar:negocialar_dev_password@localhost:5433/negocialar_db";

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export * from "./schema";
