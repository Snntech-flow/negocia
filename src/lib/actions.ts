"use server";

import { validateNegotiationDocuments, type NegotiationDocuments } from "./negotiation-documents";

import {
  db,
  properties,
  users,
  buyerProfiles,
  leads,
  leadActivities,
  partnerships,
  partnershipActivities,
  pilotFeedback,
  transactions,
  notifications,
  dvpCertificates,
  authLoginAttempts,
} from "./db";
import { eq, desc, and, lte, gte, or, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";
import { generateBrokerAnswer, validateBrokerAssistantInput, type BrokerAssistantInput } from "./broker-assistant";
import { addFreeDays, extendPaidPeriod } from "./subscription";
import { getCurrentUserId as readCurrentUserId, requireCurrentUser, requireActiveBroker, requestAddress,
  limitRegistrationAttempts, setBrokerSession, hashPassword, verifyPassword, SESSION_COOKIE } from "./auth";
export async function getCurrentUserId() { return readCurrentUserId(); }
import { networkPropertyScope, networkProfileScope, canUseProperty } from "./property-access";
import type { PropertyInput } from "./property-input";
import { validateBuyerProfileInput, validatePropertyInput } from "./input-validation";

import { getMarketplaceData as readMarketplaceData } from "./queries/marketplace";
import type { MarketplaceQuery } from "./marketplace-query";
export async function getMarketplaceData(input: MarketplaceQuery = {}) { return readMarketplaceData(input); }

import * as crmActions from "./actions/crm";
export async function createLead(...args: Parameters<typeof crmActions.createLead>) { return crmActions.createLead(...args); }
export async function importLeadsCsv(...args: Parameters<typeof crmActions.importLeadsCsv>) { return crmActions.importLeadsCsv(...args); }
export async function updateLead(...args: Parameters<typeof crmActions.updateLead>) { return crmActions.updateLead(...args); }
export async function updateLeadStage(...args: Parameters<typeof crmActions.updateLeadStage>) { return crmActions.updateLeadStage(...args); }
export async function addLeadActivity(...args: Parameters<typeof crmActions.addLeadActivity>) { return crmActions.addLeadActivity(...args); }
export async function completeLeadFollowUp(...args: Parameters<typeof crmActions.completeLeadFollowUp>) { return crmActions.completeLeadFollowUp(...args); }

export async function updateUserStatus(userId: string, newStatus: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new Error("Ação restrita à administração.");
  if (!["pendente", "aprovado", "suspenso"].includes(newStatus)) throw new Error("Status inválido.");
  await db
    .update(users)
    .set({
      verificationStatus: newStatus,
      isVerified: newStatus === "aprovado",
      ...(newStatus === "suspenso" ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/");
  return { success: true };
}

export async function confirmPixSubscriptionPayment(transactionId: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new Error("Ação restrita à administração.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
    throw new Error("Transação inválida.");
  }

  const payment = await db.transaction(async (tx) => {
    const [pending] = await tx.select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
    }).from(transactions).where(eq(transactions.id, transactionId)).for("update").limit(1);
    if (!pending) throw new Error("Transação não encontrada.");
    if (!pending.type.startsWith("mensalidade_") || pending.paymentMethod !== "pix") {
      throw new Error("Apenas mensalidades via Pix podem ser confirmadas nesta tela.");
    }
    if (pending.status !== "pendente") throw new Error("Esta transação não está pendente.");

    const [confirmed] = await tx.update(transactions)
      .set({ status: "pago" })
      .where(and(eq(transactions.id, pending.id), eq(transactions.status, "pendente")))
      .returning({ id: transactions.id, userId: transactions.userId, amount: transactions.amount });
    if (!confirmed) throw new Error("A transação já foi atualizada.");

    const [subscriber] = await tx.select().from(users).where(eq(users.id, pending.userId)).for("update").limit(1);
    if (!subscriber) throw new Error("Assinante não encontrado.");
    await tx.update(users).set({ subscriptionStatus: "ativo", nextBillingDate: extendPaidPeriod(subscriber.nextBillingDate, subscriber.billingCycle), updatedAt: new Date() }).where(eq(users.id, pending.userId));
    if (subscriber.referredBy && !subscriber.referralRewardedAt) {
      const [referrer] = await tx.select().from(users).where(eq(users.id, subscriber.referredBy)).for("update").limit(1);
      if (referrer && referrer.verificationStatus !== "suspenso") {
        const start = referrer.nextBillingDate && referrer.nextBillingDate > new Date() ? referrer.nextBillingDate : new Date();
        await tx.update(users).set({ nextBillingDate: addFreeDays(start), subscriptionStatus: referrer.subscriptionStatus === "teste" ? "teste" : "ativo", updatedAt: new Date() }).where(eq(users.id, referrer.id));
        await tx.update(users).set({ referralRewardedAt: new Date() }).where(eq(users.id, subscriber.id));
        await tx.insert(notifications).values({ userId: referrer.id, title: "Você ganhou 30 dias grátis!", message: "O primeiro pagamento de um corretor indicado foi confirmado. Adicionamos 30 dias ao seu acesso.", type: "sistema", read: false });
      }
    }
    await tx.insert(notifications).values({
      userId: pending.userId,
      title: "Pagamento Pix confirmado",
      message: "A equipe confirmou o recebimento do Pix. Seu acesso será liberado assim que o CRECI também for aprovado.",
      type: "sistema",
      read: false,
    });
    return confirmed;
  });

  revalidatePath("/");
  return { success: true, payment };
}

export async function createProperty(formData: PropertyInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validatePropertyInput(formData);
  const targetBrokerId = actor.id;

  const [newProperty] = await db
    .insert(properties)
    .values({
      brokerId: targetBrokerId,
      title: formData.title,
      propertyType: formData.propertyType,
      salePrice: formData.salePrice,
      purpose: formData.purpose || "venda",
      acceptsTrade: formData.acceptsTrade ?? false,
      tradeDetails: formData.tradeDetails || null,
      condition: formData.condition || "usado",
      hotelRoomsCount: formData.hotelRoomsCount || null,
      condoFee: formData.condoFee || "0",
      iptu: formData.iptu || "0",
      iptuPeriod: formData.iptuPeriod || "anual",
      city: formData.city,
      state: formData.state || "SP",
      neighborhood: formData.neighborhood,
      cep: formData.cep || null,
      street: formData.street || null,
      streetNumber: formData.streetNumber || null,
      block: formData.block || null,
      floor: formData.floor || null,
      condoName: formData.condoName || null,
      hideStreet: formData.hideStreet ?? false,
      bedrooms: formData.bedrooms,
      suites: formData.suites,
      bathrooms: formData.bathrooms,
      parkingSpots: formData.parkingSpots,
      garageType: formData.garageType || "coberta",
      areaM2: formData.areaM2,
      usefulAreaM2: formData.usefulAreaM2 || null,
      totalAreaM2: formData.totalAreaM2 || null,
      solarPosition: formData.solarPosition || null,
      viewType: formData.viewType || null,
      propertyAge: formData.propertyAge || null,
      documentationStatus: formData.documentationStatus || null,
      acceptsFinancing: formData.acceptsFinancing ?? true,
      privateAmenities: formData.privateAmenities || [],
      condoAmenities: formData.condoAmenities || [],
      description: formData.description,
      videoUrl: formData.videoUrl || null,
      coverPhoto: formData.coverPhoto || null,
      photos:
        formData.photos && formData.photos.length > 0
          ? formData.photos
          : [
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
            ],
      floorPlanPhotos: formData.floorPlanPhotos || [],
      confidentialAddress: formData.confidentialAddress,
      ownerName: formData.ownerName,
      ownerPhone: formData.ownerPhone,
      acceptsPartnership: formData.acceptsPartnership,
      splitPercentage: formData.splitPercentage,
      status: "disponivel",
    })
    .returning();

  // Cruzamento dos critérios cadastrados para imóveis de venda compartilhados.
  try {
    if (formData.acceptsPartnership && (formData.purpose || "venda") === "venda") {
    const matchingProfiles = await db
      .select({
        id: buyerProfiles.id,
        brokerId: buyerProfiles.brokerId,
        propertyType: buyerProfiles.propertyType,
        neighborhoods: buyerProfiles.neighborhoods,
        maxBudget: buyerProfiles.maxBudget,
        minBedrooms: buyerProfiles.minBedrooms,
        minParkingSpots: buyerProfiles.minParkingSpots,
      })
      .from(buyerProfiles)
      .innerJoin(users, eq(buyerProfiles.brokerId, users.id))
      .where(and(networkProfileScope(), eq(buyerProfiles.city, formData.city)));

    const actualMatches = matchingProfiles.filter((bp) => {
      const maxBudget = Number(bp.maxBudget);
      const price = Number(formData.salePrice);
      const neighborhoods = Array.isArray(bp.neighborhoods) ? bp.neighborhoods as string[] : [];
      return bp.propertyType === formData.propertyType
        && (!neighborhoods.length || neighborhoods.includes(formData.neighborhood))
        && (!Number.isFinite(maxBudget) || maxBudget <= 0 || price <= maxBudget)
        && formData.bedrooms >= bp.minBedrooms
        && formData.parkingSpots >= bp.minParkingSpots;
    });
    for (const bp of actualMatches) {
      if (bp.brokerId !== targetBrokerId) {
        await db.insert(notifications).values({
          userId: bp.brokerId,
          title: `🤖 Match no Radar: Imóvel em ${formData.neighborhood}`,
          message: "Um imóvel compatível com os critérios do seu cliente foi cadastrado na rede.",
          type: "ai_match",
          propertyId: newProperty.id,
          read: false,
        });
      }
    }
    }
  } catch (matchErr) {
    console.warn("Aviso ao cruzar radar:", matchErr);
  }

  revalidatePath("/");
  return { success: true, property: newProperty };
}

export async function createBuyerProfile(profileData: {
  clientInternalName: string;
  propertyType: string;
  city: string;
  neighborhoods: string[];
  maxBudget: string;
  minBedrooms: number;
  minParkingSpots: number;
  notes?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validateBuyerProfileInput(profileData);
  const targetBrokerId = actor.id;

  const [newProfile] = await db
    .insert(buyerProfiles)
    .values({
      brokerId: targetBrokerId,
      clientInternalName: profileData.clientInternalName,
      propertyType: profileData.propertyType,
      city: profileData.city,
      neighborhoods: profileData.neighborhoods,
      maxBudget: profileData.maxBudget,
      minBedrooms: profileData.minBedrooms,
      minParkingSpots: profileData.minParkingSpots,
      notes: profileData.notes || null,
      active: true,
    })
    .returning();

  // 🤖 MOTOR DE IA: Busca instantânea no estoque da rede
  try {
    const matchingProps = await db
      .select({
        id: properties.id,
        title: properties.title,
        neighborhood: properties.neighborhood,
      })
      .from(properties)
      .innerJoin(users, eq(properties.brokerId, users.id))
      .where(
        and(
          networkPropertyScope(),
          eq(properties.city, profileData.city),
          eq(properties.purpose, "venda"),
          eq(properties.propertyType, profileData.propertyType),
          ...(profileData.neighborhoods.length ? [inArray(properties.neighborhood, profileData.neighborhoods)] : []),
          lte(properties.salePrice, profileData.maxBudget),
          gte(properties.bedrooms, profileData.minBedrooms),
          gte(properties.parkingSpots, profileData.minParkingSpots),
        )
      )
      .limit(3);

    if (matchingProps.length > 0) {
      await db.insert(notifications).values({
        userId: targetBrokerId,
        title: `🤖 ${matchingProps.length} Imóveis Encontrados para "${profileData.clientInternalName}"`,
        message: "Localizamos imóveis que atendem a alguns critérios cadastrados. Confirme os detalhes e as condições de parceria com o captador.",
        type: "ai_match",
        propertyId: matchingProps[0].id,
        read: false,
      });
    }
  } catch (e) {
    console.warn("Erro ao buscar matches para novo perfil:", e);
  }

  revalidatePath("/");
  return { success: true, profile: newProfile };
}

export async function createDvpCertificate(data: {
  propertyId: string;
  captorBrokerId: string;
  partnerBrokerId: string;
  leadId?: string;
  clientName: string;
  clientPhone?: string;
  clientCpfPartial: string;
  visitDate: string;
  commissionSplit: string;
  commissionModel?: string;
  externalReferrerName?: string;
  externalReferrerCreci?: string;
  externalReferrerWhatsapp?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (data.partnerBrokerId !== actor.id) throw new Error("O corretor parceiro deve ser o usuário conectado.");
  const [property] = await db.select({ brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, title: properties.title, status: properties.status, verificationStatus: users.verificationStatus })
    .from(properties).innerJoin(users, eq(properties.brokerId, users.id)).where(eq(properties.id, data.propertyId)).limit(1);
  if (!property || property.brokerId !== data.captorBrokerId || property.brokerId === actor.id || !canUseProperty(property, actor.id)) {
    throw new Error("Imóvel ou parceria inválidos para este registro.");
  }
  const [lead] = data.leadId
    ? await db.select({ id: leads.id, fullName: leads.fullName, phone: leads.phone, leadType: leads.leadType, stage: leads.stage }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.ownerUserId, actor.id))).limit(1)
    : [];
  if (data.leadId && !lead) throw new Error("Lead não encontrado na sua carteira.");
  if (lead && !["comprador", "locatario"].includes(lead.leadType)) throw new Error("Só é possível vincular uma visita a um lead comprador ou locatário.");
  const clientName = lead?.fullName || data.clientName.trim();
  const clientPhone = lead?.phone || data.clientPhone || null;
  if (clientName.length < 2 || !/^\*{3}\.\d{3}\.\d{3}-\*\*$/.test(data.clientCpfPartial.trim())) {
    throw new Error("Informe o nome do cliente e apenas o CPF parcialmente mascarado.");
  }
  if (data.commissionModel && !["two_party_50_50", "three_party_referral_40_40_20"].includes(data.commissionModel)) {
    throw new Error("Escolha uma divisão de comissão válida.");
  }
  const commissionModel = data.commissionModel === "three_party_referral_40_40_20" ? data.commissionModel : "two_party_50_50";
  const externalReferrerName = data.externalReferrerName?.trim() || null;
  const externalReferrerCreci = data.externalReferrerCreci?.trim().toUpperCase() || null;
  const externalReferrerWhatsapp = data.externalReferrerWhatsapp?.trim() || null;
  if (commissionModel === "three_party_referral_40_40_20") {
    if (!externalReferrerName || externalReferrerName.length < 2 || externalReferrerName.length > 120) {
      throw new Error("Informe o nome do corretor indicador externo.");
    }
    if (!externalReferrerCreci || externalReferrerCreci.length < 2 || externalReferrerCreci.length > 30) {
      throw new Error("Informe o CRECI do corretor indicador externo.");
    }
    if (externalReferrerWhatsapp && externalReferrerWhatsapp.length > 30) {
      throw new Error("O WhatsApp do corretor indicador está inválido.");
    }
  }
  const captorCommissionPercent = commissionModel === "three_party_referral_40_40_20" ? "40.00" : "50.00";
  const partnerCommissionPercent = captorCommissionPercent;
  const referrerCommissionPercent = commissionModel === "three_party_referral_40_40_20" ? "20.00" : "0.00";
  const rawHashString = `${data.propertyId}-${data.captorBrokerId}-${data.partnerBrokerId}-${data.leadId || ""}-${clientName}-${data.clientCpfPartial}-${Date.now()}`;
  const certificateHash = crypto
    .createHash("sha256")
    .update(rawHashString)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const visitDate = new Date(data.visitDate);
  if (!Number.isFinite(visitDate.getTime())) throw new Error("Informe uma data de visita válida.");
  const lockExpirationDate = new Date(visitDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    const [certificate] = await tx.insert(dvpCertificates).values({
      certificateHash: `DVP-${certificateHash}`,
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      leadId: lead?.id || null,
      clientName,
      clientPhone,
      clientCpfPartial: data.clientCpfPartial.trim(),
      visitDate,
      lockExpirationDate,
      commissionModel,
      commissionSplit: captorCommissionPercent,
      captorCommissionPercent,
      partnerCommissionPercent,
      referrerCommissionPercent,
      externalReferrerName,
      externalReferrerCreci,
      externalReferrerWhatsapp,
      status: "rascunho",
      legalClausesAccepted: false,
    }).returning();

    const [partnership] = await tx.insert(partnerships).values({
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      status: "visita_agendada",
      commissionStatus: "aguardando_aceites",
      commissionRevision: 1,
      commissionModel,
      commissionSplit: captorCommissionPercent,
      captorCommissionPercent,
      partnerCommissionPercent,
      referrerCommissionPercent,
      externalReferrerName,
      externalReferrerCreci,
      externalReferrerWhatsapp,
      visitScheduledDate: visitDate,
      notes: `Registro interno de visita ${certificate.certificateHash}. Requer validação e aceite das partes antes de qualquer efeito contratual.`,
    }).returning();
    const [partnershipActivity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: null,
      newStatus: "visita_agendada",
      note: `Visita registrada para ${visitDate.toLocaleString("pt-BR")}. DVP em rascunho, sem aceite eletrônico.`,
    }).returning();

    await tx.insert(notifications).values({
      userId: data.captorBrokerId,
      title: "Novo registro de visita em rascunho",
      message: commissionModel === "three_party_referral_40_40_20"
        ? `Foi criado o registro ${certificate.certificateHash} para ${property.title}. Confira a divisão 40/40/20 e responda na tela de acompanhamento.`
        : `Foi criado o registro ${certificate.certificateHash} para ${property.title}. O rascunho ainda não tem assinatura eletrônica.`,
      type: "dvp",
      propertyId: data.propertyId,
      read: false,
    });

    let activity = null;
    if (lead) {
      const [createdActivity] = await tx.insert(leadActivities).values({
        leadId: lead.id,
        userId: actor.id,
        activityType: "visita",
        description: `Registro de visita ${certificate.certificateHash} criado para ${property.title}. O DVP ainda aguarda validação e aceite das partes.`,
      }).returning();
      activity = createdActivity;
      const [updatedLead] = await tx.update(leads).set({
        ...(["novo", "contato", "qualificado"].includes(lead.stage) ? { stage: "visita" } : {}),
        lastContactAt: new Date(),
        nextAction: "Confirmar visita e aceite do DVP",
        nextActionAt: visitDate,
        updatedAt: new Date(),
      }).where(and(eq(leads.id, lead.id), eq(leads.ownerUserId, actor.id))).returning({ stage: leads.stage, nextAction: leads.nextAction, nextActionAt: leads.nextActionAt, lastContactAt: leads.lastContactAt, updatedAt: leads.updatedAt });
      return { certificate, activity, lead: updatedLead, partnership, partnershipActivity };
    }

    return { certificate, activity, lead: null, partnership, partnershipActivity };
  });

  revalidatePath("/");
  return { success: true, ...result };
}

