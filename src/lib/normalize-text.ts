// Comparação de cidade, bairro e tipo sem diferenciar acento, caixa ou espaços nas pontas ("São Paulo" = "sao paulo ").
export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-BR");
}
