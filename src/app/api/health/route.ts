import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Keep-alive do banco: um SELECT 1 diário (Vercel Cron em vercel.json) mantém o projeto
// Supabase ATIVO — no plano free ele pausa sozinho após ~1 semana sem atividade, e aí o app
// "fica parado" (a landing estática carrega, mas as Server Actions quebram). Também serve de
// health check manual: GET /api/health → { ok, db, ms }.
export const dynamic = "force-dynamic"; // nunca cacheia: tem de bater no banco toda vez
export const runtime = "nodejs"; // pg (node-postgres) não roda no Edge

export async function GET(req: Request) {
  // Se CRON_SECRET estiver definido, exige o Bearer que o Vercel Cron envia (opcional).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up", ms: Date.now() - started, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: "down", error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
