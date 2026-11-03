import { translate, type Locale } from "./i18n";
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
  /** Keep the account’s original price table when localizing billing notices. */
  priceTable?: string;
};
const TIME_ZONE = "America/Sao_Paulo";
// Dias contados no calendário de Brasília, não no relógio do servidor.
const brasiliaDayNumber = (date: Date) => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
};
const brl = (value: string, locale: Locale) => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(Number(value));

// Primeira cobrança: o corretor escolhe mensal ou anual. Depois, cobra só o ciclo escolhido.
export function billingPrice(account: Pick<BillingAccount, "plan" | "billingCycle" | "hasPaid" | "priceTable">, locale: Locale = "pt-BR") {
  const t = (source: string, parameters?: readonly (string | number)[]) => translate(locale, source, parameters);
  if (!isPlanId(account.plan)) return null;
  const monthly = brl(planCharge(account.plan, "monthly", account.priceTable), locale);
  const annual = brl(planCharge(account.plan, "annual", account.priceTable), locale);
  if (!account.hasPaid) return t("mensal {0} ou anual {1}", [monthly, annual]);
  return account.billingCycle === "annual" ? t("anuidade {0}", [annual]) : t("mensalidade {0}", [monthly]);
}

export function billingNotice(account: BillingAccount, now = new Date(), locale: Locale = "pt-BR"): BillingNotice | null {
  const t = (source: string, parameters?: readonly (string | number)[]) => translate(locale, source, parameters);
  const expiresAt = account.nextBillingDate;
  if (account.role === "admin" || account.billingExemptAt || !expiresAt) return null;
  const expired = !hasSubscriptionAccess(account.subscriptionStatus, expiresAt, now);
  const daysLeft = brasiliaDayNumber(expiresAt) - brasiliaDayNumber(now);
  if (!expired && daysLeft > BILLING_NOTICE_DAYS) return null;
  const date = expiresAt.toLocaleDateString(locale, { timeZone: TIME_ZONE });
  if (account.pendingPix) {
    return { tone: expired ? "vencido" : "aviso", title: t("Pix aguardando confirmação"), message: (expired ? t("Seu acesso venceu em {0}. ", [date]) : "") + t("A equipe confere o pagamento no extrato e libera o acesso.") };
  }
  const price = billingPrice(account, locale);
  const pay = price ? t("Pague via Pix em Minha assinatura: {0}.", [price]) : t("Fale com a equipe para renovar.");
  const trial = account.subscriptionStatus === "teste";
  if (expired) {
    return { tone: "vencido", title: trial ? t("Seu período grátis terminou") : t("Sua assinatura venceu"), message: t("Venceu em {0}. Para voltar a usar a rede, {1}{2}", [date, pay.charAt(0).toLowerCase(), pay.slice(1)]) };
  }
  const when = daysLeft <= 0 ? t("hoje") : daysLeft === 1 ? t("amanhã") : t("em {0} dias", [daysLeft]);
  const what = trial ? t("Seu período grátis termina") : account.billingCycle === "annual" && account.hasPaid ? t("Sua anuidade vence") : t("Sua mensalidade vence");
  return { tone: "aviso", title: `${what} ${when}`, message: t("Acesso até {0}. {1}", [date, pay]) };
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
