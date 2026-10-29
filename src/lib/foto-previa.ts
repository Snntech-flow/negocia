// Miniatura da foto recém-enviada (29/10/2026, corretora piloto: "erro ao carregar foto" — fotos e planta apareciam quebradas
// logo depois do envio). Desde que o bucket virou privado (28/10), o envio guarda só o CAMINHO do objeto (photo-upload), que o
// navegador não abre. O servidor devolve junto uma URL assinada curta, só para a miniatura do formulário; o que se grava
// continua sendo o caminho. As fotos já gravadas chegam assinadas pelos loaders (assinarFotosDeImoveis).
const previas = new Map<string, string>();

export function registrarPrevia(caminho: string, url: string) {
  previas.set(caminho, url);
}

/** O endereço que a <img> usa: a prévia assinada da foto recém-enviada, ou o próprio valor (já assinado ou link externo). */
export const enderecoParaExibir = (valor: string) => previas.get(valor) ?? valor;
