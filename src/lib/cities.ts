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

// Filtro de cidade do CRM: primeiro as cidades que já têm cliente, depois os municípios da UF do corretor
// (sem repetir, mesmo com acento ou caixa diferente). Antes só havia as dos clientes: carteira nova = filtro vazio.
export function cityFilterOptions(clientCities: Array<string | null | undefined>, stateCities: string[]) {
  const withClients = uniqueCities(clientCities);
  const taken = new Set(withClients.map(cityKey));
  return { withClients, others: uniqueCities(stateCities).filter((city) => !taken.has(cityKey(city))) };
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
