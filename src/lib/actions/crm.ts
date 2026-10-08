"use server";

import { db, leads, leadActivities } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { validateLeadInput } from "../input-validation";

const LEAD_STAGES = ["novo", "contato", "qualificado", "visita", "proposta", "negociacao", "fechado", "perdido"] as const;
const LEAD_ACTIVITY_TYPES = ["ligacao", "mensagem", "visita", "proposta", "nota"] as const;

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function parseLeadDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Informe uma data válida para o próximo retorno.");
  return date;
}

export async function createLead(data: {
  fullName: string;
  phone: string;
  email?: string;
  leadType: string;
  source: string;
  propertyType?: string;
  city?: string;
  neighborhoods?: string[];
  maxBudget?: string;
  minBedrooms?: number;
  notes?: string;
  nextAction?: string;
  nextActionAt?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validateLeadInput(data);
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome do lead.");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error("Informe um telefone válido com DDD.");
  if (!(["comprador", "proprietario", "locatario", "parceiro"] as string[]).includes(data.leadType)) throw new Error("Tipo de lead inválido.");
  if (!(["indicacao", "whatsapp", "portal", "site", "ligacao", "rede_social", "outro"] as string[]).includes(data.source)) throw new Error("Origem do lead inválida.");
  const email = data.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  const maxBudget = data.maxBudget?.trim() || null;
  if (maxBudget && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0)) throw new Error("O orçamento deve ser maior que zero.");
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 3000) throw new Error("As observações devem ter até 3.000 caracteres.");

  try {
    const result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(leads).values({
        ownerUserId: actor.id,
        fullName,
        phone,
        normalizedPhone,
        email,
        leadType: data.leadType,
        source: data.source,
        propertyType: data.propertyType?.trim() || null,
        city: data.city?.trim() || null,
        neighborhoods: (data.neighborhoods || []).map((value) => value.trim()).filter(Boolean).slice(0, 20),
        maxBudget,
        minBedrooms: Number.isInteger(data.minBedrooms) && Number(data.minBedrooms) > 0 ? Number(data.minBedrooms) : null,
        notes,
        nextAction: data.nextAction?.trim() || null,
        nextActionAt,
        stage: "novo",
        updatedAt: new Date(),
      }).returning();
      const [activity] = await tx.insert(leadActivities).values({
        leadId: created.id,
        userId: actor.id,
        activityType: "cadastro",
        description: "Lead cadastrado no CRM.",
      }).returning();
      return { lead: created, activity };
    });
    revalidatePath("/");
    return { success: true, ...result };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("Já existe um lead com este telefone na sua carteira.");
    throw error;
  }
}

