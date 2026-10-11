"use server";

// Termo de Parceria com aceite eletrônico (pedido da corretora piloto, 11/10/2026; texto v1 aprovado pelo Sidney em 11/10).
// O termo sai da parceria com a divisão da comissão confirmada pelos dois corretores; cada um aceita o texto exato que leu
// (a tela manda a impressão sha-256 e o servidor confere contra o texto gerado agora). Os dois aceitaram o mesmo texto =
// termo assinado, e vale o texto gravado.

import crypto from "node:crypto";
import { headers } from "next/headers";
import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { ActionError, runAction } from "../action-result";
import { db, notifications, partnershipActivities, partnerships, partnershipTermAcceptances, properties, users } from "../db";
import { requestAddress, requireActiveBroker, requireCurrentUser } from "../auth";
import { codigoDaParceria, situacaoDoTermo, textoCanonico, textoDoTermo, VERSAO_DO_TERMO, type SituacaoDoTermo } from "../partnership-term";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const impressaoDe = (texto: string) => crypto.createHash("sha256").update(texto, "utf8").digest("hex");

const captor = alias(users, "term_captor");
const partner = alias(users, "term_partner");

type Executor = Pick<typeof db, "select">;

// Tudo o que o texto do termo usa, das parcerias em que quem pede é captador ou parceiro.
function parceriasDoCorretor(executor: Executor, actorId: string, filtro?: SQL) {
  return executor.select({
    id: partnerships.id, status: partnerships.status, commissionStatus: partnerships.commissionStatus,
    revisao: partnerships.commissionRevision, captorId: partnerships.captorBrokerId, partnerId: partnerships.partnerBrokerId,
    pctCaptador: partnerships.captorCommissionPercent, pctParceiro: partnerships.partnerCommissionPercent,
    pctIndicador: partnerships.referrerCommissionPercent,
    indicadorNome: partnerships.externalReferrerName, indicadorCreci: partnerships.externalReferrerCreci,
    imovelId: properties.id, imovelTitulo: properties.title, imovelTipo: properties.propertyType, finalidade: properties.purpose,
    bairro: properties.neighborhood, cidade: properties.city,
    captadorNome: captor.name, captadorCreci: captor.creci, captadorUf: captor.state,
    parceiroNome: partner.name, parceiroCreci: partner.creci, parceiroUf: partner.state,
  }).from(partnerships)
    .innerJoin(properties, eq(properties.id, partnerships.propertyId))
    .innerJoin(captor, eq(captor.id, partnerships.captorBrokerId))
    .innerJoin(partner, eq(partner.id, partnerships.partnerBrokerId))
    .where(and(or(eq(partnerships.captorBrokerId, actorId), eq(partnerships.partnerBrokerId, actorId)), filtro))
    .orderBy(desc(partnerships.updatedAt))
    .limit(100);
}

type LinhaDaParceria = Awaited<ReturnType<typeof parceriasDoCorretor>>[number];

// O termo de agora: só existe com a divisão confirmada pelos dois e a parceria não recusada.
function termoAtual(p: LinhaDaParceria) {
  if (p.commissionStatus !== "confirmada" || p.status === "recusado") return null;
  const texto = textoCanonico(textoDoTermo({
    parceriaId: p.id,
    revisao: p.revisao,
    imovel: { id: p.imovelId, titulo: p.imovelTitulo, tipo: p.imovelTipo, finalidade: p.finalidade, bairro: p.bairro, cidade: p.cidade, uf: null },
    captador: { nome: p.captadorNome, creci: p.captadorCreci, uf: p.captadorUf },
    parceiro: { nome: p.parceiroNome, creci: p.parceiroCreci, uf: p.parceiroUf },
    indicador: p.indicadorNome ? { nome: p.indicadorNome, creci: p.indicadorCreci } : null,
    percentuais: { captador: p.pctCaptador, parceiro: p.pctParceiro, indicador: p.pctIndicador },
  }));
  return { texto, impressao: impressaoDe(texto) };
}

async function aceitesDas(executor: Executor, ids: string[]) {
  if (!ids.length) return [];
  return executor.select({
    partnershipId: partnershipTermAcceptances.partnershipId, userId: partnershipTermAcceptances.userId,
    commissionRevision: partnershipTermAcceptances.commissionRevision, textHash: partnershipTermAcceptances.textHash,
    termText: partnershipTermAcceptances.termText, acceptedAt: partnershipTermAcceptances.acceptedAt, ip: partnershipTermAcceptances.ip,
  }).from(partnershipTermAcceptances).where(inArray(partnershipTermAcceptances.partnershipId, ids));
}

export type TermoDaParceria = {
  id: string; codigo: string; imovel: string; status: string; divisao: string; revisao: number;
  souCaptador: boolean; captador: string; parceiro: string;
  termo: SituacaoDoTermo | null; podeAceitar: boolean;
};

