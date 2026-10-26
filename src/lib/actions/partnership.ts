// Etapas da parceria, resposta à divisão e revisão da comissão. Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, partnerships, partnershipActivities, properties, notifications, brokerFinanceEntries } from "../db";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { conferirDivisao } from "../partnership-models";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { commissionShare, toCents, validatePartnershipClosing } from "../finance";

const PARTNERSHIP_TRANSITIONS: Record<string, string[]> = {
  proposta: ["visita_agendada", "recusado"],
  visita_agendada: ["em_negociacao", "recusado"],
  em_negociacao: ["fechado", "recusado"],
  fechado: [],
  recusado: [],
};

export async function updatePartnershipStatusImpl(partnershipId: string, newStatus: string, note?: string, closing?: { commissionTotal: string; expectedDate: string }) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > 500) throw new ActionError("A observação deve ter até 500 caracteres.");
  if (!Object.values(PARTNERSHIP_TRANSITIONS).some((statuses) => statuses.includes(newStatus))) throw new ActionError("Etapa de parceria inválida.");
  // Fechar exige o valor total da comissão e a data prevista: geram a previsão "a receber" de cada corretor.
  const close = newStatus === "fechado" ? validatePartnershipClosing(closing) : null;

  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
      commissionStatus: partnerships.commissionStatus,
      captorCommissionPercent: partnerships.captorCommissionPercent,
      partnerCommissionPercent: partnerships.partnerCommissionPercent,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new ActionError("Parceria não encontrada na sua carteira.");
    if (!PARTNERSHIP_TRANSITIONS[partnership.status]?.includes(newStatus)) throw new ActionError("Esta mudança de etapa não é permitida.");
    if (["em_negociacao", "fechado"].includes(newStatus) && partnership.commissionStatus === "aguardando_aceites") {
      throw new ActionError("Os dois corretores precisam confirmar a divisão antes de avançar esta parceria.");
    }
    if (["em_negociacao", "fechado"].includes(newStatus) && partnership.commissionStatus === "recusada") {
      throw new ActionError("A divisão foi recusada. Revise a proposta e obtenha as duas confirmações antes de avançar.");
    }

    const [updated] = await tx.update(partnerships).set({
      status: newStatus, updatedAt: new Date(),
      ...(close ? { commissionTotal: close.commissionTotal, commissionExpectedDate: close.expectedDate } : {}),
    }).where(and(eq(partnerships.id, partnership.id), eq(partnerships.status, partnership.status))).returning();
    if (!updated) throw new ActionError("A parceria foi atualizada por outra pessoa. Recarregue a tela.");
    // Previsão no Financeiro de cada corretor: a parte dele pelo percentual combinado (indicador externo não tem conta).
    const forecast = new Map<string, number>();
    if (close) {
      const [property] = await tx.select({ title: properties.title }).from(properties).where(eq(properties.id, partnership.propertyId)).limit(1);
      const totalCents = toCents(close.commissionTotal);
      const shares = [
        { userId: partnership.captorBrokerId, percent: partnership.captorCommissionPercent },
        { userId: partnership.partnerBrokerId, percent: partnership.partnerCommissionPercent },
      ].map((share) => ({ ...share, cents: commissionShare(totalCents, share.percent) })).filter((share) => share.cents > 0);
      const day = close.expectedDate.split("-").reverse().join("/");
      const rows = shares.map((share) => ({
        ownerUserId: share.userId, kind: "receita", category: "comissao_parceria", amount: (share.cents / 100).toFixed(2),
        description: `Comissão da parceria — ${property?.title ?? "imóvel"}`.slice(0, 160),
        dueDate: close.expectedDate, partnershipId: partnership.id,
        notes: `Sua parte: ${Number(share.percent)}% de ${(totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, prevista para ${day}. Gerada ao fechar a parceria; ajuste se mudar.`,
      }));
      if (rows.length) await tx.insert(brokerFinanceEntries).values(rows).onConflictDoNothing();
      for (const share of shares) forecast.set(share.userId, share.cents);
    }
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus,
      note: cleanNote,
    }).returning();
    const otherBroker = actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId;
    const otherShare = forecast.get(otherBroker);
    await tx.insert(notifications).values({
      userId: otherBroker,
      title: close ? "Parceria fechada" : "Parceria atualizada",
      message: `A etapa da parceria foi alterada para ${newStatus.replaceAll("_", " ")}.${otherShare ? ` A sua parte, ${(otherShare / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, entrou no seu Financeiro como a receber em ${close!.expectedDate.split("-").reverse().join("/")}.` : ""}${cleanNote ? ` Observação: ${cleanNote}` : ""} Esta atualização é operacional e não representa aceite contratual.`,
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity, forecastCents: forecast.get(actor.id) ?? null };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function respondToPartnershipSplitImpl(partnershipId: string, accepted: boolean, expectedRevision: number) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new ActionError("Recarregue a tela para ver a versão atual da proposta.");
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
      captorAcceptedAt: partnerships.captorAcceptedAt,
      partnerAcceptedAt: partnerships.partnerAcceptedAt,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new ActionError("Parceria não encontrada na sua carteira.");
    // A proposta pode ter sido revisada pelo outro corretor depois que esta tela carregou.
    if (partnership.commissionRevision !== expectedRevision) throw new ActionError(`A proposta mudou para a versão ${partnership.commissionRevision} enquanto você olhava. Recarregue e confira antes de responder.`);
    if (partnership.commissionStatus === "nao_registrada") throw new ActionError("Esta parceria antiga ainda não tem proposta de divisão para confirmar.");
    if (["recusado", "fechado"].includes(partnership.status)) throw new ActionError("Esta parceria já foi encerrada.");
    if (partnership.commissionStatus === "recusada") throw new ActionError("Esta proposta foi recusada. Revise os termos para criar uma nova versão.");
    const acceptedAt = actor.id === partnership.captorBrokerId ? partnership.captorAcceptedAt : partnership.partnerAcceptedAt;
    if (accepted && acceptedAt) return { partnership, activity: null, alreadyAccepted: true };
    if (!accepted && acceptedAt) throw new ActionError("Sua confirmação já foi registrada e não pode ser retirada nesta tela.");

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

export async function revisePartnershipCommissionImpl(partnershipId: string, input: {
  commissionModel: string;
  externalReferrerName?: string;
  externalReferrerCreci?: string;
  externalReferrerWhatsapp?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!["two_party_50_50", "three_party_referral_40_40_20"].includes(input.commissionModel)) throw new ActionError("Escolha uma divisão válida.");
  const commissionModel = input.commissionModel;
  const externalReferrerName = input.externalReferrerName?.trim() || null;
  const externalReferrerCreci = input.externalReferrerCreci?.trim().toUpperCase() || null;
  const externalReferrerWhatsapp = input.externalReferrerWhatsapp?.trim() || null;
  if (commissionModel === "three_party_referral_40_40_20") {
    if (!externalReferrerName || externalReferrerName.length < 2 || externalReferrerName.length > 120) throw new ActionError("Informe o nome do indicador externo.");
    if (!externalReferrerCreci || externalReferrerCreci.length < 2 || externalReferrerCreci.length > 30) throw new ActionError("Informe o CRECI do indicador externo.");
    if (externalReferrerWhatsapp && externalReferrerWhatsapp.length > 30) throw new ActionError("O WhatsApp do indicador está inválido.");
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
    if (!partnership) throw new ActionError("Parceria não encontrada na sua carteira.");
    if (["fechado", "recusado"].includes(partnership.status)) throw new ActionError("Não é possível revisar uma parceria encerrada.");
    const [imovel] = await tx.select({ partnershipModels: properties.partnershipModels }).from(properties).where(eq(properties.id, partnership.propertyId)).limit(1);
    conferirDivisao(imovel?.partnershipModels, commissionModel); // a condição que o captador deu ao imóvel
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