export async function importLeadsCsv(rows: Array<{
  fullName: string; phone: string; email?: string; leadType?: string; source?: string;
  propertyType?: string; city?: string; neighborhoods?: string; maxBudget?: string;
  minBedrooms?: string; notes?: string;
}>) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) {
    throw new Error("Importe de 1 a 100 contatos por arquivo.");
  }
  const typeMap: Record<string, string> = { comprador: "comprador", proprietario: "proprietario", "proprietário": "proprietario", "proprietario / vendedor": "proprietario", "proprietário / vendedor": "proprietario", locatario: "locatario", "locatário": "locatario", parceiro: "parceiro", "corretor parceiro": "parceiro" };
  const sourceMap: Record<string, string> = { indicacao: "indicacao", "indicação": "indicacao", whatsapp: "whatsapp", portal: "portal", "portal imobiliario": "portal", "portal imobiliário": "portal", site: "site", ligacao: "ligacao", "ligação": "ligacao", "rede social": "rede_social", rede_social: "rede_social", outro: "outro" };
  const seen = new Set<string>();
  const cleaned = rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Linha ${index + 2}: registro inválido.`);
    const fullName = String(row.fullName || "").trim();
    const phone = String(row.phone || "").trim();
    const normalizedPhone = normalizePhone(phone);
    const line = index + 2;
    if (fullName.length < 2 || fullName.length > 120) throw new Error(`Linha ${line}: nome inválido.`);
    if (phone.length > 30 || normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error(`Linha ${line}: telefone inválido (inclua DDD).`);
    if (seen.has(normalizedPhone)) throw new Error(`Linha ${line}: telefone repetido no arquivo.`);
    seen.add(normalizedPhone);
    const email = String(row.email || "").trim().toLowerCase() || null;
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error(`Linha ${line}: e-mail inválido.`);
    const leadTypeInput = String(row.leadType || "comprador").trim().toLowerCase();
    const sourceInput = String(row.source || "outro").trim().toLowerCase();
    const leadType = typeMap[leadTypeInput];
    const source = sourceMap[sourceInput];
    if (!leadType) throw new Error(`Linha ${line}: tipo deve ser comprador, proprietario, locatario ou parceiro.`);
    if (!source) throw new Error(`Linha ${line}: origem inválida.`);
    const maxBudget = String(row.maxBudget || "").trim().replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".") || null;
    if (maxBudget && (!/^\d+(?:\.\d{1,2})?$/.test(maxBudget) || !Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0 || Number(maxBudget) > 9999999999.99)) throw new Error(`Linha ${line}: orçamento inválido.`);
    const minBedrooms = String(row.minBedrooms || "").trim() ? Number(row.minBedrooms) : null;
    if (minBedrooms !== null && (!Number.isInteger(minBedrooms) || minBedrooms < 1 || minBedrooms > 20)) throw new Error(`Linha ${line}: quartos mínimos inválidos.`);
    const notes = String(row.notes || "").trim() || null;
    if (notes && notes.length > 3000) throw new Error(`Linha ${line}: observação acima de 3.000 caracteres.`);
    const propertyType = String(row.propertyType || "").trim();
    const city = String(row.city || "").trim();
    const neighborhoodText = String(row.neighborhoods || "");
    if (propertyType.length > 80 || city.length > 120 || neighborhoodText.length > 2500) throw new Error(`Linha ${line}: preferências acima do limite permitido.`);
    return {
      ownerUserId: actor.id, fullName, phone, normalizedPhone, email, leadType, source,
      propertyType: propertyType || null,
      city: city || null,
      neighborhoods: neighborhoodText.split(/[|,]/).map((part) => part.trim()).filter(Boolean).slice(0, 20),
      maxBudget, minBedrooms, notes, stage: "novo" as const,
    };
  });
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(leads).values(cleaned).onConflictDoNothing({ target: [leads.ownerUserId, leads.normalizedPhone] }).returning();
    const insertedActivities = inserted.length ? await tx.insert(leadActivities).values(inserted.map(({ id }) => ({ leadId: id, userId: actor.id, activityType: "cadastro", description: "Lead importado por arquivo CSV." }))).returning() : [];
    return { imported: inserted.length, duplicates: rows.length - inserted.length, leads: inserted, activities: insertedActivities };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function updateLead(leadId: string, data: Parameters<typeof createLead>[0]) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validateLeadInput(data);
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome do lead.");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error("Informe um telefone válido com DDD.");
  if (!( ["comprador", "proprietario", "locatario", "parceiro"] as string[]).includes(data.leadType)) throw new Error("Tipo de lead inválido.");
  if (!( ["indicacao", "whatsapp", "portal", "site", "ligacao", "rede_social", "outro"] as string[]).includes(data.source)) throw new Error("Origem do lead inválida.");
  const email = data.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  const maxBudget = data.maxBudget?.trim() || null;
  if (maxBudget && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0)) throw new Error("O orçamento deve ser maior que zero.");
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 3000) throw new Error("As observações devem ter até 3.000 caracteres.");
  const [ownedLead] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!ownedLead) throw new Error("Lead não encontrado na sua carteira.");

  try {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(leads).set({
        fullName,
        phone,
        normalizedPhone,
        email,
        leadType: data.leadType,
        source: data.source,
        propertyType: data.propertyType?.trim() || null,
        city: data.city?.trim() || null,
        neighborhoods: (data.neighborhoods || []).map((value) => value.trim()).filter(Boolean).slice(0, 20),
        maxBudget,
        minBedrooms: Number.isInteger(data.minBedrooms) && Number(data.minBedrooms) > 0 ? Number(data.minBedrooms) : null,
        notes,
        nextAction: data.nextAction?.trim() || null,
        nextActionAt,
        updatedAt: new Date(),
      }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
      const [activity] = await tx.insert(leadActivities).values({
        leadId,
        userId: actor.id,
        activityType: "nota",
        description: "Dados cadastrais e preferências do lead atualizados.",
      }).returning();
      return { lead: updated, activity };
    });
    revalidatePath("/");
    return { success: true, ...result };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("Já existe outro lead com este telefone na sua carteira.");
    throw error;
  }
}

export async function updateLeadStage(leadId: string, nextStage: string, lostReason?: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!(LEAD_STAGES as readonly string[]).includes(nextStage)) throw new Error("Etapa inválida.");
  const [lead] = await db.select({ id: leads.id, stage: leads.stage }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  const cleanLostReason = lostReason?.trim() || null;
  if (nextStage === "perdido" && !cleanLostReason) throw new Error("Informe o motivo da perda.");
  const result = await db.transaction(async (tx) => {
    const [saved] = await tx.update(leads).set({ stage: nextStage, lostReason: nextStage === "perdido" ? cleanLostReason : null, updatedAt: new Date() }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
    const [activity] = await tx.insert(leadActivities).values({
      leadId,
      userId: actor.id,
      activityType: "etapa",
      description: `Etapa alterada: ${lead.stage} → ${nextStage}${cleanLostReason ? `. Motivo: ${cleanLostReason}` : ""}.`,
    }).returning();
    return { lead: saved, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function addLeadActivity(data: {
  leadId: string;
  activityType: string;
  description: string;
  nextAction?: string;
  nextActionAt?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!(LEAD_ACTIVITY_TYPES as readonly string[]).includes(data.activityType)) throw new Error("Tipo de atividade inválido.");
  const description = data.description.trim();
  if (description.length < 2 || description.length > 2000) throw new Error("Descreva o contato em até 2.000 caracteres.");
  const [lead] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  const nextAction = data.nextAction?.trim() || null;
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const [activity] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(leadActivities).values({ leadId: lead.id, userId: actor.id, activityType: data.activityType, description }).returning();
    await tx.update(leads).set({
      ...(data.activityType === "nota" ? {} : { lastContactAt: new Date() }),
      nextAction,
      nextActionAt,
      updatedAt: new Date(),
    }).where(and(eq(leads.id, lead.id), eq(leads.ownerUserId, actor.id)));
    return [created];
  });
  revalidatePath("/");
  return { success: true, activity };
}

export async function completeLeadFollowUp(leadId: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const [lead] = await db.select({
    id: leads.id,
    stage: leads.stage,
    nextAction: leads.nextAction,
    nextActionAt: leads.nextActionAt,
  }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  if (["fechado", "perdido"].includes(lead.stage)) throw new Error("Leads encerrados não têm retornos ativos.");
  if (!lead.nextActionAt) throw new Error("Este lead não tem retorno agendado.");

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(leads).set({
      nextAction: null,
      nextActionAt: null,
      lastContactAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
    const [activity] = await tx.insert(leadActivities).values({
      leadId,
      userId: actor.id,
      activityType: "nota",
      description: `Retorno concluído${lead.nextAction ? `: ${lead.nextAction}` : ""}.`,
    }).returning();
    return { lead: updated, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}
