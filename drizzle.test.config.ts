import { defineConfig } from "drizzle-kit";

const url = process.env.NEGOCIAR_LAR_TEST_DATABASE_URL;
if (!url) throw new Error("Configure NEGOCIAR_LAR_TEST_DATABASE_URL com um banco local descartável.");
const parsed = new URL(url);
if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.toLowerCase().includes("test")) {
  throw new Error("O schema de testes só pode ser aplicado em um banco local cujo nome contenha test.");
}
export default defineConfig({ dialect: "postgresql", schema: "./src/lib/db/schema.ts", dbCredentials: { url } });