async function listMyPartnershipTermsImpl(): Promise<TermoDaParceria[]> {
  const actor = await requireCurrentUser();
  const linhas = await parceriasDoCorretor(db, actor.id);
  const aceites = await aceitesDas(db, linhas.map((p) => p.id));
  return linhas.map((p) => {
    const termo = situacaoDoTermo({
      captadorId: p.captorId, parceiroId: p.partnerId, revisao: p.revisao, atual: termoAtual(p),
      aceites: aceites.filter((a) => a.partnershipId === p.id),
    });
    const souCaptador = p.captorId === actor.id;
    const minhaParte = termo && (souCaptador ? termo.captador : termo.parceiro);
    return {
      id: p.id, codigo: codigoDaParceria(p.id), imovel: p.imovelTitulo, status: p.status, divisao: p.commissionStatus, revisao: p.revisao,
      souCaptador, captador: p.captadorNome, parceiro: p.parceiroNome, termo,
      podeAceitar: !!termo && !termo.assinado && minhaParte?.situacao !== "aceito",
    };
  });
}

async function acceptPartnershipTermImpl(partnershipId: string, impressao: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (typeof partnershipId !== "string" || !UUID.test(partnershipId)) throw new ActionError("Parceria não encontrada na sua carteira.");
  if (typeof impressao !== "string" || !/^[0-9a-f]{64}$/.test(impressao)) throw new ActionError("Recarregue a tela e leia o termo antes de aceitar.");
  const endereco = await requestAddress();
  const navegador = (await headers()).get("user-agent")?.slice(0, 400) || null;
  const resultado = await db.transaction(async (tx) => {
    // Trava a parceria: a revisão da divisão (e com ela o texto) não muda entre a conferência e a gravação do aceite.
    const [travada] = await tx.select({ id: partnerships.id }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!travada) throw new ActionError("Parceria não encontrada na sua carteira.");
    const [p] = await parceriasDoCorretor(tx, actor.id, eq(partnerships.id, partnershipId));
    if (p.status === "recusado") throw new ActionError("Esta parceria foi recusada; não há termo para aceitar.");
    const atual = termoAtual(p);
    if (!atual) throw new ActionError("O termo sai quando os dois corretores confirmam a divisão da comissão.");
    const situacao = situacaoDoTermo({ captadorId: p.captorId, parceiroId: p.partnerId, revisao: p.revisao, atual, aceites: await aceitesDas(tx, [p.id]) });
    if (situacao?.assinado) throw new ActionError("Os dois corretores já aceitaram este termo.");
    if (atual.impressao !== impressao) throw new ActionError("O termo mudou enquanto você lia (a divisão da comissão ou o cadastro do imóvel). Recarregue e leia de novo antes de aceitar.");
    const [gravado] = await tx.insert(partnershipTermAcceptances).values({
      partnershipId: p.id, userId: actor.id, termVersion: VERSAO_DO_TERMO, commissionRevision: p.revisao,
      textHash: atual.impressao, termText: atual.texto, ip: endereco === "unknown" ? null : endereco, userAgent: navegador,
    }).onConflictDoNothing().returning({ id: partnershipTermAcceptances.id });
    if (!gravado) return { jaAceito: true, assinado: false };
    const souCaptador = p.captorId === actor.id;
    const outroAceitou = (souCaptador ? situacao?.parceiro : situacao?.captador)?.situacao === "aceito";
    await tx.insert(partnershipActivities).values({
      partnershipId: p.id, actorUserId: actor.id, previousStatus: p.status,
      newStatus: outroAceitou ? "termo_aceito_ambos" : "termo_aceito",
      note: `Aceitou o Termo de Parceria (versão ${VERSAO_DO_TERMO}, divisão revisão ${p.revisao}, impressão ${atual.impressao.slice(0, 12)}…)${outroAceitou ? "; os dois corretores aceitaram — termo assinado" : ""}.`,
    });
    await tx.insert(notifications).values({
      userId: souCaptador ? p.partnerId : p.captorId,
      title: outroAceitou ? "Termo de Parceria assinado" : "Termo de Parceria aceito pelo outro corretor",
      message: outroAceitou
        ? `Os dois corretores aceitaram o Termo de Parceria de "${p.imovelTitulo}". O termo assinado está em Documentos › Termo de Parceria.`
        : `${souCaptador ? p.captadorNome : p.parceiroNome} aceitou o Termo de Parceria de "${p.imovelTitulo}". Falta o seu aceite em Documentos › Termo de Parceria.`,
      type: "parceria",
      propertyId: p.imovelId,
      read: false,
    });
    return { jaAceito: false, assinado: outroAceitou };
  });
  revalidatePath("/");
  return resultado;
}

export async function listMyPartnershipTerms(...args: Parameters<typeof listMyPartnershipTermsImpl>) { return runAction(() => listMyPartnershipTermsImpl(...args)); }
export async function acceptPartnershipTerm(...args: Parameters<typeof acceptPartnershipTermImpl>) { return runAction(() => acceptPartnershipTermImpl(...args)); }