const PARTNERSHIP_TRANSITIONS: Record<string, string[]> = {
  proposta: ["visita_agendada", "recusado"],
  visita_agendada: ["em_negociacao", "recusado"],
  em_negociacao: ["fechado", "recusado"],
  fechado: [],
  recusado: [],
};

export async function updatePartnershipStatus(partnershipId: string, newStatus: string, note?: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > 500) throw new Error("A observação deve ter até 500 caracteres.");
  if (!Object.values(PARTNERSHIP_TRANSITIONS).some((statuses) => statuses.includes(newStatus))) throw new Error("Etapa de parceria inválida.");

  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
      commissionStatus: partnerships.commissionStatus,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new Error("Parceria não encontrada na sua carteira.");
    if (!PARTNERSHIP_TRANSITIONS[partnership.status]?.includes(newStatus)) throw new Error("Esta mudança de etapa não é permitida.");
    if (["em_negociacao", "fechado"].includes(newStatus) && partnership.commissionStatus === "aguardando_aceites") {
      throw new Error("Os dois corretores precisam confirmar a divisão antes de avançar esta parceria.");
    }
    if (["em_negociacao", "fechado"].includes(newStatus) && partnership.commissionStatus === "recusada") {
      throw new Error("A divisão foi recusada. Revise a proposta e obtenha as duas confirmações antes de avançar.");
    }

    const [updated] = await tx.update(partnerships).set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(partnerships.id, partnership.id), eq(partnerships.status, partnership.status))).returning();
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus,
      note: cleanNote,
    }).returning();
    await tx.insert(notifications).values({
      userId: actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId,
      title: "Parceria atualizada",
      message: `A etapa da parceria foi alterada para ${newStatus.replaceAll("_", " ")}.${cleanNote ? ` Observação: ${cleanNote}` : ""} Esta atualização é operacional e não representa aceite contratual.`,
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function respondToPartnershipSplit(partnershipId: string, accepted: boolean) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
      commissionModel: partnerships.commissionModel,
      commissionStatus: partnerships.commissionStatus,
      captorAcceptedAt: partnerships.captorAcceptedAt,
      partnerAcceptedAt: partnerships.partnerAcceptedAt,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new Error("Parceria não encontrada na sua carteira.");
    if (partnership.commissionStatus === "nao_registrada") throw new Error("Esta parceria antiga ainda não tem proposta de divisão para confirmar.");
    if (["recusado", "fechado"].includes(partnership.status)) throw new Error("Esta parceria já foi encerrada.");
    if (partnership.commissionStatus === "recusada") throw new Error("Esta proposta foi recusada. Revise os termos para criar uma nova versão.");
    const acceptedAt = actor.id === partnership.captorBrokerId ? partnership.captorAcceptedAt : partnership.partnerAcceptedAt;
    if (accepted && acceptedAt) return { partnership, activity: null, alreadyAccepted: true };
    if (!accepted && acceptedAt) throw new Error("Sua confirmação já foi registrada e não pode ser retirada nesta tela.");

    const now = new Date();
    const otherAcceptedAt = actor.id === partnership.captorBrokerId ? partnership.partnerAcceptedAt : partnership.captorAcceptedAt;
    const bothAccepted = accepted && Boolean(otherAcceptedAt);
    const [updated] = await tx.update(partnerships).set({
      ...(accepted ? {
        ...(actor.id === partnership.captorBrokerId ? { captorAcceptedAt: now } : { partnerAcceptedAt: now }),
        commissionStatus: bothAccepted ? "confirmada" : "aguardando_aceites",
      } : { commissionStatus: "recusada" }),
      updatedAt: now,
    }).where(eq(partnerships.id, partnership.id)).returning();
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus: accepted ? bothAccepted ? "divisao_confirmada_ambos" : "divisao_confirmada_um" : "divisao_recusada",
      note: accepted
        ? `Confirmou a divisão ${partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50"}${bothAccepted ? "; os dois corretores confirmaram" : ""}. Confirmação interna, não é assinatura eletrônica.`
        : `Recusou a divisão ${partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50"}.`,
    }).returning();
    const otherBrokerId = actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId;
    await tx.insert(notifications).values({
      userId: otherBrokerId,
      title: accepted ? "Confirmação da divisão de parceria" : "Divisão de parceria recusada",
      message: accepted
        ? `Um corretor confirmou a proposta ${partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50"}${bothAccepted ? ". Os dois já confirmaram" : ". Falta a confirmação do outro corretor"}. Esta confirmação interna não é assinatura eletrônica.`
        : `Um corretor recusou a divisão ${partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50"}. A parceria pode receber uma nova versão da proposta.`,
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity, alreadyAccepted: false };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function revisePartnershipCommission(partnershipId: string, input: {
  commissionModel: string;
  externalReferrerName?: string;
  externalReferrerCreci?: string;
  externalReferrerWhatsapp?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!["two_party_50_50", "three_party_referral_40_40_20"].includes(input.commissionModel)) throw new Error("Escolha uma divisão válida.");
  const commissionModel = input.commissionModel;
  const externalReferrerName = input.externalReferrerName?.trim() || null;
  const externalReferrerCreci = input.externalReferrerCreci?.trim().toUpperCase() || null;
  const externalReferrerWhatsapp = input.externalReferrerWhatsapp?.trim() || null;
  if (commissionModel === "three_party_referral_40_40_20") {
    if (!externalReferrerName || externalReferrerName.length < 2 || externalReferrerName.length > 120) throw new Error("Informe o nome do indicador externo.");
    if (!externalReferrerCreci || externalReferrerCreci.length < 2 || externalReferrerCreci.length > 30) throw new Error("Informe o CRECI do indicador externo.");
    if (externalReferrerWhatsapp && externalReferrerWhatsapp.length > 30) throw new Error("O WhatsApp do indicador está inválido.");
  }
  const isReferral = commissionModel === "three_party_referral_40_40_20";
  const captorCommissionPercent = isReferral ? "40.00" : "50.00";
  const partnerCommissionPercent = captorCommissionPercent;
  const referrerCommissionPercent = isReferral ? "20.00" : "0.00";
  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
      commissionModel: partnerships.commissionModel,
      commissionStatus: partnerships.commissionStatus,
      commissionRevision: partnerships.commissionRevision,
      captorCommissionPercent: partnerships.captorCommissionPercent,
      partnerCommissionPercent: partnerships.partnerCommissionPercent,
      referrerCommissionPercent: partnerships.referrerCommissionPercent,
      externalReferrerName: partnerships.externalReferrerName,
      externalReferrerCreci: partnerships.externalReferrerCreci,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new Error("Parceria não encontrada na sua carteira.");
    if (["fechado", "recusado"].includes(partnership.status)) throw new Error("Não é possível revisar uma parceria encerrada.");
    const describe = (model: string, captor: string, partner: string, referrer: string, name: string | null, creci: string | null) =>
      model === "three_party_referral_40_40_20" ? `40/40/20 (indicador: ${name || "sem nome"}, CRECI ${creci || "não informado"})` : `${captor}/${partner}`;
    const previousTerms = describe(partnership.commissionModel, partnership.captorCommissionPercent, partnership.partnerCommissionPercent, partnership.referrerCommissionPercent, partnership.externalReferrerName, partnership.externalReferrerCreci);
    const nextRevision = partnership.commissionRevision + 1;
    const nextTerms = describe(commissionModel, captorCommissionPercent, partnerCommissionPercent, referrerCommissionPercent, externalReferrerName, externalReferrerCreci);
    const [updated] = await tx.update(partnerships).set({
      commissionModel,
      commissionStatus: "aguardando_aceites",
      commissionRevision: nextRevision,
      commissionSplit: captorCommissionPercent,
      captorCommissionPercent,
      partnerCommissionPercent,
      referrerCommissionPercent,
      externalReferrerName,
      externalReferrerCreci,
      externalReferrerWhatsapp: isReferral ? externalReferrerWhatsapp : null,
      captorAcceptedAt: null,
      partnerAcceptedAt: null,
      updatedAt: new Date(),
    }).where(eq(partnerships.id, partnership.id)).returning();
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus: "divisao_revisada",
      note: `Proposta revisada para a versão ${nextRevision}: ${previousTerms} → ${nextTerms}. As confirmações anteriores foram zeradas; os dois corretores precisam responder novamente.`,
    }).returning();
    const otherBrokerId = actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId;
    await tx.insert(notifications).values({
      userId: otherBrokerId,
      title: "Nova versão da divisão da parceria",
      message: `A divisão foi revisada para a versão ${nextRevision} (${nextTerms}). Confira e confirme ou recuse a nova proposta.`,
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function markNotificationAsRead(notificationId: string) {
  const actor = await requireCurrentUser();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.id)));

  revalidatePath("/");
  return { success: true };
}

