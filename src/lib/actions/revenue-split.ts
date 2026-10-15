"use server";

import { ActionError, runAction } from "../action-result";

import { db, revenueSplitShares, revenueSplitVersions, users } from "../db";
import { asc, eq } from "drizzle-orm";
import { requireCurrentUser } from "../auth";
import { brasiliaToday, isMonth } from "../finance";
import { problemaNasPartes, type TipoDaParte } from "../repasses";

// Repasses dos sócios (15/10/2026): a administração e quem tem a visualização da Administração leem; só o administrador
// grava. As regras do banco (soma 100%, mês passado imutável, retroativo só antes da primeira versão) valem de novo aqui,
// com mensagem clara, antes de chegar a ele.
async function getRevenueSplitsImpl() {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin" && !actor.adminViewAccess) throw new ActionError("Ação restrita à administração.");
  const versoes = await db.select({ id: revenueSplitVersions.id, validFromMonth: revenueSplitVersions.validFromMonth, createdAt: revenueSplitVersions.createdAt, createdByName: users.name })
    .from(revenueSplitVersions).leftJoin(users, eq(users.id, revenueSplitVersions.createdBy)).orderBy(asc(revenueSplitVersions.validFromMonth));
  const partes = await db.select().from(revenueSplitShares).orderBy(asc(revenueSplitShares.position));
  return versoes.map((versao) => ({
    id: versao.id, validFromMonth: versao.validFromMonth.slice(0, 7), createdAt: versao.createdAt, createdByName: versao.createdByName,
    shares: partes.filter((parte) => parte.versionId === versao.id).map((parte) => ({ position: parte.position, name: parte.name, kind: parte.kind as TipoDaParte, percent: parte.percent })),
  }));
}

async function saveRevenueSplitImpl(validFromMonth: string, shares: { name: string; kind: string; percent: string }[]) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (!isMonth(validFromMonth)) throw new ActionError("Escolha o mês em que a regra começa.");
  if (!Array.isArray(shares)) throw new ActionError("Informe os participantes do repasse.");
  const partes = shares.map((parte, i) => ({ position: i + 1, name: String(parte?.name ?? "").trim(), kind: String(parte?.kind ?? ""), percent: String(parte?.percent ?? "").replace(",", ".") }));
  const problema = problemaNasPartes(partes);
  if (problema) throw new ActionError(problema);
  const mesAtual = brasiliaToday().slice(0, 7);
  return db.transaction(async (tx) => {
    const existentes = await tx.select({ id: revenueSplitVersions.id, validFromMonth: revenueSplitVersions.validFromMonth }).from(revenueSplitVersions);
    // Mês passado: só antes da primeira regra (preenche o começo sem trocar o % que já valia).
    if (validFromMonth < mesAtual && existentes.some((versao) => versao.validFromMonth.slice(0, 7) <= validFromMonth)) {
      throw new ActionError("Já há repasse definido para esse mês: a regra nova vale a partir do mês atual.");
    }
    const mesma = existentes.find((versao) => versao.validFromMonth.slice(0, 7) === validFromMonth);
    if (mesma) await tx.delete(revenueSplitVersions).where(eq(revenueSplitVersions.id, mesma.id));
    const [versao] = await tx.insert(revenueSplitVersions).values({ validFromMonth: `${validFromMonth}-01`, createdBy: actor.id }).returning();
    await tx.insert(revenueSplitShares).values(partes.map((parte) => ({ versionId: versao.id, position: parte.position, name: parte.name, kind: parte.kind, percent: Number(parte.percent).toFixed(2) })));
    return { id: versao.id, validFromMonth };
  });
}

export async function getRevenueSplits() { return runAction(() => getRevenueSplitsImpl()); }
export async function saveRevenueSplit(...args: Parameters<typeof saveRevenueSplitImpl>) { return runAction(() => saveRevenueSplitImpl(...args)); }
