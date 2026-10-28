// Planos do NegociaLar: preço, capacidade de anúncios ativos e limite de fotos por anúncio.
// Para reajustar valores, mude só aqui — cadastro, renovação, landing, assinatura e painel leem deste arquivo.
//
// Tabelas de preço (⚖️ Sidney, 28/10/2026: "quem já assina mantém o preço atual"). A conta guarda a tabela em que entrou
// (`users.price_table`): a renovação, o aviso e a receita do painel cobram pela tabela DA CONTA, não pela do dia. A v1 é a
// de antes de 28/10/2026; a v2 é a vigente. Reajuste novo = tabela nova (v3) aqui + o padrão da coluna numa migration.

export const PLAN_IDS = ["12", "20", "35", "50", "100"] as const;
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

// Tabela vigente (v2, 28/10/2026). O plano de 100 nasce nela, com as fotos do de 50.
export const PLANS: Record<PlanId, Plan> = {
  "12": { id: "12", name: "12 anúncios", listings: 12, photos: 15, monthly: "79.90", annualTotal: "878.90", description: "Para quem está começando a carteira de parcerias." },
  "20": { id: "20", name: "20 anúncios", listings: 20, photos: 25, monthly: "119.90", annualTotal: "1318.90", description: "Para quem já trabalha com uma carteira ativa." },
  "35": { id: "35", name: "35 anúncios", listings: 35, photos: 30, monthly: "189.90", annualTotal: "2088.90", description: "Mais capacidade, para carteiras em crescimento." },
  "50": { id: "50", name: "50 anúncios", listings: 50, photos: 35, monthly: "229.90", annualTotal: "2528.90", description: "Para carteiras grandes." },
  "100": { id: "100", name: "100 anúncios", listings: 100, photos: 35, monthly: "399.90", annualTotal: "4398.90", description: "Maior capacidade, para imobiliárias e carteiras muito grandes." },
};

export const PRICE_TABLES = ["v1", "v2"] as const;
export type PriceTable = typeof PRICE_TABLES[number];
/** A tabela de quem se cadastra hoje (o padrão de `users.price_table`). */
export const CURRENT_PRICE_TABLE: PriceTable = "v2";

// v1 — os preços de antes de 28/10/2026, para quem já tinha conta. Só preço: anúncios e fotos são os da tabela vigente.
// Plano que não existia na v1 (o de 100) cobra pela vigente.
const V1_PRICES: Partial<Record<PlanId, Pick<Plan, "monthly" | "annualTotal">>> = {
  "12": { monthly: "79.90", annualTotal: "878.90" },
  "20": { monthly: "109.90", annualTotal: "1208.90" },
  "35": { monthly: "159.90", annualTotal: "1758.90" },
  "50": { monthly: "199.90", annualTotal: "2198.90" },
};

export function isPriceTable(value: unknown): value is PriceTable {
  return typeof value === "string" && (PRICE_TABLES as readonly string[]).includes(value);
}

/** Preço do plano na tabela da conta (desconhecida → a vigente). */
function priceOf(plan: PlanId, table: string = CURRENT_PRICE_TABLE) {
  return (table === "v1" && V1_PRICES[plan]) || PLANS[plan];
}

// Anúncios que contam no limite: os que estão na rede ou em negociação.
export const ACTIVE_LISTING_STATUSES = ["disponivel", "em_negociacao"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

// Valor de uma cobrança: mensal ou o total do ano, na tabela da conta (sem tabela = a vigente, para quem se cadastra).
export function planCharge(plan: PlanId, cycle: BillingCycle, table?: string) {
  const price = priceOf(plan, table);
  return cycle === "annual" ? price.annualTotal : price.monthly;
}

// Equivalente mensal, para exibir e para users.monthly_fee.
export function planMonthlyEquivalent(plan: PlanId, cycle: BillingCycle, table?: string) {
  const price = priceOf(plan, table);
  return cycle === "annual" ? (Number(price.annualTotal) / 12).toFixed(2) : price.monthly;
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
