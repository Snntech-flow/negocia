// As 27 unidades federativas. A tela de cadastro lista estas siglas e o servidor só aceita estas.
export const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export function isBrazilianState(value: string) {
  return (BRAZILIAN_STATES as readonly string[]).includes(value);
}
