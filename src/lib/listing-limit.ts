import { and, count, eq, inArray } from "drizzle-orm";
import { ActionError } from "./action-result";
import { db, properties, users } from "./db";
import { ACTIVE_LISTING_STATUSES, listingLimit } from "./plans";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const isActiveListingStatus = (status: string) => (ACTIVE_LISTING_STATUSES as readonly string[]).includes(status);

// Conta os anúncios ativos com a linha do corretor travada: dois cadastros simultâneos não passam do limite do plano.
export async function reserveListingSlot(tx: Tx, actor: { id: string; role: string; plan: string }) {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, actor.id)).for("update");
  if (actor.role === "admin") return;
  const limit = listingLimit(actor.plan);
  const [{ total }] = await tx.select({ total: count() }).from(properties)
    .where(and(eq(properties.brokerId, actor.id), inArray(properties.status, [...ACTIVE_LISTING_STATUSES])));
  if (total >= limit) {
    throw new ActionError(`Seu plano permite ${limit} anúncios ativos e você já tem ${total}. Marque um anúncio como vendido, alugado ou arquivado, ou mude de plano em Minha assinatura.`);
  }
}
