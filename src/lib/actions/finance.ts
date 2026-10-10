"use server";

import { ActionError, runAction } from "../action-result";

import { db, brokerFinanceEntries, leads } from "../db";
import { and, asc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { addMonthsKeepingDay, brasiliaToday, chartStart, isIsoDate, previousPeriod, shiftMonth, validateFinanceEntryInput, validatePeriod, type FinanceEntryInput } from "../finance";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const entryColumns = {
  id: brokerFinanceEntries.id, kind: brokerFinanceEntries.kind, description: brokerFinanceEntries.description,
  category: brokerFinanceEntries.category, amount: brokerFinanceEntries.amount, dueDate: brokerFinanceEntries.dueDate,
  paidAt: brokerFinanceEntries.paidAt, leadId: brokerFinanceEntries.leadId, leadName: leads.fullName,
  notes: brokerFinanceEntries.notes, updatedAt: brokerFinanceEntries.updatedAt,
};

// O cliente vinculado precisa ser da carteira de quem lança.
async function assertOwnLead(ownerId: string, leadId: string | null) {
  if (!leadId) return;
  const [lead] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, ownerId))).limit(1);
  if (!lead) throw new ActionError("Cliente não encontrado na sua carteira.");
}

// Lançamentos do período (pela data prevista), totais por mês para o gráfico, totais do período anterior para
// comparar, clientes para vincular e o que está vencido em aberto em qualquer mês.
async function getFinancePeriodImpl(input: { from?: string; to?: string } = {}) {
  const actor = await requireCurrentUser();
  const today = brasiliaToday();
  const { from, to } = validatePeriod(input.from ?? today.slice(0, 7), input.to ?? input.from ?? today.slice(0, 7));
  const end = `${shiftMonth(to, 1)}-01`;
  const previous = previousPeriod(from, to);
  const own = eq(brokerFinanceEntries.ownerUserId, actor.id);
  const due = brokerFinanceEntries.dueDate;
  const [entries, clients, overdue, monthly, before] = await Promise.all([
    db.select(entryColumns).from(brokerFinanceEntries)
      .leftJoin(leads, and(eq(leads.id, brokerFinanceEntries.leadId), eq(leads.ownerUserId, actor.id)))
      .where(and(own, gte(due, `${from}-01`), lt(due, end)))
      .orderBy(asc(due), asc(brokerFinanceEntries.createdAt)).limit(3000),
    db.select({ id: leads.id, fullName: leads.fullName }).from(leads).where(eq(leads.ownerUserId, actor.id)).orderBy(asc(leads.fullName)).limit(500),
    db.select({ kind: brokerFinanceEntries.kind, count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${brokerFinanceEntries.amount}), 0)::text` })
      .from(brokerFinanceEntries).where(and(own, isNull(brokerFinanceEntries.paidAt), lt(due, today)))
      .groupBy(brokerFinanceEntries.kind),
    db.select({ month: sql<string>`to_char(${due}, 'YYYY-MM')`, kind: brokerFinanceEntries.kind,
      total: sql<string>`sum(${brokerFinanceEntries.amount})::text`,
      realized: sql<string>`coalesce(sum(${brokerFinanceEntries.amount}) filter (where ${brokerFinanceEntries.paidAt} is not null), 0)::text` })
      .from(brokerFinanceEntries).where(and(own, gte(due, `${chartStart(from, to)}-01`), lt(due, end)))
      .groupBy(sql`1`, brokerFinanceEntries.kind),
    db.select({ kind: brokerFinanceEntries.kind, total: sql<string>`sum(${brokerFinanceEntries.amount})::text` })
      .from(brokerFinanceEntries).where(and(own, gte(due, `${previous.from}-01`), lt(due, `${shiftMonth(previous.to, 1)}-01`)))
      .groupBy(brokerFinanceEntries.kind),
  ]);
  return { from, to, today, entries, clients, overdue, monthly, previous: { ...previous, totals: before } };
}

async function createFinanceEntryImpl(input: FinanceEntryInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const entry = validateFinanceEntryInput(input);
  await assertOwnLead(actor.id, entry.leadId);
  // Repetir: um lançamento por mês no mesmo dia (ou o último dia do mês curto); só o primeiro pode nascer pago.
  const rows = Array.from({ length: entry.repeatMonths }, (_, index) => ({
    ownerUserId: actor.id, kind: entry.kind, category: entry.category, amount: entry.amount, leadId: entry.leadId, notes: entry.notes,
    description: entry.repeatMonths > 1 ? `${entry.description} (${index + 1}/${entry.repeatMonths})` : entry.description,
    dueDate: addMonthsKeepingDay(entry.dueDate, index),
    paidAt: index === 0 ? entry.paidAt : null,
  }));
  const created = await db.insert(brokerFinanceEntries).values(rows).returning({ id: brokerFinanceEntries.id });
  revalidatePath("/");
  return { success: true, created: created.length };
}

async function updateFinanceEntryImpl(id: string, input: FinanceEntryInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!UUID.test(id)) throw new ActionError("Lançamento inválido.");
  const entry = validateFinanceEntryInput({ ...input, repeatMonths: 1 });
  await assertOwnLead(actor.id, entry.leadId);
  const [updated] = await db.update(brokerFinanceEntries)
    .set({ kind: entry.kind, description: entry.description, category: entry.category, amount: entry.amount, dueDate: entry.dueDate, paidAt: entry.paidAt, leadId: entry.leadId, notes: entry.notes, updatedAt: new Date() })
    .where(and(eq(brokerFinanceEntries.id, id), eq(brokerFinanceEntries.ownerUserId, actor.id)))
    .returning({ id: brokerFinanceEntries.id });
  if (!updated) throw new ActionError("Lançamento não encontrado.");
  revalidatePath("/");
  return { success: true };
}

// Marca como recebido/pago (com a data) ou reabre (null).
async function setFinanceEntryPaidImpl(id: string, paidAt: string | null) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!UUID.test(id)) throw new ActionError("Lançamento inválido.");
  if (paidAt !== null && !isIsoDate(paidAt)) throw new ActionError("Informe a data do pagamento.");
  const [updated] = await db.update(brokerFinanceEntries).set({ paidAt, updatedAt: new Date() })
    .where(and(eq(brokerFinanceEntries.id, id), eq(brokerFinanceEntries.ownerUserId, actor.id)))
    .returning({ id: brokerFinanceEntries.id });
  if (!updated) throw new ActionError("Lançamento não encontrado.");
  revalidatePath("/");
  return { success: true };
}

async function deleteFinanceEntryImpl(id: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!UUID.test(id)) throw new ActionError("Lançamento inválido.");
  const [deleted] = await db.delete(brokerFinanceEntries)
    .where(and(eq(brokerFinanceEntries.id, id), eq(brokerFinanceEntries.ownerUserId, actor.id)))
    .returning({ id: brokerFinanceEntries.id });
  if (!deleted) throw new ActionError("Lançamento não encontrado.");
  revalidatePath("/");
  return { success: true };
}

export async function getFinancePeriod(...args: Parameters<typeof getFinancePeriodImpl>) { return runAction(() => getFinancePeriodImpl(...args)); }
export async function createFinanceEntry(...args: Parameters<typeof createFinanceEntryImpl>) { return runAction(() => createFinanceEntryImpl(...args)); }
export async function updateFinanceEntry(...args: Parameters<typeof updateFinanceEntryImpl>) { return runAction(() => updateFinanceEntryImpl(...args)); }
export async function setFinanceEntryPaid(...args: Parameters<typeof setFinanceEntryPaidImpl>) { return runAction(() => setFinanceEntryPaidImpl(...args)); }
export async function deleteFinanceEntry(...args: Parameters<typeof deleteFinanceEntryImpl>) { return runAction(() => deleteFinanceEntryImpl(...args)); }
