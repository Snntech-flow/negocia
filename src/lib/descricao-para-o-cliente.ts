// A descrição do imóvel na FICHA DO CLIENTE (white-label), 28/10/2026: o Sidney pediu a descrição na ficha que vai pelo
// link. A ficha é white-label — o corretor parceiro apresenta o imóvel como dele, com o contato DELE. A descrição é escrita
// pelo captador para os outros corretores da rede e pode trazer:
// - telefone, e-mail ou link dele: na ficha isso daria ao cliente o caminho para pular o parceiro (o contorno que a
//   plataforma combate) — sai e fica um aviso neutro;
// - assunto entre corretores — comissão, honorários, parceria/split, captador (Sidney, 28/10: "na ficha do cliente está
//   indo a comissão, que não deveria") — a frase inteira sai, sem aviso.
// O resto do texto vai como está.

export const AVISO_CONTATO = "(contato com o corretor)";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const LINK = /\b(?:https?:\/\/|www\.|wa\.me\/)\S+/gi;
// Telefone brasileiro: +55 e DDD opcionais, 8 ou 9 dígitos em dois blocos de 4 (com ou sem traço, ponto ou espaço). Preço
// ("1.200.000"), CEP ("01310-100") e área ("120 m²") têm outros blocos e ficam.
const TELEFONE = /(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}\b/g;
// Assunto entre corretores. "2/4" (dois quartos, como se escreve na Bahia) NÃO é divisão de comissão e fica.
const ENTRE_CORRETORES = /comiss|honor[áa]ri|\bsplit\b|\bparceri|\bcaptador/i;
// Uma linha se divide em frases (depois de . ! ? ;) e em itens separados por " | ", " • ", " – " ou " — ".
const SEPARADOR = /((?<=[.!?;])\s+|\s+[|•–—]\s+)/;

/** A linha sem as frases de assunto entre corretores; null quando não sobra nada. */
function linhaSemAssuntoEntreCorretores(linha: string): string | null {
  if (!ENTRE_CORRETORES.test(linha)) return linha;
  const partes = linha.split(SEPARADOR);
  const ficam: string[] = [];
  for (let i = 0; i < partes.length; i += 2) {
    if (ENTRE_CORRETORES.test(partes[i])) continue;
    ficam.push(ficam.length ? partes[i - 1] + partes[i] : partes[i]);
  }
  const resto = ficam.join("").trim();
  return resto || null;
}

export function descricaoParaOCliente(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .split("\n")
    .map(linhaSemAssuntoEntreCorretores)
    .filter((linha): linha is string => linha !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(EMAIL, AVISO_CONTATO)
    .replace(LINK, AVISO_CONTATO)
    .replace(TELEFONE, AVISO_CONTATO)
    .replace(/(?:\(contato com o corretor\)[\s,;/|-]*){2,}/g, `${AVISO_CONTATO} `)
    .trim();
}
