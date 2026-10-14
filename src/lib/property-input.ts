import { ActionError } from "./action-result";
import { percentualDoCaptador, type PartnershipModels } from "./partnership-models";
import { validatePropertyInput } from "./input-validation";
import { previsaoParaBanco } from "./delivery-forecast";

export class PropertyInventoryError extends ActionError {}

export interface PropertyInput {
  title: string;
  propertyType: string;
  salePrice: string;
  purpose?: string;
  acceptsTrade?: boolean;
  tradeDetails?: string;
  condition?: string;
  hotelRoomsCount?: number;
  condoFee?: string;
  iptu?: string;
  iptuPeriod?: string;
  city: string;
  state?: string;
  neighborhood: string;
  cep?: string;
  street?: string;
  streetNumber?: string;
  block?: string;
  floor?: string;
  condoName?: string;
  hideStreet?: boolean;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  garageType?: string;
  areaM2: string;
  usefulAreaM2?: string;
  totalAreaM2?: string;
  solarPosition?: string;
  viewType?: string;
  propertyAge?: number;
  /** Previsão de entrega "AAAA-MM" — só em construção/na planta (delivery-forecast.ts). */
  deliveryForecast?: string;
  documentationStatus?: string;
  acceptsFinancing?: boolean;
  privateAmenities?: string[];
  condoAmenities?: string[];
  description: string;
  videoUrl?: string;
  coverPhoto?: string;
  photos: string[];
  floorPlanPhotos?: string[];
  confidentialAddress: string;
  ownerName: string;
  ownerPhone: string;
  acceptsPartnership: boolean;
  /** Mantido por compatibilidade: o servidor calcula pela condição (50 ou 40). */
  splitPercentage?: string;
  /** Condição de parceria: só 50/50, só 40/40/20 ou as duas (src/lib/partnership-models.ts). */
  partnershipModels?: PartnershipModels;
  /** "Confirmo que este imóvel aceita parceria nas condições informadas" — publicar na rede exige. */
  confirmaParceria?: boolean;
}

// Explicit allowlist prevents incoming brokerId, status or timestamps being applied.
const keys = ["title", "propertyType", "salePrice", "purpose", "acceptsTrade", "tradeDetails", "condition", "hotelRoomsCount",
  "condoFee", "iptu", "iptuPeriod", "city", "state", "neighborhood", "cep", "street", "streetNumber", "block", "floor", "condoName",
  "hideStreet", "bedrooms", "suites", "bathrooms", "parkingSpots", "garageType", "areaM2", "usefulAreaM2", "totalAreaM2",
  "solarPosition", "viewType", "propertyAge", "deliveryForecast", "documentationStatus", "acceptsFinancing", "privateAmenities", "condoAmenities",
  "description", "videoUrl", "coverPhoto", "photos", "floorPlanPhotos", "confidentialAddress", "ownerName", "ownerPhone", "acceptsPartnership", "partnershipModels"] as const;
export function propertyChanges(input: PropertyInput) {
  try { validatePropertyInput(input); } catch (error) { throw new PropertyInventoryError(error instanceof Error ? error.message : "Dados inválidos."); }
  const result = Object.fromEntries(keys.map(key => [key, input[key] === "" ? null : input[key] ?? null]));
  return { ...result, purpose: input.purpose || "venda", condition: input.condition || "usado",
    acceptsTrade: input.acceptsTrade ?? false, acceptsFinancing: input.acceptsFinancing ?? true,
    hideStreet: input.hideStreet ?? true, condoFee: input.condoFee || "0", iptu: input.iptu || "0",
    iptuPeriod: input.iptuPeriod || "anual", state: input.state ? input.state.toUpperCase() : null, garageType: input.garageType || null,
    photos: input.photos || [], floorPlanPhotos: input.floorPlanPhotos || [],
    privateAmenities: input.privateAmenities || [], condoAmenities: input.condoAmenities || [],
    // Previsão de entrega só em construção/na planta; trocar a condição para pronto/usado apaga a previsão.
    deliveryForecast: previsaoParaBanco(input.condition || "usado", input.deliveryForecast),
    // O percentual do captador acompanha a condição; não é mais um número livre.
    partnershipModels: input.partnershipModels || "ambos",
    splitPercentage: percentualDoCaptador(input.partnershipModels || "ambos"),
  } as PropertyInput;
}
export const PROPERTY_STATUSES = ["disponivel", "em_negociacao", "vendido", "alugado", "arquivado"] as const;
export type PropertyStatus = typeof PROPERTY_STATUSES[number];
export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  disponivel: "Disponível", em_negociacao: "Em negociação", vendido: "Vendido", alugado: "Alugado", arquivado: "Arquivado",
};
export function validatePropertyRevision(id: string, revision: string) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    typeof revision !== "string" || !Number.isFinite(Date.parse(revision))) throw new PropertyInventoryError("Imóvel ou versão inválida.");
}
