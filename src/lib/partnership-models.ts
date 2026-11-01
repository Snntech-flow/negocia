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

/**
 * ⚖️ Parceria obrigatória (01/11/2026, Sidney, sobre a frase "Imóvel sem parceria fica só na carteira de quem cadastrou" da
 * página inicial: "tirar esse texto e obrigar a pôr a parceria"). Revoga o "manter a carteira" de 14/10: todo imóvel do
 * Negocia Lar aceita parceria. O cadastro e a edição só gravam com a condição escolhida e confirmada — conferido aqui, no
 * servidor. Os imóveis antigos sem parceria continuam gravados (arquivar e mudar a situação seguem livres); para salvar a
 * edição, o corretor escolhe a condição e confirma, e o imóvel entra na rede.
 */
export const PARCERIA_OBRIGATORIA = "No Negocia Lar todo imóvel aceita parceria: escolha a condição deste imóvel (só 50/50, só 40/40/20 ou as duas) e confirme.";

/** Cadastro novo: parceria com a condição escolhida e confirmada — nada presumido. Devolve a condição. */
export function conferirParceriaDoCadastro(entrada: { acceptsPartnership?: unknown; partnershipModels?: unknown; confirmaParceria?: unknown }): PartnershipModels {
  if (entrada.acceptsPartnership !== true) throw new ActionError(PARCERIA_OBRIGATORIA);
  if (!ehCondicaoValida(entrada.partnershipModels)) throw new ActionError("Escolha a condição de parceria deste imóvel: só 50/50, só 40/40/20 ou as duas.");
  if (entrada.confirmaParceria !== true) throw new ActionError("Para publicar na rede, confirme que este imóvel aceita parceria nas condições informadas.");
  return entrada.partnershipModels;
}

/** Edição: recusa tirar o imóvel da parceria e diz se a confirmação é pedida (imóvel que estava fora da rede, em revisão
 *  ou com a condição trocada). */
export function edicaoPedeConfirmacao(atual: { acceptsPartnership: boolean; partnershipReviewPending: boolean; partnershipModels: string },
  nova: { acceptsPartnership?: unknown; partnershipModels?: unknown }): boolean {
  if (nova.acceptsPartnership !== true) throw new ActionError(PARCERIA_OBRIGATORIA);
  return !atual.acceptsPartnership || atual.partnershipReviewPending || atual.partnershipModels !== nova.partnershipModels;
}

/** O percentual do captador que acompanha a condição (o campo antigo split_percentage, mantido para quem ainda o lê). */
export const percentualDoCaptador = (condicao: PartnershipModels): string => (condicao === "40_40_20" ? "40.00" : "50.00");

/** Recusa a divisão que o imóvel não aceita — a mesma frase que o banco usa. */
export function conferirDivisao(condicao: string | null | undefined, modelo: string): void {
  if (divisoesPermitidas(condicao).includes(modelo as CommissionModel)) return;
  throw new ActionError(condicao === "50_50" ? "Este imóvel só faz parceria 50/50." : "Este imóvel só faz parceria 40/40/20.");
}