export async function submitPilotFeedback(input: { screen: string; category: string; message: string }) {
  const actor = await requireCurrentUser();
  const screen = input.screen.trim();
  const category = input.category.trim();
  const message = input.message.trim();
  if (!["vitrine", "crm", "radar", "cadastrar", "termo", "dvp", "admin"].includes(screen)) throw new Error("Selecione uma tela válida.");
  if (!["duvida", "erro", "ideia"].includes(category)) throw new Error("Selecione um tipo de feedback válido.");
  if (message.length < 10 || message.length > 2000) throw new Error("Escreva de 10 a 2.000 caracteres.");
  const [feedback] = await db.insert(pilotFeedback).values({ userId: actor.id, screen, category, message }).returning({ id: pilotFeedback.id, createdAt: pilotFeedback.createdAt });
  revalidatePath("/");
  return { success: true, feedback };
}

export async function updatePilotFeedbackStatus(feedbackId: string, status: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new Error("Apenas administradores podem atualizar o feedback do piloto.");
  if (!["novo", "em_analise", "concluido"].includes(status)) throw new Error("Status de feedback inválido.");
  const [updated] = await db.update(pilotFeedback).set({
    status,
    reviewedAt: status === "novo" ? null : new Date(),
    reviewedBy: status === "novo" ? null : actor.id,
  }).where(eq(pilotFeedback.id, feedbackId)).returning({ id: pilotFeedback.id, status: pilotFeedback.status, reviewedAt: pilotFeedback.reviewedAt });
  if (!updated) throw new Error("Feedback não encontrado.");
  revalidatePath("/");
  return { success: true, feedback: updated };
}

