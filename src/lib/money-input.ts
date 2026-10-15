// Campos de dinheiro no formato brasileiro (pedido da corretora piloto, 14/10/2026). No campo numérico do navegador o
// ponto é a vírgula decimal: "720.000" virava 720 e o anúncio saía na Vitrine por R$ 720,00.

/**
 * Lê o que a pessoa digitou: "720.000", "720.000,50", "720000", "720,5", "R$ 1.447,00". A vírgula é a decimal e os
 * pontos em grupos de 3 separam o milhar; "1.50" (ponto com 1 ou 2 casas) é decimal. Devolve null se não der para entender.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo) return null;
  let normal: string;
  if (limpo.includes(",")) {
    if (!/^(\d{1,3}(\.\d{3})+|\d+),\d{1,2}$/.test(limpo)) return null;
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normal = limpo.replace(/\./g, "");
  } else if (/^\d+(\.\d{1,2})?$/.test(limpo)) {
    normal = limpo;
  } else {
    return null;
  }
  const valor = Number(normal);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null;
}

export const formatarReais = (valor: number) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** O que o servidor recebe: "720000.00". */
export const reaisParaServidor = (valor: number) => valor.toFixed(2);

/** Valor gravado ("720000.00") → como o campo mostra: "720.000,00". */
export function campoDeReais(gravado: string | number | null | undefined): string {
  if (gravado === null || gravado === undefined || gravado === "") return "";
  const valor = Number(gravado);
  return Number.isFinite(valor) ? formatarReais(valor) : "";
}

const MINIMO_ESPERADO: Record<string, number> = { venda: 10000, aluguel: 100, temporada: 30 };

/** Valor baixo demais para a finalidade: a tela pede confirmação antes de gravar (não bloqueia — pode ser de propósito). */
export function avisoDeValorBaixo(finalidade: string | null | undefined, valor: number): string | null {
  const minimo = MINIMO_ESPERADO[finalidade || "venda"] ?? MINIMO_ESPERADO.venda;
  if (!(valor > 0 && valor < minimo)) return null;
  return `O valor ficou em R$ ${formatarReais(valor)}. Se era R$ ${formatarReais(valor * 1000)}, volte e corrija — dá para digitar com ou sem ponto (ex.: 720.000 ou 720000).`;
}
