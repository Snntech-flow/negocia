// Documentos da negociação e o modelo pessoal do corretor. Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, leads, properties, users } from "../db";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { canUseProperty } from "../property-access";
import { validateNegotiationDocuments, type NegotiationDocuments } from "../negotiation-documents";

export async function saveNegotiationDocumentsImpl(leadId: string, input: NegotiationDocuments) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const data = validateNegotiationDocuments(input);
  const [owned] = await db.select({id: leads.id}).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!owned) throw new ActionError("Cliente não encontrado na sua carteira.");
  if (data.propertyId) {
    const [property] = await db.select({title: properties.title, city: properties.city, brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, status: properties.status, verificationStatus: users.verificationStatus})
      .from(properties).innerJoin(users, eq(properties.brokerId, users.id)).where(eq(properties.id, data.propertyId)).limit(1);
    if (!property || !canUseProperty(property, actor.id)) throw new ActionError("Imóvel não disponível para esta negociação.");
    data.propertyTitle = property.title; data.city = data.city.trim();
  }
  const [saved] = await db.update(leads).set({documentation: data, updatedAt: new Date()}).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning({documentation: leads.documentation});
  revalidatePath("/");
  return {documentation: saved.documentation!};
}

export async function saveMyDocumentationTemplateImpl(input: NegotiationDocuments) {
  const actor = await requireCurrentUser(); requireActiveBroker(actor);
  const data = validateNegotiationDocuments(input);
  const template = {...data, propertyId: null, propertyTitle: "", statuses: {}};
  await db.update(users).set({documentationTemplate: template}).where(eq(users.id, actor.id));
  return {success:true};
}

export async function getMyDocumentationTemplateImpl() {
  const actor = await requireCurrentUser(); requireActiveBroker(actor);
  const [row] = await db.select({template: users.documentationTemplate}).from(users).where(eq(users.id, actor.id)).limit(1);
  return row?.template || null;
}
