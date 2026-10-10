import { normalizeText as normalize } from "./normalize-text";

export type RadarProperty = {
  id: string; title: string; propertyType: string; city: string; neighborhood: string; salePrice: string;
  bedrooms: number; parkingSpots: number; purpose?: string; acceptsPartnership: boolean; status: string;
  broker: { id: string; name: string; verificationStatus?: string };
};
export type RadarProfile = {
  id: string; clientInternalName: string; propertyType: string; city: string; neighborhoods: string[];
  maxBudget: string; minBedrooms: number; minParkingSpots: number; broker: { id: string; name: string };
};

export function evaluateRadarMatch(property: RadarProperty, profile: RadarProfile) {
  const price = Number(property.salePrice);
  const budget = Number(profile.maxBudget);
  const criteria = [
    { label: "Cidade", met: normalize(property.city) === normalize(profile.city) },
    { label: "Tipo de imóvel", met: normalize(property.propertyType) === normalize(profile.propertyType) },
    { label: "Bairro", met: !profile.neighborhoods.length || profile.neighborhoods.some(neighborhood => normalize(neighborhood) === normalize(property.neighborhood)) },
    { label: "Orçamento", met: Number.isFinite(price) && price > 0 && Number.isFinite(budget) && budget > 0 && price <= budget },
    { label: "Quartos", met: property.bedrooms >= profile.minBedrooms },
    { label: "Vagas", met: property.parkingSpots >= profile.minParkingSpots },
  ];
  const eligible = property.acceptsPartnership && property.status === "disponivel" &&
    property.purpose === "venda" && property.broker.verificationStatus === "aprovado" && property.broker.id !== profile.broker.id;
  return { matched: eligible && criteria.every(criterion => criterion.met), criteria };
}

export function findRadarMatches(properties: RadarProperty[], profiles: RadarProfile[]) {
  const inventory = new Map<string, RadarProperty[]>();
  const key = (item: { city: string; propertyType: string }) => JSON.stringify([normalize(item.city), normalize(item.propertyType)]);
  for (const property of properties) {
    const bucket = inventory.get(key(property)) || [];
    bucket.push(property);
    inventory.set(key(property), bucket);
  }
  return profiles.flatMap(profile => (inventory.get(key(profile)) || []).flatMap(property => {
    const result = evaluateRadarMatch(property, profile);
    return result.matched ? [{ profile, property, criteria: result.criteria }] : [];
  }));
}
