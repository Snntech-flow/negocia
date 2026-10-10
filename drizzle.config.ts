import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url = process.env.DATABASE_URL || "postgresql://negocialar:negocialar_dev_password@localhost:5433/negocialar_db";
// O .env.local costuma apontar para o Supabase de produção. Produção muda por supabase/migrations (npm run db:migrate),
// não por drizzle-kit push; para mexer num banco remoto de propósito, defina NEGOCIAR_LAR_ALLOW_REMOTE_DRIZZLE=yes.
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && process.env.NEGOCIAR_LAR_ALLOW_REMOTE_DRIZZLE !== "yes") {
  throw new Error(`drizzle-kit bloqueado para ${host}: use as migrations (npm run db:migrate) ou defina NEGOCIAR_LAR_ALLOW_REMOTE_DRIZZLE=yes.`);
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
