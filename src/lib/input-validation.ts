import { ActionError } from "./action-result";
import { isBrazilianState } from "./brazil-states";
import { CONDITIONS, DOCUMENTATION_STATUSES, GARAGE_TYPES, IPTU_PERIODS, PURPOSES, SOLAR_POSITIONS, VIEW_TYPES } from "./property-options";

type Input = Record<string, unknown>;

function fields(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ActionError("Dados inválidos.");
  }
  return value as Input;
}

function text(input: Input, field: string, label: string, max: number, required = false) {
  const value = input[field];
  if (value == null || value === "") {
    if (required) throw new ActionError(`Informe ${label}.`);
    return;
  }
  if (typeof value !== "string" || value.trim().length < (required ? 1 : 0) || value.length > max) {
    throw new ActionError(`${label} inválido; máximo de ${max} caracteres.`);
  }
}

function decimal(input: Input, field: string, label: string, max: number, required = false, allowZero = true) {
  const value = input[field];
  if (value == null || value === "") {
    if (required) throw new ActionError(`Informe ${label}.`);
    return;
  }
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value) ||
      !Number.isFinite(Number(value)) || Number(value) > max || (!allowZero && Number(value) === 0)) {
    throw new ActionError(`${label} inválido.`);
  }
}

function count(input: Input, field: string, label: string, max: number, required = false) {
  const value = input[field];
  if (value == null) {
    if (required) throw new ActionError(`Informe ${label}.`);
    return;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) {
    throw new ActionError(`${label} inválido.`);
  }
}

