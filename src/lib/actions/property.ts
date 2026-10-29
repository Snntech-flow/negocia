// Cadastro de imóvel e de perfil de comprador (Radar). Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, properties, buyerProfiles } from "../db";
import { revalidatePath } from "next/cache";
import { ehCondicaoValida, percentualDoCaptador } from "../partnership-models";
import { capaDasFotos } from "../photo-order";
import { fotosParaGravar } from "../photo-sign";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import type { PropertyInput } from "../property-input";
import { validateBuyerProfileInput, validatePropertyInput } from "../input-validation";
import { previsaoParaBanco } from "../delivery-forecast";
import { reserveListingSlot } from "../listing-limit";
import { photoLimit } from "../plans";

export async function createPropertyImpl(formData: PropertyInput) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validatePropertyInput(formData);
  // Limite de fotos por anúncio é do plano (a garantia mora aqui, no servidor).
  const maxFotos = photoLimit(actor.plan);
  if ((formData.photos?.length ?? 0) > maxFotos) throw new ActionError(`Seu plano permite até ${maxFotos} fotos por anúncio.`);
  // No cadastro novo estes dados aparecem na vitrine: o corretor precisa escolher, o sistema não presume.
  if (!formData.condition) throw new ActionError("Informe a condição do imóvel (novo, usado, em construção ou na planta).");
  if (typeof formData.acceptsFinancing !== "boolean") throw new ActionError("Informe se o imóvel aceita financiamento.");
  if (!formData.state) throw new ActionError("Informe o estado (UF) do imóvel.");
  const state = formData.state.toUpperCase();
  const condition = formData.condition;
  const acceptsFinancing = formData.acceptsFinancing;
  // Condição de parceria (14/10/2026): na rede, o captador escolhe e confirma — nada presumido. Na carteira não se aplica.
  if (formData.acceptsPartnership) {
    if (!ehCondicaoValida(formData.partnershipModels)) throw new ActionError("Escolha a condição de parceria deste imóvel: só 50/50, só 40/40/20 ou as duas.");
    if (formData.confirmaParceria !== true) throw new ActionError("Para publicar na rede, confirme que este imóvel aceita parceria nas condições informadas.");
  }
  const partnershipModels = ehCondicaoValida(formData.partnershipModels) ? formData.partnershipModels : "ambos";
  const targetBrokerId = actor.id;
  // Foto enviada chega como caminho no bucket privado; grava o caminho (lib/photo-sign).
  const photos = fotosParaGravar(formData.photos, actor.id);
  const floorPlanPhotos = fotosParaGravar(formData.floorPlanPhotos, actor.id);

  const newProperty = await db.transaction(async (tx) => {
    await reserveListingSlot(tx, actor);
    const [created] = await tx
      .insert(properties)
      .values({
        brokerId: targetBrokerId,
        title: formData.title,
        propertyType: formData.propertyType,
        salePrice: formData.salePrice,
        purpose: formData.purpose || "venda",
        acceptsTrade: formData.acceptsTrade ?? false,
        tradeDetails: formData.tradeDetails || null,
        condition,
        hotelRoomsCount: formData.hotelRoomsCount || null,
        condoFee: formData.condoFee || "0",
        iptu: formData.iptu || "0",
        iptuPeriod: formData.iptuPeriod || "anual",
        city: formData.city.trim(),
        state,
        neighborhood: formData.neighborhood.trim(),
        cep: formData.cep || null,
        street: formData.street || null,
        streetNumber: formData.streetNumber || null,
        block: formData.block || null,
        floor: formData.floor || null,
        condoName: formData.condoName || null,
        hideStreet: formData.hideStreet ?? false,
        bedrooms: formData.bedrooms,
        suites: formData.suites,
        bathrooms: formData.bathrooms,
        parkingSpots: formData.parkingSpots,
        garageType: formData.garageType || null,
        areaM2: formData.areaM2,
        usefulAreaM2: formData.usefulAreaM2 || null,
        totalAreaM2: formData.totalAreaM2 || null,
        solarPosition: formData.solarPosition || null,
        viewType: formData.viewType || null,
        propertyAge: formData.propertyAge ?? null,
        deliveryForecast: previsaoParaBanco(formData.condition, formData.deliveryForecast),
        documentationStatus: formData.documentationStatus || null,
        acceptsFinancing,
        privateAmenities: formData.privateAmenities || [],
        condoAmenities: formData.condoAmenities || [],
        description: formData.description,
        videoUrl: formData.videoUrl || null,
        coverPhoto: capaDasFotos(photos), // a primeira foto é a capa
        photos,
        floorPlanPhotos,
        confidentialAddress: formData.confidentialAddress,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        acceptsPartnership: formData.acceptsPartnership,
        splitPercentage: percentualDoCaptador(partnershipModels),
        partnershipModels,
        partnershipConfirmedAt: formData.acceptsPartnership ? new Date() : null,
        partnershipReviewPending: false,
        status: "disponivel",
      })
      .returning();
    return created;
  });

  // O match com as procuras da rede aparece no botão "Match" do cabeçalho, calculado na hora (lib/meus-matches) — desde
  // 28/10/2026 não vira mais aviso no sino.
  revalidatePath("/");
  return { success: true, property: newProperty };
}

export async function createBuyerProfileImpl(profileData: {
  clientInternalName: string;
  propertyType: string;
  city: string;
  neighborhoods: string[];
  maxBudget: string;
  minBedrooms: number;
  minParkingSpots: number;
  notes?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  validateBuyerProfileInput(profileData);
  const targetBrokerId = actor.id;

  const [newProfile] = await db
    .insert(buyerProfiles)
    .values({
      brokerId: targetBrokerId,
      clientInternalName: profileData.clientInternalName,
      propertyType: profileData.propertyType,
      city: profileData.city,
      neighborhoods: profileData.neighborhoods,
      maxBudget: profileData.maxBudget,
      minBedrooms: profileData.minBedrooms,
      minParkingSpots: profileData.minParkingSpots,
      notes: profileData.notes || null,
      active: true,
    })
    .returning();

  // Os imóveis da rede que atendem a esta procura aparecem no botão "Match" do cabeçalho (lib/meus-matches) — desde
  // 28/10/2026 não viram mais aviso no sino.
  revalidatePath("/");
  return { success: true, profile: newProfile };
}
