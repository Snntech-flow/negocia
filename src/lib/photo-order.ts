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

/**
 * Lista que a edição abre: a capa gravada vai para a frente (e entra, se não estava entre as fotos). Até 14/10/2026 a
 * edição tinha um campo próprio para a URL da capa; ele saiu — a capa é a primeira foto da grade — e ninguém perde a
 * capa que já tinha.
 */
export function fotosComCapaNaFrente(fotos: readonly string[], capa: string | null | undefined, maximo = 40): string[] {
  if (!capa) return fotos.slice(0, maximo);
  return [capa, ...fotos.filter((foto) => foto !== capa)].slice(0, maximo);
}

/** A capa do anúncio é sempre a primeira foto. */
export const capaDasFotos = (fotos: readonly string[] | null | undefined): string | null => fotos?.[0] || null;
