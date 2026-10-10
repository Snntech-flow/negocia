// Financeiro do corretor: categorias, validação e contas do mês. Tela e servidor usam as mesmas regras.
import { ActionError } from "./action-result";

export const FINANCE_KINDS = ["receita", "despesa"] as const;
export type FinanceKind = typeof FINANCE_KINDS[number];

export const FINANCE_CATEGORIES: Record<FinanceKind, readonly { id: string; label: string }[]> = {
  receita: [
    { id: "comissao_venda", label: "Comissão de venda" },
    { id: "comissao_locacao", label: "Comissão de locação" },
    { id: "comissao_parceria", label: "Comissão de parceria" },
    { id: "administracao_aluguel", label: "Administração de aluguel" },
    { id: "outras_receitas", label: "Outras receitas" },
  ],
  despesa: [
    { id: "anuncios_portais", label: "Anúncios e portais" },
    { id: "marketing", label: "Marketing e divulgação" },
    { id: "deslocamento", label: "Combustível e deslocamento" },
    { id: "creci_anuidade", label: "CRECI e anuidades" },
    { id: "telefone_internet", label: "Telefone e internet" },
    { id: "assinaturas", label: "Assinaturas e ferramentas" },
    { id: "impostos", label: "Impostos" },
    { id: "outras_despesas", label: "Outras despesas" },
  ],
};

export const MAX_REPEAT_MONTHS = 12;

export function financeCategoryLabel(kind: string, category: string) {
  return FINANCE_CATEGORIES[kind as FinanceKind]?.find((item) => item.id === category)?.label ?? category;
}

// Dia no calendário de Brasília (aaaa-mm-dd): "vencido" e "este mês" seguem o dia de quem usa, não o do servidor.
export function brasiliaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && isIsoDate(`${value}-01`);
}

