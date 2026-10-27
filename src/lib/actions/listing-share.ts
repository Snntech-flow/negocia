import { and, eq } from "drizzle-orm";
import { db, properties, users } from "../db";
import { ActionError } from "../action-result";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { canUseProperty } from "../property-access";
import { signListingShare } from "../listing-share";

// Gera o token do link público da ficha para o imóvel, com o corretor atual como quem compartilha.
// Só vale para imóvel que o corretor pode ver (o seu, ou um da rede disponível) — a mesma regra da vitrine.
export async function createListingShareLinkImpl(propertyId: string) {
  if (typeof propertyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) {
    throw new ActionError("Imóvel inválido.");
  }
  const actor = await requireCurrentUser();
  const [prop] = await db
    .select({ brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, status: properties.status, verificationStatus: users.verificationStatus })
    .from(properties)
    .innerJoin(users, eq(properties.brokerId, users.id))
    .where(eq(properties.id, propertyId))
    .limit(1);
  if (!prop) throw new ActionError("Imóvel não encontrado.");
  // Compartilhar imóvel da rede (de outro corretor) exige corretor ativo; o próprio imóvel pode sempre.
  if (prop.brokerId !== actor.id) requireActiveBroker(actor);
  if (!canUseProperty(prop, actor.id)) throw new ActionError("Você não pode compartilhar este imóvel.");
  return { token: signListingShare(propertyId, actor.id) };
}
