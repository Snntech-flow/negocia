import { isPlanId, planCharge } from "./plans";

export const TRIAL_DAYS = 30;
export function addFreeDays(from: Date, days = TRIAL_DAYS) {
  return new Date(from.getTime() + days * 86400000);
}
export function extendPaidPeriod(expiresAt: Date | null, cycle: string, now = new Date()) {
  const start = expiresAt && expiresAt > now ? new Date(expiresAt) : new Date(now);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() + (cycle === "annual" ? 12 : 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return start;
}
export function hasSubscriptionAccess(status: string, expiresAt: Date | null, now = new Date()) {
  if (status === "teste") return !!expiresAt && expiresAt > now;
  return status === "ativo" && (!expiresAt || expiresAt > now);
}

// Aviso da mensalidade no sino (como no ModernaDental): de 3 dias antes do vencimento até pagar.
// Conta isenta, administração e conta sem vencimento nunca veem cobrança.
export const BILLING_NOTICE_DAYS = 3;
export type BillingNotice = { tone: "aviso" | "vencido"; title: string; message: string };
type BillingAccount = {
  role: string; subscriptionStatus: string; nextBillingDate: Date | null; billingExemptAt: Date | null;
  plan: string; billingCycle: string; hasPaid: boolean; pendingPix: boolean;
  /** Tabela de preços da conta (users.price_table) — quem já assinava cobra pela v1. */
  priceTable?: string;
};
const TIME_ZONE = "America/Sao_Paulo";
// Dias contados no calendário de Brasília, não no relógio do servidor.
const brasiliaDayNumber = (date: Date) => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
};
const brl = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

// Primeira cobrança: o corretor escolhe mensal ou anual. Depois, cobra só o ciclo escolhido.
export function billingPrice(account: Pick<BillingAccount, "plan" | "billingCycle" | "hasPaid" | "priceTable">) {
  if (!isPlanId(account.plan)) return null;
  const monthly = brl(planCharge(account.plan, "monthly", account.priceTable));
  const annual = brl(planCharge(account.plan, "annual", account.priceTable));
  if (!account.hasPaid) return `mensal ${monthly} ou anual ${annual}`;
  return account.billingCycle === "annual" ? `anuidade ${annual}` : `mensalidade ${monthly}`;
}

export function billingNotice(account: BillingAccount, now = new Date()): BillingNotice | null {
  const expiresAt = account.nextBillingDate;
  if (account.role === "admin" || account.billingExemptAt || !expiresAt) return null;
  const expired = !hasSubscriptionAccess(account.subscriptionStatus, expiresAt, now);
  const daysLeft = brasiliaDayNumber(expiresAt) - brasiliaDayNumber(now);
  if (!expired && daysLeft > BILLING_NOTICE_DAYS) return null;
  const date = expiresAt.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
  if (account.pendingPix) {
    return { tone: expired ? "vencido" : "aviso", title: "Pix aguardando confirmação", message: `${expired ? `Seu acesso venceu em ${date}. ` : ""}A equipe confere o pagamento no extrato e libera o acesso.` };
  }
  const price = billingPrice(account);
  const pay = price ? `Pague via Pix em Minha assinatura: ${price}.` : "Fale com a equipe para renovar.";
  const trial = account.subscriptionStatus === "teste";
  if (expired) {
    return { tone: "vencido", title: trial ? "Seu período grátis terminou" : "Sua assinatura venceu", message: `Venceu em ${date}. Para voltar a usar a rede, ${pay.charAt(0).toLowerCase()}${pay.slice(1)}` };
  }
  const when = daysLeft <= 0 ? "hoje" : daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`;
  const what = trial ? "Seu período grátis termina" : account.billingCycle === "annual" && account.hasPaid ? "Sua anuidade vence" : "Sua mensalidade vence";
  return { tone: "aviso", title: `${what} ${when}`, message: `Acesso até ${date}. ${pay}` };
}

// Pop-up da cobrança (como no ModernaDental: o sino sozinho não é visto). Aviso amarelo 1× por dia; vencido
// vermelho 2× por dia, manhã e tarde no horário de Brasília. Com Pix aguardando conferência, não insiste.
// Devolve a "vez" atual; a tela guarda a última vez fechada e só reabre quando a vez muda.
export function billingPopupSlot(notice: BillingNotice | null, pendingPix: boolean, now = new Date()) {
  if (!notice || pendingPix) return null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
  if (notice.tone === "aviso") return day;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now));
  return `${day}-${hour < 12 ? "manha" : "tarde"}`;
}
