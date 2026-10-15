// CPF parcial do registro de visita (pedido da corretora piloto, 14/10/2026): antes era preciso digitar exatamente
// "***.020.575-**". Agora a pessoa digita o CPF como tiver — inteiro ou só os 6 números do meio — e a tela mascara.
// O CPF inteiro nunca sai do navegador: o formulário manda só a forma mascarada (LGPD), que o servidor confere.

/** "123.020.575-10", "12302057510", "020.575", "020575" ou "***.020.575-**" → "***.020.575-**"; senão null. */
export function cpfParcial(texto: string): string | null {
  const limpo = texto.trim();
  const mascarado = /^\*{3}\.?(\d{3})\.?(\d{3})-?\*{2}$/.exec(limpo);
  const digitos = mascarado ? mascarado[1] + mascarado[2] : limpo.replace(/\D/g, "");
  if (/[^\d.\-\s*]/.test(limpo)) return null;
  const meio = digitos.length === 11 ? digitos.slice(3, 9) : digitos.length === 6 ? digitos : null;
  return meio ? `***.${meio.slice(0, 3)}.${meio.slice(3)}-**` : null;
}
