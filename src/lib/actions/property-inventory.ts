"use server";

import { ActionError, runAction } from "../action-result";

import { db, properties } from "../db";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { ACTIVE_LISTING_STATUSES, listingLimit } from "../plans";
import { isActiveListingStatus, reserveListingSlot } from "../listing-limit";
import { propertyChanges, PropertyInventoryError, PROPERTY_STATUSES, validatePropertyRevision, type PropertyInput, type PropertyStatus } from "../property-input";

async function getOwnPropertiesImpl(input: { page?: number; search?: string; status?: string } = {}) {
  const actor = await requireCurrentUser();
  const { page = 1, search = "", status = "todos" } = input;
  if (!Number.isInteger(page) || page < 1 || page > 100000 || typeof search !== "string" || search.length > 200 ||
    (status !== "todos" && !PROPERTY_STATUSES.includes(status as PropertyStatus))) throw new ActionError("Filtros inválidos.");
  const pattern = `%${search.trim().replace(/[\\%_]/g, character => `\\${character}`)}%`;
  const scope = and(eq(properties.brokerId, actor.id),
    status === "todos" ? undefined : eq(properties.status, status),
    search.trim() ? or(ilike(properties.title, pattern), ilike(properties.city, pattern), ilike(properties.neighborhood, pattern)) : undefined);
  const [items, totals, active] = await Promise.all([
    db.select().from(properties).where(scope).orderBy(desc(properties.createdAt), desc(properties.id)).limit(24).offset((page - 1) * 24),
    db.select({ total: count() }).from(properties).where(scope),
    db.select({ total: count() }).from(properties).where(and(eq(properties.brokerId, actor.id), inArray(properties.status, [...ACTIVE_LISTING_STATUSES]))),
  ]);
  return { items, total: totals[0].total, activeListings: active[0].total, listingLimit: actor.role === "admin" ? null : listingLimit(actor.plan) };
}

async function updateOwnPropertyImpl(id: string, revision: string, input: PropertyInput) {
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

async function updateOwnPropertyStatusImpl(id: string, revision: string, status: PropertyStatus) {
  const actor = await requireCurrentUser();
  validatePropertyRevision(id, revision);
  if (!PROPERTY_STATUSES.includes(status)) throw new PropertyInventoryError("Status inválido.");
  // Publishing a property again requires current access to the network.
  if (status === "disponivel") requireActiveBroker(actor);
  const property = await db.transaction(async tx => {
    const [current] = await tx.select().from(properties).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).for("update").limit(1);
    if (!current) throw new PropertyInventoryError("Imóvel não encontrado na sua carteira.");
    if (current.updatedAt.getTime() !== Date.parse(revision)) throw new PropertyInventoryError("Este imóvel foi alterado em outra sessão. Recarregue a carteira.");
    if (isActiveListingStatus(status) && !isActiveListingStatus(current.status)) await reserveListingSlot(tx, actor);
    const [updated] = await tx.update(properties).set({ status, updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)) })
      .where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).returning();
    return updated;
  });
  revalidatePath("/");
  return { success: true, property };
}

export async function getOwnProperties(...args: Parameters<typeof getOwnPropertiesImpl>) { return runAction(() => getOwnPropertiesImpl(...args)); }
export async function updateOwnProperty(...args: Parameters<typeof updateOwnPropertyImpl>) { return runAction(() => updateOwnPropertyImpl(...args)); }
export async function updateOwnPropertyStatus(...args: Parameters<typeof updateOwnPropertyStatusImpl>) { return runAction(() => updateOwnPropertyStatusImpl(...args)); }
