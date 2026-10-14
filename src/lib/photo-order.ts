// Ordem das fotos do imóvel (pedido da corretora piloto, 14/10/2026): a ordem da lista é a ordem gravada e a PRIMEIRA
// foto é a capa — na Vitrine, na ficha, no CRM e no material de divulgação.

/** Devolve uma lista nova com a foto da posição `de` levada para a posição `para`; posição inválida não muda nada. */
export function moverFoto<T>(fotos: readonly T[], de: number, para: number): T[] {
  const lista = [...fotos];
  const valida = (posicao: number) => Number.isInteger(posicao) && posicao >= 0 && posicao < lista.length;
  if (!valida(de) || !valida(para) || de === para) return lista;
  const [foto] = lista.splice(de, 1);
  lista.splice(para, 0, foto);
  return lista;
}

/** A capa do anúncio é sempre a primeira foto. */
export const capaDasFotos = (fotos: readonly string[] | null | undefined): string | null => fotos?.[0] || null;
