// A descrição do imóvel na FICHA DO CLIENTE (white-label), 28/10/2026: o Sidney pediu a descrição na ficha que vai pelo
// link. A ficha é white-label — o corretor parceiro apresenta o imóvel como dele, com o contato DELE. A descrição é escrita
// pelo captador e pode trazer telefone, e-mail ou link dele: na ficha isso daria ao cliente o caminho para pular o parceiro
// (o contorno que a plataforma combate). Aqui o contato direto sai e fica um aviso neutro; o resto do texto vai como está.

export const AVISO_CONTATO = "(contato com o corretor)";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const LINK = /\b(?:https?:\/\/|www\.|wa\.me\/)\S+/gi;
// Telefone brasileiro: +55 e DDD opcionais, 8 ou 9 dígitos em dois blocos de 4 (com ou sem traço, ponto ou espaço). Preço
// ("1.200.000"), CEP ("01310-100") e área ("120 m²") têm outros blocos e ficam.
const TELEFONE = /(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}\b/g;

export function descricaoSemContato(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .replace(EMAIL, AVISO_CONTATO)
    .replace(LINK, AVISO_CONTATO)
    .replace(TELEFONE, AVISO_CONTATO)
    .replace(/(?:\(contato com o corretor\)[\s,;/|-]*){2,}/g, `${AVISO_CONTATO} `)
    .trim();
}
