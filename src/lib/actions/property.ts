// Cadastro de imóvel e de perfil de comprador (Radar). Movido de actions.ts (Fase 0) — comportamento idêntico.
import { ActionError } from "../action-result";
import { db, properties, buyerProfiles, users, notifications } from "../db";
import { eq, ne, and, lte, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ehCondicaoValida, percentualDoCaptador } from "../partnership-models";
import { capaDasFotos } from "../photo-order";
import { requireCurrentUser, requireActiveBroker } from "../auth";
import { networkPropertyScope, networkProfileScope } from "../property-access";
import type { PropertyInput } from "../property-input";
import { validateBuyerProfileInput, validatePropertyInput } from "../input-validation";
import { normalizedSql, normalizeText } from "../text-match";
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
        coverPhoto: capaDasFotos(formData.photos), // a primeira foto é a capa
        photos: formData.photos || [],
        floorPlanPhotos: formData.floorPlanPhotos || [],
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

  // Cruzamento dos critérios cadastrados para imóveis de venda compartilhados.
  try {
    if (formData.acceptsPartnership && (formData.purpose || "venda") === "venda") {
    const matchingProfiles = await db
      .select({
        id: buyerProfiles.id,
        brokerId: buyerProfiles.brokerId,
        propertyType: buyerProfiles.propertyType,
        neighborhoods: buyerProfiles.neighborhoods,
        maxBudget: buyerProfiles.maxBudget,
        minBedrooms: buyerProfiles.minBedrooms,
        minParkingSpots: buyerProfiles.minParkingSpots,
      })
      .from(buyerProfiles)
      .innerJoin(users, eq(buyerProfiles.brokerId, users.id))
      .where(and(networkProfileScope(), eq(normalizedSql(buyerProfiles.city), normalizeText(formData.city))));

    const actualMatches = matchingProfiles.filter((bp) => {
      const maxBudget = Number(bp.maxBudget);
      const price = Number(formData.salePrice);
      const neighborhoods = Array.isArray(bp.neighborhoods) ? (bp.neighborhoods as string[]).map(normalizeText) : [];
      return normalizeText(bp.propertyType) === normalizeText(formData.propertyType)
        && (!neighborhoods.length || neighborhoods.includes(normalizeText(formData.neighborhood)))
        && (!Number.isFinite(maxBudget) || maxBudget <= 0 || price <= maxBudget)
        && formData.bedrooms >= bp.minBedrooms
        && formData.parkingSpots >= bp.minParkingSpots;
    });
    for (const bp of actualMatches) {
      if (bp.brokerId !== targetBrokerId) {
        await db.insert(notifications).values({
          userId: bp.brokerId,
          title: `Match no Radar: imóvel em ${formData.neighborhood}`,
          message: "Um imóvel compatível com os critérios do seu cliente foi cadastrado na rede.",
          type: "ai_match",
          propertyId: newProperty.id,
          read: false,
        });
      }
    }
    }
  } catch (matchErr) {
    console.warn("Aviso ao cruzar radar:", matchErr);
  }

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

  // Cruzamento imediato com os imóveis da rede (mesmos critérios do Radar).
  try {
    const matchingProps = await db
      .select({
        id: properties.id,
        title: properties.title,
        neighborhood: properties.neighborhood,
      })
      .from(properties)
      .innerJoin(users, eq(properties.brokerId, users.id))
      .where(
        and(
          networkPropertyScope(),
          ne(properties.brokerId, targetBrokerId),
          eq(normalizedSql(properties.city), normalizeText(profileData.city)),
          eq(properties.purpose, "venda"),
          eq(normalizedSql(properties.propertyType), normalizeText(profileData.propertyType)),
          ...(profileData.neighborhoods.length ? [inArray(normalizedSql(properties.neighborhood), profileData.neighborhoods.map(normalizeText))] : []),
          lte(properties.salePrice, profileData.maxBudget),
          gte(properties.bedrooms, profileData.minBedrooms),
          gte(properties.parkingSpots, profileData.minParkingSpots),
        )
      )
      .limit(3);

    if (matchingProps.length > 0) {
      await db.insert(notifications).values({
        userId: targetBrokerId,
        title: matchingProps.length === 1 ? `1 imóvel compatível com "${profileData.clientInternalName}"` : `${matchingProps.length} imóveis compatíveis com "${profileData.clientInternalName}"`,
        message: "Encontramos imóveis da rede que atendem aos critérios cadastrados. Confirme os detalhes e as condições de parceria com o captador.",
        type: "ai_match",
        propertyId: matchingProps[0].id,
        read: false,
      });
    }
  } catch (e) {
    // Sem erro bruto nos logs (DrizzleQueryError traz SQL/parâmetros na mensagem): só o tipo.
    console.warn("Erro ao buscar matches para novo perfil:", e instanceof Error ? e.constructor.name : typeof e);
  }

  revalidatePath("/");
  return { success: true, profile: newProfile };
}
