"use server";

import { ActionError, runAction } from "../action-result";

import { db, properties } from "../db";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { ACTIVE_LISTING_STATUSES, listingLimit, photoLimit } from "../plans";
import { isActiveListingStatus, reserveListingSlot } from "../listing-limit";
import { propertyChanges, PropertyInventoryError, PROPERTY_STATUSES, validatePropertyRevision, type PropertyInput, type PropertyStatus } from "../property-input";
import { assinarFotosDeImoveis } from "../photo-sign";

async function getOwnPropertiesImpl(input: { page?: number; search?: string; status?: string; id?: string } = {}) {
  const actor = await requireCurrentUser();
  const { page = 1, search = "", status = "todos", id } = input;
  if (!Number.isInteger(page) || page < 1 || page > 100000 || typeof search !== "string" || search.length > 200 ||
    (status !== "todos" && !PROPERTY_STATUSES.includes(status as PropertyStatus)) ||
    (id !== undefined && (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))) throw new ActionError("Filtros inválidos.");
  const pattern = `%${search.trim().replace(/[\\%_]/g, character => `\\${character}`)}%`;
  // `id`: o botão "Editar em Meus imóveis" da Vitrine abre um imóvel — só se for da carteira de quem pede.
  const scope = and(eq(properties.brokerId, actor.id), id ? eq(properties.id, id) : undefined,
    status === "todos" ? undefined : eq(properties.status, status),
    search.trim() ? or(ilike(properties.title, pattern), ilike(properties.city, pattern), ilike(properties.neighborhood, pattern)) : undefined);
  const [items, totals, active] = await Promise.all([
    db.select().from(properties).where(scope).orderBy(desc(properties.createdAt), desc(properties.id)).limit(24).offset((page - 1) * 24),
    db.select({ total: count() }).from(properties).where(scope),
    db.select({ total: count() }).from(properties).where(and(eq(properties.brokerId, actor.id), inArray(properties.status, [...ACTIVE_LISTING_STATUSES]))),
  ]);
  // Inventário é só do dono (scope = brokerId do ator): assina as fotos privadas dele.
  const itemsAssinados = await assinarFotosDeImoveis(items);
  return { items: itemsAssinados, total: totals[0].total, activeListings: active[0].total, listingLimit: actor.role === "admin" ? null : listingLimit(actor.plan) };
}

async function updateOwnPropertyImpl(id: string, revision: string, input: PropertyInput) {
  const actor = await requireCurrentUser();
  validatePropertyRevision(id, revision);
  // Limite de fotos por anúncio é do plano (a garantia mora no servidor, como no cadastro).
  const maxFotos = photoLimit(actor.plan);
  if ((input.photos?.length ?? 0) > maxFotos) throw new ActionError(`Seu plano permite até ${maxFotos} fotos por anúncio.`);
  const changes = propertyChanges(input);
  const property = await db.transaction(async tx => {
    const [current] = await tx.select().from(properties).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).for("update").limit(1);
    if (!current) throw new PropertyInventoryError("Imóvel não encontrado na sua carteira.");
    if (current.updatedAt.getTime() !== Date.parse(revision)) throw new PropertyInventoryError("Este imóvel foi alterado em outra sessão. Recarregue antes de salvar.");
    const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
    // Condição de parceria (14/10/2026): entrar na rede, trocar a condição ou revisar o imóvel antigo pede a confirmação
    // do captador — ela grava a data e encerra a revisão. Na carteira, não se aplica.
    const naRede = changes.acceptsPartnership === true;
    const precisaConfirmar = naRede && (!current.acceptsPartnership || current.partnershipReviewPending || current.partnershipModels !== changes.partnershipModels);
    if (precisaConfirmar && input.confirmaParceria !== true) {
      throw new PropertyInventoryError("Confirme que este imóvel aceita parceria nas condições informadas para mantê-lo na rede.");
    }
    const parceria = precisaConfirmar ? { partnershipConfirmedAt: new Date(), partnershipReviewPending: false }
      : naRede ? {} : { partnershipReviewPending: false };
    const [updated] = await tx.update(properties).set({ ...changes, ...parceria, updatedAt }).where(and(eq(properties.id, id), eq(properties.brokerId, actor.id))).returning();
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
