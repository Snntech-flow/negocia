// Registro de visita (DVP) e a parceria que nasce com ele. Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, properties, users, leads, leadActivities, partnerships, partnershipActivities, notifications, dvpCertificates } from "../db";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { conferirDivisao } from "../partnership-models";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { canUseProperty } from "../property-access";
import { normalizedSql, normalizeText } from "../text-match";

export async function createDvpCertificateImpl(data: {
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
  if (data.partnerBrokerId !== actor.id) throw new ActionError("O corretor parceiro deve ser o usuário conectado.");
  const [property] = await db.select({ brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, partnershipModels: properties.partnershipModels, title: properties.title, status: properties.status, verificationStatus: users.verificationStatus })
    .from(properties).innerJoin(users, eq(properties.brokerId, users.id)).where(eq(properties.id, data.propertyId)).limit(1);
  if (!property || property.brokerId !== data.captorBrokerId || property.brokerId === actor.id || !canUseProperty(property, actor.id)) {
    throw new ActionError("Imóvel ou parceria inválidos para este registro.");
  }
  const [lead] = data.leadId
    ? await db.select({ id: leads.id, fullName: leads.fullName, phone: leads.phone, leadType: leads.leadType, stage: leads.stage }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.ownerUserId, actor.id))).limit(1)
    : [];
  if (data.leadId && !lead) throw new ActionError("Lead não encontrado na sua carteira.");
  if (lead && !["comprador", "locatario"].includes(lead.leadType)) throw new ActionError("Só é possível vincular uma visita a um lead comprador ou locatário.");
  const clientName = lead?.fullName || data.clientName.trim();
  const clientPhone = lead?.phone || data.clientPhone || null;
  if (clientName.length < 2 || !/^\*{3}\.\d{3}\.\d{3}-\*\*$/.test(data.clientCpfPartial.trim())) {
    throw new ActionError("Informe o nome do cliente e apenas o CPF parcialmente mascarado.");
  }
  if (data.commissionModel && !["two_party_50_50", "three_party_referral_40_40_20"].includes(data.commissionModel)) {
    throw new ActionError("Escolha uma divisão de comissão válida.");
  }
  const commissionModel = data.commissionModel === "three_party_referral_40_40_20" ? data.commissionModel : "two_party_50_50";
  conferirDivisao(property.partnershipModels, commissionModel); // a condição que o captador deu ao imóvel
  const externalReferrerName = data.externalReferrerName?.trim() || null;
  const externalReferrerCreci = data.externalReferrerCreci?.trim().toUpperCase() || null;
  const externalReferrerWhatsapp = data.externalReferrerWhatsapp?.trim() || null;
  if (commissionModel === "three_party_referral_40_40_20") {
    if (!externalReferrerName || externalReferrerName.length < 2 || externalReferrerName.length > 120) {
      throw new ActionError("Informe o nome do corretor indicador externo.");
    }
    if (!externalReferrerCreci || externalReferrerCreci.length < 2 || externalReferrerCreci.length > 30) {
      throw new ActionError("Informe o CRECI do corretor indicador externo.");
    }
    if (externalReferrerWhatsapp && externalReferrerWhatsapp.length > 30) {
      throw new ActionError("O WhatsApp do corretor indicador está inválido.");
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

  // A tela manda o instante com fuso (toISOString); "2026-10-12T14:00" sem fuso seria lido como UTC no servidor.
  if (typeof data.visitDate !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(data.visitDate)) throw new ActionError("Informe uma data de visita válida.");
  const visitDate = new Date(data.visitDate);
  if (!Number.isFinite(visitDate.getTime())) throw new ActionError("Informe uma data de visita válida.");
  const day = 24 * 60 * 60 * 1000;
  if (visitDate.getTime() < Date.now() - 60 * day || visitDate.getTime() > Date.now() + 365 * day) {
    throw new ActionError("A data da visita deve estar entre os últimos 60 dias e os próximos 12 meses.");
  }
  const lockExpirationDate = new Date(visitDate.getTime() + 180 * day);
  const cpfPartial = data.clientCpfPartial.trim();

  const result = await db.transaction(async (tx) => {
    // Trava o imóvel: dois registros simultâneos do mesmo cliente não passam juntos.
    await tx.select({ id: properties.id }).from(properties).where(eq(properties.id, data.propertyId)).for("update");
    const [duplicate] = await tx.select({ certificateHash: dvpCertificates.certificateHash }).from(dvpCertificates).where(and(
      eq(dvpCertificates.propertyId, data.propertyId),
      eq(dvpCertificates.partnerBrokerId, actor.id),
      gte(dvpCertificates.createdAt, new Date(Date.now() - 180 * day)),
      lead ? eq(dvpCertificates.leadId, lead.id) : and(eq(normalizedSql(dvpCertificates.clientName), normalizeText(clientName)), eq(dvpCertificates.clientCpfPartial, cpfPartial)),
    )).limit(1);
    if (duplicate) throw new ActionError(`Este cliente já tem um registro de visita para este imóvel (${duplicate.certificateHash}). Acompanhe-o em Registro de Visita.`);
    const [certificate] = await tx.insert(dvpCertificates).values({
      certificateHash: `DVP-${certificateHash}`,
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      leadId: lead?.id || null,
      clientName,
      clientPhone,
      clientCpfPartial: cpfPartial,
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
      note: `Visita registrada para ${visitDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} (horário de Brasília). DVP em rascunho, sem aceite eletrônico.`,
    }).returning();

    await tx.insert(notifications).values({
      userId: data.captorBrokerId,
      title: "Novo registro de visita em rascunho",
      message: commissionModel === "three_party_referral_40_40_20"
        ? `Foi criado o registro ${certificate.certificateHash} para ${property.title}. Confira a divisão 40/40/20 e responda em Documentos › Registro de Visita, no quadro "Acompanhamento das parcerias" — clique aqui para abrir.`
        : `Foi criado o registro ${certificate.certificateHash} para ${property.title}. Acompanhe em Documentos › Registro de Visita — clique aqui para abrir. O rascunho ainda não tem assinatura eletrônica.`,
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
