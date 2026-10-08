"use server";

import { db, properties } from "../db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { propertyChanges, PropertyInventoryError, PROPERTY_STATUSES, validatePropertyRevision, type PropertyInput, type PropertyStatus } from "../property-input";

export async function getOwnProperties(input: { page?: number; search?: string; status?: string } = {}) {
  const actor = await requireCurrentUser();
  const { page = 1, search = "", status = "todos" } = input;
  if (!Number.isInteger(page) || page < 1 || page > 100000 || typeof search !== "string" || search.length > 200 ||
    (status !== "todos" && !PROPERTY_STATUSES.includes(status as PropertyStatus))) throw new Error("Filtros inválidos.");
  const pattern = `%${search.trim().replace(/[\\%_]/g, character => `\\${character}`)}%`;
  const scope = and(eq(properties.brokerId, actor.id),
    status === "todos" ? undefined : eq(properties.status, status),
    search.trim() ? or(ilike(properties.title, pattern), ilike(properties.city, pattern), ilike(properties.neighborhood, pattern)) : undefined);
  const [items, totals] = await Promise.all([
    db.select().from(properties).where(scope).orderBy(desc(properties.createdAt), desc(properties.id)).limit(24).offset((page - 1) * 24),
    db.select({ total: count() }).from(properties).where(scope),
  ]);
  return { items, total: totals[0].total };
}

export async function updateOwnProperty(id: string, revision: string, input: PropertyInput) {
  const actor = await requireCurrentUser();
  validatePropertyRevision(id, revision);
  const changes = propertyChanges(input);
  const property = await db.transaction(async tx => {
    const [current] = await tx.select().from(properties).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).for("update").limit(1);
    if (!current) throw new PropertyInventoryError("Imóvel não encontrado na sua carteira.");
    if (current.updatedAt.getTime() !== Date.parse(revision)) throw new PropertyInventoryError("Este imóvel foi alterado em outra sessão. Recarregue antes de salvar.");
    const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
    const [updated] = await tx.update(properties).set({ ...changes, updatedAt }).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).returning();
    return updated;
  });
  revalidatePath("/");
  return { success: true, property };
}

export async function updateOwnPropertyStatus(id: string, revision: string, status: PropertyStatus) {
  const actor = await requireCurrentUser();
  validatePropertyRevision(id, revision);
  if (!PROPERTY_STATUSES.includes(status)) throw new PropertyInventoryError("Status inválido.");
  // Publishing a property again requires current access to the network.
  if (status === "disponivel") requireActiveBroker(actor);
  const property = await db.transaction(async tx => {
    const [current] = await tx.select().from(properties).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).for("update").limit(1);
    if (!current) throw new PropertyInventoryError("Imóvel não encontrado na sua carteira.");
    if (current.updatedAt.getTime() !== Date.parse(revision)) throw new PropertyInventoryError("Este imóvel foi alterado em outra sessão. Recarregue a carteira.");
    const [updated] = await tx.update(properties).set({ status, updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)) })
      .where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).returning();
    return updated;
  });
  revalidatePath("/");
  return { success: true, property };
}

export async function updateOwnPropertyForm(id: string, revision: string, input: PropertyInput) {
  try { await updateOwnProperty(id, revision, input); return { success: true as const }; }
  catch (error) { return { success: false as const, error: error instanceof PropertyInventoryError ? error.message : "Não foi possível salvar o imóvel. Confira sua sessão e tente novamente." }; }
}
export async function updateOwnPropertyStatusForm(id: string, revision: string, status: PropertyStatus) {
  try { await updateOwnPropertyStatus(id, revision, status); return { success: true as const }; }
  catch (error) { return { success: false as const, error: error instanceof PropertyInventoryError ? error.message : "Não foi possível alterar o status. Confira sua sessão, a aprovação do CRECI e sua assinatura." }; }
}
