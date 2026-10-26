// Assistente do corretor (Bartolomeu). Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, leads, authLoginAttempts } from "../db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { generateBrokerAnswer, validateBrokerAssistantInput, type BrokerAssistantInput } from "../broker-assistant";

export async function getBrokerAssistantStatusImpl() {
  await requireCurrentUser();
  return { enabled: !!process.env.GEMINI_API_KEY };
}

export async function askBrokerAssistantImpl(input: BrokerAssistantInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const cleaned = validateBrokerAssistantInput(input);
  if (!process.env.GEMINI_API_KEY) throw new ActionError("O Bartolomeu aguarda a configuração da IA pela equipe.");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const keyHash = crypto.createHash("sha256").update(`broker-assistant:${actor.id}:${day}`).digest("hex");
  const [counter] = await db.insert(authLoginAttempts).values({ keyHash, attempts: 1, updatedAt: new Date() }).onConflictDoUpdate({ target: authLoginAttempts.keyHash, set: { attempts: sql`${authLoginAttempts.attempts} + 1`, updatedAt: new Date() } }).returning({ attempts: authLoginAttempts.attempts });
  if (counter.attempts > 60) throw new ActionError("Você atingiu as 60 perguntas de hoje. Seu acesso ao CRM continua normal; novas perguntas serão liberadas amanhã.");
  const rows = await db.select({ stage: leads.stage, total: sql<number>`count(*)::int` }).from(leads).where(eq(leads.ownerUserId, actor.id)).groupBy(leads.stage);
  const summary = JSON.stringify(rows);
  return generateBrokerAnswer(cleaned, summary);
}