// Mesmo dia nos meses seguintes; dia 31 vira o último dia do mês curto (31/01 → 28/02 → 31/03 pelo dia original).
export function addMonthsKeepingDay(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function monthRange(month: string) {
  const start = `${month}-01`;
  return { start, end: addMonthsKeepingDay(start, 1) };
}

// Valores em centavos para somar sem erro de arredondamento.
export const toCents = (amount: string) => Math.round(Number(amount) * 100);

export type FinanceEntryInput = {
  kind: string; description: string; category: string; amount: string; dueDate: string;
  paidAt?: string | null; leadId?: string | null; notes?: string | null; repeatMonths?: number;
};

export function validateFinanceEntryInput(input: FinanceEntryInput) {
  if (!input || typeof input !== "object") throw new ActionError("Preencha o lançamento.");
  if (!(FINANCE_KINDS as readonly string[]).includes(input.kind)) throw new ActionError("Escolha receita ou despesa.");
  const kind = input.kind as FinanceKind;
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (description.length < 2 || description.length > 160) throw new ActionError("Descreva o lançamento (2 a 160 caracteres).");
  if (!FINANCE_CATEGORIES[kind].some((item) => item.id === input.category)) throw new ActionError("Escolha uma categoria da lista.");
  const amount = typeof input.amount === "string" ? input.amount.trim().replace(",", ".") : "";
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new ActionError("Informe um valor maior que zero, com até 2 casas decimais.");
  if (!isIsoDate(input.dueDate)) throw new ActionError("Informe a data prevista.");
  const paidAt = input.paidAt ? input.paidAt : null;
  if (paidAt !== null && !isIsoDate(paidAt)) throw new ActionError(kind === "receita" ? "Informe a data em que recebeu." : "Informe a data em que pagou.");
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;
  if (notes && notes.length > 1000) throw new ActionError("As observações devem ter até 1.000 caracteres.");
  const leadId = input.leadId ? input.leadId : null;
  if (leadId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) throw new ActionError("Cliente inválido.");
  const repeatMonths = input.repeatMonths ?? 1;
  if (!Number.isInteger(repeatMonths) || repeatMonths < 1 || repeatMonths > MAX_REPEAT_MONTHS) throw new ActionError(`Repita de 1 a ${MAX_REPEAT_MONTHS} meses.`);
  return { kind, description, category: input.category, amount: Number(amount).toFixed(2), dueDate: input.dueDate, paidAt, notes, leadId, repeatMonths };
}

type SummaryEntry = { kind: string; amount: string; paidAt: string | null; dueDate: string };

// Contas do mês: o que entrou e saiu de fato e o que ainda está previsto. "Vencido" = em aberto com data já passada.
export function summarizeFinance(entries: SummaryEntry[], today: string) {
  const total = { received: 0, receivable: 0, paid: 0, payable: 0, overdueReceivable: 0, overduePayable: 0 };
  for (const entry of entries) {
    const cents = toCents(entry.amount);
    const open = !entry.paidAt;
    const overdue = open && entry.dueDate < today;
    if (entry.kind === "receita") {
      if (open) total.receivable += cents; else total.received += cents;
      if (overdue) total.overdueReceivable += cents;
    } else {
      if (open) total.payable += cents; else total.paid += cents;
      if (overdue) total.overduePayable += cents;
    }
  }
  return {
    ...total,
    balance: total.received - total.paid,
    forecast: total.received + total.receivable - total.paid - total.payable,
  };
}

export type FinanceStatus = "recebido" | "pago" | "a_receber" | "a_pagar" | "vencido";
export function financeStatus(entry: { kind: string; paidAt: string | null; dueDate: string }, today: string): FinanceStatus {
  if (entry.paidAt) return entry.kind === "receita" ? "recebido" : "pago";
  if (entry.dueDate < today) return "vencido";
  return entry.kind === "receita" ? "a_receber" : "a_pagar";
}

// Período do financeiro: de um mês a outro (aaaa-mm), no máximo 24 meses.
export const MAX_PERIOD_MONTHS = 24;
export const FINANCE_PRESETS = [
  { id: "mes", label: "Este mês" },
  { id: "mes_passado", label: "Mês passado" },
  { id: "3m", label: "Últimos 3 meses" },
  { id: "6m", label: "Últimos 6 meses" },
  { id: "12m", label: "Últimos 12 meses" },
  { id: "ano", label: "Este ano" },
] as const;
export type FinancePreset = typeof FINANCE_PRESETS[number]["id"];

export const shiftMonth = (month: string, months: number) => addMonthsKeepingDay(`${month}-01`, months).slice(0, 7);

export function monthsBetween(from: string, to: string) {
  const months: string[] = [];
  for (let month = from; month <= to && months.length <= MAX_PERIOD_MONTHS; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export function presetPeriod(preset: FinancePreset, today: string) {
  const current = today.slice(0, 7);
  switch (preset) {
    case "mes_passado": return { from: shiftMonth(current, -1), to: shiftMonth(current, -1) };
    case "3m": return { from: shiftMonth(current, -2), to: current };
    case "6m": return { from: shiftMonth(current, -5), to: current };
    case "12m": return { from: shiftMonth(current, -11), to: current };
    case "ano": return { from: `${current.slice(0, 4)}-01`, to: current };
    default: return { from: current, to: current };
  }
}

export function validatePeriod(from: unknown, to: unknown) {
  if (!isMonth(from) || !isMonth(to)) throw new ActionError("Período inválido.");
  if (from > to) throw new ActionError("O mês inicial vem depois do final.");
  if (monthsBetween(from, to).length > MAX_PERIOD_MONTHS) throw new ActionError(`Escolha um período de até ${MAX_PERIOD_MONTHS} meses.`);
  return { from, to };
}

// O gráfico mostra pelo menos 6 meses terminando no fim do período, para comparar com os anteriores.
export const chartStart = (from: string, to: string) => (shiftMonth(to, -5) < from ? shiftMonth(to, -5) : from);

// Período anterior de mesmo tamanho, para comparar.
export function previousPeriod(from: string, to: string) {
  const length = monthsBetween(from, to).length;
  return { from: shiftMonth(from, -length), to: shiftMonth(from, -1) };
}

// Variação em % contra o período anterior; sem base (anterior zero), não há porcentagem.
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// Total por categoria de um tipo, do maior para o menor.
export function categoryTotals(entries: { kind: string; category: string; amount: string }[], kind: FinanceKind) {
  const totals = new Map<string, number>();
  for (const entry of entries) if (entry.kind === kind) totals.set(entry.category, (totals.get(entry.category) ?? 0) + toCents(entry.amount));
  return [...totals].map(([category, cents]) => ({ category, label: financeCategoryLabel(kind, category), cents })).sort((a, b) => b.cents - a.cents);
}
