// Feedback do piloto (envio pelo corretor; triagem pelo admin). Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, pilotFeedback, users, notifications } from "../db";
import { and, eq, ne } from "drizzle-orm";
import { avisoDeFeedback } from "../aviso-de-feedback";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "../auth";

export async function submitPilotFeedbackImpl(input: { screen: string; category: string; message: string }) {
  const actor = await requireCurrentUser();
  const screen = input.screen.trim();
  const category = input.category.trim();
  const message = input.message.trim();
  if (!["vitrine", "crm", "radar", "cadastrar", "termo", "dvp", "financeiro", "admin"].includes(screen)) throw new ActionError("Selecione uma tela válida.");
  if (!["duvida", "erro", "ideia"].includes(category)) throw new ActionError("Selecione um tipo de feedback válido.");
  if (message.length < 10 || message.length > 2000) throw new ActionError("Escreva de 10 a 2.000 caracteres.");
  // O feedback e o aviso no sino de cada administrador (menos quem mandou) entram juntos (28/10/2026, lib/aviso-de-feedback).
  const feedback = await db.transaction(async (tx) => {
    const [criado] = await tx.insert(pilotFeedback).values({ userId: actor.id, screen, category, message }).returning({ id: pilotFeedback.id, createdAt: pilotFeedback.createdAt });
    const [autor] = await tx.select({ name: users.name }).from(users).where(eq(users.id, actor.id)).limit(1);
    const administradores = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, actor.id)));
    const aviso = avisoDeFeedback({ nome: autor?.name || "Corretor", screen, category, message });
    if (administradores.length) await tx.insert(notifications).values(administradores.map((admin) => ({ userId: admin.id, ...aviso, type: "feedback", read: false })));
    return criado;
  });
  revalidatePath("/");
  return { success: true, feedback };
}

export async function updatePilotFeedbackStatusImpl(feedbackId: string, status: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Apenas administradores podem atualizar o feedback do piloto.");
  if (!["novo", "em_analise", "concluido"].includes(status)) throw new ActionError("Status de feedback inválido.");
  const [updated] = await db.update(pilotFeedback).set({
    status,
    reviewedAt: status === "novo" ? null : new Date(),
    reviewedBy: status === "novo" ? null : actor.id,
  }).where(eq(pilotFeedback.id, feedbackId)).returning({ id: pilotFeedback.id, status: pilotFeedback.status, reviewedAt: pilotFeedback.reviewedAt });
  if (!updated) throw new ActionError("Feedback não encontrado.");
  revalidatePath("/");
  return { success: true, feedback: updated };
}