export async function validateCreciWithAI(creci: string, state: string, _name?: string) {
  const cleanCreci = creci.trim().toUpperCase();
  const creciRegex = /^[0-9]{3,7}-?[FJ]?$/i;

  if (!creciRegex.test(cleanCreci)) {
    return {
      isValid: false,
      message: "Formato de CRECI inválido. Utilize o número seguido de -F (físico) ou -J (jurídico).",
    };
  }

  const isJuridica = cleanCreci.endsWith("J");

  return {
    isValid: true,
    status: "PENDENTE DE VERIFICAÇÃO",
    council: `CRECI-${state.toUpperCase()}`,
    type: isJuridica ? "Pessoa Jurídica (Imobiliária)" : "Pessoa Física (Corretor Autônomo)",
    message: "O formato parece válido. A situação do registro ainda precisa ser conferida no conselho; seu cadastro ficará pendente até lá.",
  };
}

export async function registerUserWithPix(userData: {
  name: string;
  email: string;
  whatsapp: string;
  creci: string;
  state: string;
  city: string;
  plan: string;
  billingCycle: "monthly" | "annual";
  password: string;
  referralCode?: string;
}) {
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanCreci = userData.creci.trim().toUpperCase();
  const prices: Record<string, { monthly: string; annual: string; annualTotal: string }> = {
    "10": { monthly: "59.90", annual: "54.91", annualTotal: "658.90" },
    "20": { monthly: "89.90", annual: "82.41", annualTotal: "988.90" },
    "40": { monthly: "150.00", annual: "137.50", annualTotal: "1650.00" },
  };
  const selectedPlan = prices[userData.plan];
  if (!selectedPlan) throw new Error("Plano inválido.");
  if (!['monthly', 'annual'].includes(userData.billingCycle)) throw new Error("Ciclo de cobrança inválido.");
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("E-mail inválido.");
  if (userData.name.trim().length < 2 || userData.name.length > 120 || userData.city.trim().length < 2 || userData.city.length > 120 || !/^[A-Z]{2}$/.test(userData.state.toUpperCase())) throw new Error("Confira nome, cidade e estado.");
  const phoneDigits = userData.whatsapp.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15 || userData.whatsapp.length > 30) throw new Error("WhatsApp inválido.");
  if (!/^[0-9]{3,7}-?[FJ]?$/.test(cleanCreci)) throw new Error("Informe um CRECI no formato numérico aceito.");
  const monthlyFee = selectedPlan[userData.billingCycle];
  const referralCode = userData.referralCode?.trim() || null;
  if (referralCode && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referralCode)) throw new Error("Código de indicação inválido.");
  const [referrer] = referralCode ? await db.select({ id: users.id, email: users.email, verificationStatus: users.verificationStatus }).from(users).where(eq(users.id, referralCode)).limit(1) : [];
  if (referralCode && (!referrer || referrer.verificationStatus === "suspenso" || referrer.email === cleanEmail)) throw new Error("Código de indicação indisponível.");
  await limitRegistrationAttempts();
  const passwordHash = await hashPassword(userData.password);

  const newUser = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
      name: userData.name,
      email: cleanEmail,
      whatsapp: userData.whatsapp,
      creci: cleanCreci,
      state: userData.state.toUpperCase(),
      city: userData.city,
      passwordHash,
      role: "corretor",
      isVerified: false,
      verificationStatus: "pendente",
      plan: userData.plan,
      subscriptionStatus: "teste",
      nextBillingDate: addFreeDays(new Date()),
      billingCycle: userData.billingCycle,
      referredBy: referrer?.id || null,
      monthlyFee,
      trustScore: 0,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    }).returning();

    await tx.insert(notifications).values({
      userId: created.id,
      title: "🎉 Bem-vindo ao Negocia Lar!",
      message: "Você tem 30 dias grátis a partir do cadastro, sem pagamento inicial. O uso da rede depende da aprovação do CRECI. Ao terminar, renove seu plano via Pix.",
      type: "sistema",
      read: false,
    });
    return created;
  });

  // Salva a sessão do corretor
  await setBrokerSession(newUser.id);

  revalidatePath("/");
  const { passwordHash: _passwordHash, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

async function reserveLoginAttempt(email: string, address: string) {
  const buckets = [
    { key: `login-account:${email}`, limit: 8, clearOnSuccess: true },
    { key: `login-pair:${email}:${address}`, limit: 5, clearOnSuccess: true },
    { key: `login-address:${address}`, limit: address === "unknown" ? 100 : 50, clearOnSuccess: false },
  ];
  const successfulLoginKeys: string[] = [];
  for (const bucket of buckets) {
    const keyHash = crypto.createHash("sha256").update(bucket.key).digest("hex");
    // Reserve before hashing: concurrent requests cannot all pass an old counter.
    const [counter] = await db.insert(authLoginAttempts).values({keyHash, attempts: 1, updatedAt: new Date()}).onConflictDoUpdate({
      target: authLoginAttempts.keyHash,
      set: {
        attempts: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.attempts} when ${authLoginAttempts.updatedAt} < now() - interval '15 minutes' then 1 else ${authLoginAttempts.attempts} + 1 end`,
        blockedUntil: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.blockedUntil} when ${authLoginAttempts.updatedAt} < now() - interval '15 minutes' then null when ${authLoginAttempts.attempts} + 1 > ${bucket.limit} then now() + interval '15 minutes' else null end`,
        updatedAt: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.updatedAt} else now() end`,
      },
    }).returning({blockedUntil:authLoginAttempts.blockedUntil});
    if (counter.blockedUntil && counter.blockedUntil.getTime() > Date.now()) throw new Error("Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.");
    if (bucket.clearOnSuccess) successfulLoginKeys.push(keyHash);
  }
  return successfulLoginKeys;
}

export async function loginUser(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length > 254 || password.length > 200) throw new Error("E-mail ou senha incorretos.");
  const loginKeys = await reserveLoginAttempt(cleanEmail, await requestAddress());
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !passwordMatches) throw new Error("E-mail ou senha incorretos.");
  if (user.verificationStatus === "suspenso") throw new Error("Esta conta está suspensa.");
  await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, loginKeys));
  await setBrokerSession(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  revalidatePath("/");
  return { success: true, user: safeUser };
}

export async function logoutUser() {
  const userId = await getCurrentUserId();
  if (userId) await db.update(users).set({sessionVersion:sql`${users.sessionVersion} + 1`}).where(eq(users.id, userId));
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  revalidatePath("/");
  return { success: true };
}


export async function getMySubscription() {
  const actor = await requireCurrentUser();
  const [user] = await db.select({ id: users.id, plan: users.plan, status: users.subscriptionStatus, expiresAt: users.nextBillingDate, billingCycle: users.billingCycle }).from(users).where(eq(users.id, actor.id)).limit(1);
  const payments = await db.select({ id: transactions.id, amount: transactions.amount, status: transactions.status, type: transactions.type, paymentMethod: transactions.paymentMethod, description: transactions.description, createdAt: transactions.createdAt }).from(transactions).where(eq(transactions.userId, actor.id)).orderBy(desc(transactions.createdAt));
  return { user, payments };
}

export async function requestSubscriptionRenewal() {
  const actor = await requireCurrentUser();
  const payment = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, actor.id)).for("update").limit(1);
    const prices: Record<string, { monthly: string; annual: string }> = { "10": { monthly: "59.90", annual: "658.90" }, "20": { monthly: "89.90", annual: "988.90" }, "40": { monthly: "150.00", annual: "1650.00" } };
    if (!user || !prices[user.plan]) throw new Error("Consulte a equipe para renovar este plano.");
    const [existing] = await tx.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.userId, actor.id), eq(transactions.status, "pendente"), eq(transactions.paymentMethod, "pix"), eq(transactions.type, "mensalidade_pro"))).limit(1);
    if (existing) return existing;
    const [created] = await tx.insert(transactions).values({ userId: actor.id, amount: prices[user.plan][user.billingCycle === "annual" ? "annual" : "monthly"], type: "mensalidade_pro", paymentMethod: "pix", status: "pendente", description: `Renovação do plano ${user.plan} (${user.billingCycle}) — confirmação manual` }).returning({ id: transactions.id });
    return created;
  });
  revalidatePath("/");
  return { success: true, payment };
}


export async function getBrokerAssistantStatus() {
  await requireCurrentUser();
  return { enabled: !!process.env.GEMINI_API_KEY };
}

export async function askBrokerAssistant(input: BrokerAssistantInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const cleaned = validateBrokerAssistantInput(input);
  if (!process.env.GEMINI_API_KEY) throw new Error("O Bartolomeu aguarda a configuração da IA pela equipe.");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const keyHash = crypto.createHash("sha256").update(`broker-assistant:${actor.id}:${day}`).digest("hex");
  const [counter] = await db.insert(authLoginAttempts).values({ keyHash, attempts: 1, updatedAt: new Date() }).onConflictDoUpdate({ target: authLoginAttempts.keyHash, set: { attempts: sql`${authLoginAttempts.attempts} + 1`, updatedAt: new Date() } }).returning({ attempts: authLoginAttempts.attempts });
  if (counter.attempts > 60) throw new Error("Você atingiu as 60 perguntas de hoje. Seu acesso ao CRM continua normal; novas perguntas serão liberadas amanhã.");
  const rows = await db.select({ stage: leads.stage, total: sql<number>`count(*)::int` }).from(leads).where(eq(leads.ownerUserId, actor.id)).groupBy(leads.stage);
  const summary = JSON.stringify(rows);
  return generateBrokerAnswer(cleaned, summary);
}

export async function saveNegotiationDocuments(leadId: string, input: NegotiationDocuments) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const data = validateNegotiationDocuments(input);
  const [owned] = await db.select({id: leads.id}).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!owned) throw new Error("Cliente não encontrado na sua carteira.");
  if (data.propertyId) {
    const [property] = await db.select({title: properties.title, city: properties.city, brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, status: properties.status, verificationStatus: users.verificationStatus})
      .from(properties).innerJoin(users, eq(properties.brokerId, users.id)).where(eq(properties.id, data.propertyId)).limit(1);
    if (!property || !canUseProperty(property, actor.id)) throw new Error("Imóvel não disponível para esta negociação.");
    data.propertyTitle = property.title; data.city = data.city.trim();
  }
  const [saved] = await db.update(leads).set({documentation: data, updatedAt: new Date()}).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning({documentation: leads.documentation});
  revalidatePath("/");
  return {documentation: saved.documentation!};
}

export async function saveMyDocumentationTemplate(input: NegotiationDocuments) {
  const actor = await requireCurrentUser(); requireActiveBroker(actor);
  const data = validateNegotiationDocuments(input);
  const template = {...data, propertyId: null, propertyTitle: "", statuses: {}};
  await db.update(users).set({documentationTemplate: template}).where(eq(users.id, actor.id));
  return {success:true};
}
export async function getMyDocumentationTemplate() {
  const actor = await requireCurrentUser(); requireActiveBroker(actor);
  const [row] = await db.select({template: users.documentationTemplate}).from(users).where(eq(users.id, actor.id)).limit(1);
  return row?.template || null;
}
