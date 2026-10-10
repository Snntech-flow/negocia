// Planos do NegociaLar: preço e capacidade de anúncios ativos.
// Para reajustar valores, mude só aqui — cadastro, renovação, landing, assinatura e painel leem deste arquivo.

export const PLAN_IDS = ["10", "20", "40"] as const;
export type PlanId = typeof PLAN_IDS[number];
export type BillingCycle = "monthly" | "annual";

type Plan = {
  id: PlanId;
  name: string;
  listings: number;
  monthly: string;
  // Anual: paga 11 meses e usa 12.
  annualTotal: string;
  description: string;
};

export const PLANS: Record<PlanId, Plan> = {
  "10": { id: "10", name: "10 anúncios", listings: 10, monthly: "59.90", annualTotal: "658.90", description: "Para quem está começando a carteira de parcerias." },
  "20": { id: "20", name: "20 anúncios", listings: 20, monthly: "89.90", annualTotal: "988.90", description: "Para quem já trabalha com uma carteira ativa." },
  "40": { id: "40", name: "40 anúncios", listings: 40, monthly: "150.00", annualTotal: "1650.00", description: "Maior capacidade, para carteiras grandes." },
};

// Anúncios que contam no limite: os que estão na rede ou em negociação.
export const ACTIVE_LISTING_STATUSES = ["disponivel", "em_negociacao"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

// Valor de uma cobrança: mensal ou o total do ano.
export function planCharge(plan: PlanId, cycle: BillingCycle) {
  return cycle === "annual" ? PLANS[plan].annualTotal : PLANS[plan].monthly;
}

// Equivalente mensal, para exibir e para users.monthly_fee.
export function planMonthlyEquivalent(plan: PlanId, cycle: BillingCycle) {
  return cycle === "annual" ? (Number(PLANS[plan].annualTotal) / 12).toFixed(2) : PLANS[plan].monthly;
}

// Contas antigas ficaram com "pro" ou "enterprise" antes dos planos por capacidade; o painel já as tratava como 40.
const LEGACY_LISTINGS: Record<string, number> = { pro: 40, enterprise: 40 };

export function listingLimit(plan: string) {
  return isPlanId(plan) ? PLANS[plan].listings : LEGACY_LISTINGS[plan] ?? PLANS["10"].listings;
}

export function planName(plan: string) {
  return isPlanId(plan) ? PLANS[plan].name : `${listingLimit(plan)} anúncios`;
}
