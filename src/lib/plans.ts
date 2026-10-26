// Planos do NegociaLar: preço, capacidade de anúncios ativos e limite de fotos por anúncio.
// Para reajustar valores, mude só aqui — cadastro, renovação, landing, assinatura e painel leem deste arquivo.

export const PLAN_IDS = ["12", "20", "35", "50"] as const;
export type PlanId = typeof PLAN_IDS[number];
export type BillingCycle = "monthly" | "annual";

type Plan = {
  id: PlanId;
  name: string;
  listings: number;
  // Fotos por anúncio permitidas pelo plano.
  photos: number;
  monthly: string;
  // Anual: paga 11 meses e usa 12.
  annualTotal: string;
  description: string;
};

export const PLANS: Record<PlanId, Plan> = {
  "12": { id: "12", name: "12 anúncios", listings: 12, photos: 15, monthly: "79.90", annualTotal: "878.90", description: "Para quem está começando a carteira de parcerias." },
  "20": { id: "20", name: "20 anúncios", listings: 20, photos: 25, monthly: "109.90", annualTotal: "1208.90", description: "Para quem já trabalha com uma carteira ativa." },
  "35": { id: "35", name: "35 anúncios", listings: 35, photos: 30, monthly: "159.90", annualTotal: "1758.90", description: "Mais capacidade, para carteiras em crescimento." },
  "50": { id: "50", name: "50 anúncios", listings: 50, photos: 35, monthly: "199.90", annualTotal: "2198.90", description: "Maior capacidade, para carteiras grandes." },
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

// Planos antigos: contas que ficaram com "pro"/"enterprise" ou com os ids anteriores ("10"/"40"),
// de antes da nova tabela. São tratadas pela capacidade; não são re-restringidas.
const LEGACY_LISTINGS: Record<string, number> = { pro: 40, enterprise: 40, "10": 10, "40": 40 };
// Antes do limite por plano o cadastro permitia 40 fotos: conta antiga mantém esse teto.
const LEGACY_PHOTOS = 40;

export function listingLimit(plan: string) {
  return isPlanId(plan) ? PLANS[plan].listings : LEGACY_LISTINGS[plan] ?? PLANS["12"].listings;
}

// Fotos por anúncio permitidas pelo plano (conta antiga mantém o teto antigo de 40).
export function photoLimit(plan: string) {
  return isPlanId(plan) ? PLANS[plan].photos : LEGACY_PHOTOS;
}

export function planName(plan: string) {
  return isPlanId(plan) ? PLANS[plan].name : `${listingLimit(plan)} anúncios`;
}
