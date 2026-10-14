/**
 * Condição de parceria do imóvel (pedido da corretora piloto, 14/10/2026): o captador diz se aquele imóvel faz parceria
 * SÓ 50/50, SÓ 40/40/20 ou as DUAS. Quem anuncia imóvel de outro corretor marca 40/40/20; na captação própria, o corretor
 * escolhe as duas ou só 50/50. Quem busca na vitrine já vê a condição antes de entrar em contato, e o registro de visita
 * e a revisão da divisão só aceitam o que o imóvel aceita (a trava também está no banco — migration 20261014200000).
 */
import { ActionError } from "./action-result";

export const PARTNERSHIP_MODELS = ["50_50", "40_40_20", "ambos"] as const;
export type PartnershipModels = (typeof PARTNERSHIP_MODELS)[number];
export type CommissionModel = "two_party_50_50" | "three_party_referral_40_40_20";

export const OPCOES_DE_CONDICAO: { valor: PartnershipModels; rotulo: string; ajuda: string }[] = [
  { valor: "50_50", rotulo: "Só 50/50", ajuda: "50% para você e 50% para o corretor do comprador." },
  { valor: "40_40_20", rotulo: "Só 40/40/20", ajuda: "Imóvel de outro corretor que você anuncia: 40% · 40% · 20% para o indicador." },
  { valor: "ambos", rotulo: "50/50 ou 40/40/20", ajuda: "Captação sua que aceita as duas divisões." },
];

export const ehCondicaoValida = (v: unknown): v is PartnershipModels => PARTNERSHIP_MODELS.includes(v as PartnershipModels);

/** As divisões que o imóvel aceita. Valor desconhecido = as duas (o que o sistema sempre permitiu). */
export function divisoesPermitidas(condicao: string | null | undefined): CommissionModel[] {
  if (condicao === "50_50") return ["two_party_50_50"];
  if (condicao === "40_40_20") return ["three_party_referral_40_40_20"];
  return ["two_party_50_50", "three_party_referral_40_40_20"];
}

/** O que a vitrine e a ficha mostram. */
export function rotuloDaCondicao(condicao: string | null | undefined): string {
  if (condicao === "50_50") return "Parceria só 50/50";
  if (condicao === "40_40_20") return "Parceria só 40/40/20";
  return "Parceria 50/50 ou 40/40/20";
}

/** O percentual do captador que acompanha a condição (o campo antigo split_percentage, mantido para quem ainda o lê). */
export const percentualDoCaptador = (condicao: PartnershipModels): string => (condicao === "40_40_20" ? "40.00" : "50.00");

/** Recusa a divisão que o imóvel não aceita — a mesma frase que o banco usa. */
export function conferirDivisao(condicao: string | null | undefined, modelo: string): void {
  if (divisoesPermitidas(condicao).includes(modelo as CommissionModel)) return;
  throw new ActionError(condicao === "50_50" ? "Este imóvel só faz parceria 50/50." : "Este imóvel só faz parceria 40/40/20.");
}
