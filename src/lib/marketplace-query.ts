export const PROPERTY_PAGE_SIZE = 24;
export const WORKSPACE_SECTIONS = ["full", "vitrine", "radar", "crm", "atendimento", "cadastrar", "dvp", "termo", "admin"] as const;
export type WorkspaceSection = typeof WORKSPACE_SECTIONS[number];
export type MarketplaceQuery = { section?: WorkspaceSection; page?: number; search?: string; purpose?: string; propertyType?: string };

export function validateMarketplaceQuery(input: MarketplaceQuery) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Consulta inválida.");
  const { section = "full", page = 1, search = "", purpose = "todos", propertyType = "todos" } = input;
  if (!WORKSPACE_SECTIONS.includes(section) || !Number.isInteger(page) || page < 1 || page > 100000 ||
      typeof search !== "string" || search.length > 200 || typeof propertyType !== "string" || propertyType.length > 80 ||
      !["todos", "venda", "aluguel", "temporada"].includes(purpose)) throw new Error("Filtros inválidos.");
  return { section, page, search: search.trim(), purpose, propertyType };
}
