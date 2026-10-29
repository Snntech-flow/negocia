// Municípios oficiais por UF — IBGE, API de localidades (/api/v1/localidades/municipios), baixada em 28/10/2026: 5.571
// municípios, 27 UFs (municipios-ibge.json). Fica no projeto para o SERVIDOR conferir a cidade sem depender do IBGE no ar.
//
// ⚖️ Sidney, 28/10/2026 ("onde é São Paulo, Bahia?"): a conta da corretora piloto tinha cidade "São Paulo" com CRECI da BA —
// o cadastro aceitava qualquer texto como cidade, a lista da UF era só sugestão. Agora a cidade tem de ser um município da
// UF escolhida, conferido aqui (cadastro e correção pela Administração), e é gravada com o nome oficial.
import MUNICIPIOS from "./municipios-ibge.json";
import { isBrazilianState } from "./brazil-states";
import { normalizeText } from "./normalize-text";

const porUf = MUNICIPIOS as Record<string, string[]>;
const indices = new Map<string, Map<string, string>>();

/** O nome oficial do município se `cidade` é da `uf` (sem diferenciar acento, caixa ou espaços); senão, null. */
export function municipioDaUf(uf: string, cidade: string): string | null {
  const sigla = uf.trim().toUpperCase();
  if (!isBrazilianState(sigla) || typeof cidade !== "string" || cidade.length > 120) return null;
  let indice = indices.get(sigla);
  if (!indice) {
    indice = new Map((porUf[sigla] ?? []).map((nome) => [normalizeText(nome), nome]));
    indices.set(sigla, indice);
  }
  return indice.get(normalizeText(cidade.replace(/\s+/g, " "))) ?? null;
}
