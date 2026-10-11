// Previsão de entrega do imóvel (pedido da corretora piloto, 11/10/2026): só para imóvel em construção ou na planta —
// imóvel pronto ou usado tem idade, não previsão. Na tela é mês/ano; no banco, o dia 1 do mês (date).

export const CONDICOES_COM_ENTREGA = ["em_construcao", "na_planta"] as const;

export function temPrevisaoDeEntrega(condition: string | null | undefined): boolean {
  return (CONDICOES_COM_ENTREGA as readonly string[]).includes(String(condition ?? ""));
}

/** "AAAA-MM" válido (mês 01-12, ano 2000-2100)? */
export function mesAnoValido(value: string): boolean {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return !!m && Number(m[1]) >= 2000 && Number(m[1]) <= 2100;
}

/** O que vai para o banco: "AAAA-MM-01" quando a condição tem entrega e o mês/ano é válido; senão null. */
export function previsaoParaBanco(condition: string | null | undefined, mesAno: string | null | undefined): string | null {
  const value = String(mesAno ?? "").trim().slice(0, 7);
  return temPrevisaoDeEntrega(condition) && mesAnoValido(value) ? `${value}-01` : null;
}

/** "AAAA-MM-DD" (ou "AAAA-MM") → "MM/AAAA" para mostrar; vazio se não houver. */
export function previsaoParaTela(value: string | null | undefined): string {
  const v = String(value ?? "");
  return /^\d{4}-\d{2}/.test(v) ? `${v.slice(5, 7)}/${v.slice(0, 4)}` : "";
}