function list(input: Input, field: string, label: string, maxItems: number, maxText: number, urls = false) {
  const value = input[field];
  if (value == null) return;
  if (!Array.isArray(value) || value.length > maxItems ||
      value.some((item) => typeof item !== "string" || item.length > maxText || (urls && !safeHttpsUrl(item)))) {
    throw new ActionError(`${label} inválido.`);
  }
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function oneOf(input: Input, field: string, message: string, options: readonly { id: string }[]) {
  const value = input[field];
  if (value == null || value === "") return;
  if (!options.some((option) => option.id === value)) throw new ActionError(message);
}

function optionalUrl(input: Input, field: string, label: string) {
  const value = input[field];
  if (value == null || value === "") return;
  if (typeof value !== "string" || value.length > 2048 || !safeHttpsUrl(value)) {
    throw new ActionError(`${label} deve ser uma URL HTTPS válida.`);
  }
}

export function validatePropertyInput(value: unknown) {
  const input = fields(value);
  for (const [field, label, max] of [
    ["title", "o título", 160], ["propertyType", "o tipo do imóvel", 80],
    ["city", "a cidade", 120], ["neighborhood", "o bairro", 120],
    ["description", "a descrição", 10000], ["confidentialAddress", "o endereço", 500],
    ["ownerName", "o nome do proprietário", 120], ["ownerPhone", "o telefone do proprietário", 30],
  ] as const) text(input, field, label, max, true);
  for (const [field, label, max] of [
    ["purpose", "a finalidade", 30], ["tradeDetails", "os detalhes da permuta", 1000],
    ["condition", "a condição", 40], ["iptuPeriod", "o período do IPTU", 20],
    ["state", "o estado", 2], ["cep", "o CEP", 12], ["street", "a rua", 200],
    ["streetNumber", "o número", 30], ["block", "o bloco", 50],
    ["floor", "o andar", 30], ["condoName", "o condomínio", 160],
    ["garageType", "o tipo de garagem", 40], ["solarPosition", "a posição solar", 50],
    ["viewType", "a vista", 50], ["documentationStatus", "a documentação", 80],
  ] as const) text(input, field, label, max);
  oneOf(input, "solarPosition", "Escolha uma posição solar da lista.", SOLAR_POSITIONS);
  oneOf(input, "viewType", "Escolha um tipo de vista da lista.", VIEW_TYPES);
  oneOf(input, "purpose", "Escolha venda, aluguel ou temporada.", PURPOSES);
  oneOf(input, "condition", "Escolha a condição do imóvel da lista.", CONDITIONS);
  oneOf(input, "garageType", "Escolha vaga coberta ou descoberta.", GARAGE_TYPES);
  oneOf(input, "documentationStatus", "Escolha a situação da documentação da lista.", DOCUMENTATION_STATUSES);
  oneOf(input, "iptuPeriod", "Escolha IPTU anual ou mensal.", IPTU_PERIODS);
  if (typeof input.state === "string" && input.state && !isBrazilianState(input.state.toUpperCase())) throw new ActionError("Informe uma UF válida.");
  for (const [field, label, max, required] of [
    ["salePrice", "o preço", 9999999999.99, true],
    ["areaM2", "a área", 999999.99, true],
    ["condoFee", "o condomínio", 99999999.99, false],
    ["iptu", "o IPTU", 99999999.99, false],
    ["usefulAreaM2", "a área útil", 999999.99, false],
    ["totalAreaM2", "a área total", 999999.99, false],
  ] as const) decimal(input, field, label, max, required, !required);
  decimal(input, "splitPercentage", "a divisão da comissão", 100, true);
  for (const [field, label, max, required] of [
    ["bedrooms", "o número de quartos", 100, true],
    ["suites", "o número de suítes", 100, true],
    ["bathrooms", "o número de banheiros", 100, true],
    ["parkingSpots", "o número de vagas", 100, true],
    ["hotelRoomsCount", "o número de quartos do hotel", 10000, false],
    ["propertyAge", "a idade do imóvel", 1000, false],
  ] as const) count(input, field, label, max, required);
  for (const field of ["acceptsTrade", "hideStreet", "acceptsFinancing", "acceptsPartnership"]) {
    if (input[field] != null && typeof input[field] !== "boolean") throw new ActionError(`${field} inválido.`);
  }
  list(input, "privateAmenities", "Itens privativos", 50, 120);
  list(input, "condoAmenities", "Itens do condomínio", 50, 120);
  list(input, "photos", "Fotos", 40, 2048, true);
  list(input, "floorPlanPhotos", "Plantas", 10, 2048, true);
  optionalUrl(input, "coverPhoto", "A foto de capa");
  optionalUrl(input, "videoUrl", "O vídeo");
}

export function validateBuyerProfileInput(value: unknown) {
  const input = fields(value);
  text(input, "clientInternalName", "o nome interno do cliente", 120, true);
  text(input, "propertyType", "o tipo do imóvel", 80, true);
  text(input, "city", "a cidade", 120, true);
  text(input, "notes", "as observações", 3000);
  decimal(input, "maxBudget", "o orçamento máximo", 9999999999.99, true, false);
  count(input, "minBedrooms", "o mínimo de quartos", 100, true);
  count(input, "minParkingSpots", "o mínimo de vagas", 100, true);
  list(input, "neighborhoods", "Bairros", 30, 120);
}

const leadTypes = new Set(["comprador", "proprietario", "locatario", "parceiro"]);
const leadSources = new Set(["indicacao", "whatsapp", "portal", "site", "ligacao", "rede_social", "outro"]);

export function validateLeadInput(value: unknown) {
  const input = fields(value);
  text(input, "fullName", "o nome do lead", 120, true);
  const phone = input.phone;
  if (typeof phone !== "string" || phone.length > 30 || phone.replace(/\D/g, "").length < 8 || phone.replace(/\D/g, "").length > 15) {
    throw new ActionError("Informe um telefone válido com DDD.");
  }
  if (typeof input.leadType !== "string" || !leadTypes.has(input.leadType)) throw new ActionError("Tipo de lead inválido.");
  if (typeof input.source !== "string" || !leadSources.has(input.source)) throw new ActionError("Origem do lead inválida.");
  text(input, "email", "o e-mail", 254);
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError("Informe um e-mail válido.");
  text(input, "propertyType", "o tipo do imóvel", 80);
  text(input, "city", "a cidade", 120);
  text(input, "notes", "as observações", 3000);
  text(input, "nextAction", "a próxima ação", 200);
  text(input, "lostReason", "o motivo da perda", 500);
  const budget = input.maxBudget;
  if (budget != null && budget !== "" && (
    typeof budget !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(budget) ||
    !Number.isFinite(Number(budget)) || Number(budget) <= 0 || Number(budget) > 9999999999.99
  )) throw new ActionError("O orçamento deve ser um valor positivo válido.");
  count(input, "minBedrooms", "o mínimo de quartos", 100);
  if (input.minBedrooms === 0) throw new ActionError("O mínimo de quartos deve ser maior que zero.");
  if (input.neighborhoods != null) list(input, "neighborhoods", "Bairros", 20, 120);
  const date = input.nextActionAt;
  if (date != null && date !== "" && (typeof date !== "string" || date.length > 100 || !Number.isFinite(new Date(date).getTime()))) {
    throw new ActionError("Informe uma data válida para o próximo retorno.");
  }
}
