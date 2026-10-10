import { isBrazilianState } from "./brazil-states";

import { normalizeText as cityKey } from "./normalize-text";

// Cidades para o filtro do funil: uma por nome, mesmo grafada com ou sem acento ou caixa diferente.
export function uniqueCities(names: Array<string | null | undefined>) {
  const byKey = new Map<string, string>();
  for (const name of names) {
    const city = name?.trim();
    if (city && !byKey.has(cityKey(city))) byKey.set(cityKey(city), city);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const stateCities = new Map<string, Promise<string[]>>();

// Municípios do IBGE da UF, para o campo Cidade sugerir o nome oficial. Falha devolve lista vazia e tenta de novo depois.
export function loadStateCities(uf: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  const state = uf.trim().toUpperCase();
  if (!isBrazilianState(state)) return Promise.resolve([]);
  const cached = stateCities.get(state);
  if (cached) return cached;
  const request = fetcher(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`, { signal: AbortSignal.timeout(10_000) })
    .then((response) => {
      if (!response.ok) throw new Error("IBGE indisponível");
      return response.json() as Promise<unknown>;
    })
    .then((rows) => uniqueCities(Array.isArray(rows) ? rows.map((row) => {
      const name = (row as { nome?: unknown } | null)?.nome;
      return typeof name === "string" && name.length <= 120 ? name : null;
    }) : []))
    .catch(() => {
      stateCities.delete(state);
      return [];
    });
  stateCities.set(state, request);
  return request;
}
