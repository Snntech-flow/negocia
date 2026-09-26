"use server";

import { db, properties, users, buyerProfiles, partnerships, transactions } from "./db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMarketplaceData() {
  const propertyList = await db
    .select({
      id: properties.id,
      title: properties.title,
      propertyType: properties.propertyType,
      salePrice: properties.salePrice,
      condoFee: properties.condoFee,
      iptu: properties.iptu,
      city: properties.city,
      neighborhood: properties.neighborhood,
      bedrooms: properties.bedrooms,
      suites: properties.suites,
      bathrooms: properties.bathrooms,
      parkingSpots: properties.parkingSpots,
      areaM2: properties.areaM2,
      description: properties.description,
      photos: properties.photos,
      acceptsPartnership: properties.acceptsPartnership,
      splitPercentage: properties.splitPercentage,
      status: properties.status,
      createdAt: properties.createdAt,
      broker: {
        id: users.id,
        name: users.name,
        creci: users.creci,
        whatsapp: users.whatsapp,
        avatarUrl: users.avatarUrl,
        city: users.city,
      },
    })
    .from(properties)
    .innerJoin(users, eq(properties.brokerId, users.id))
    .orderBy(desc(properties.createdAt));

  const radarList = await db
    .select({
      id: buyerProfiles.id,
      clientInternalName: buyerProfiles.clientInternalName,
      propertyType: buyerProfiles.propertyType,
      city: buyerProfiles.city,
      neighborhoods: buyerProfiles.neighborhoods,
      maxBudget: buyerProfiles.maxBudget,
      minBedrooms: buyerProfiles.minBedrooms,
      minParkingSpots: buyerProfiles.minParkingSpots,
      notes: buyerProfiles.notes,
      broker: {
        id: users.id,
        name: users.name,
        creci: users.creci,
        whatsapp: users.whatsapp,
      },
    })
    .from(buyerProfiles)
    .innerJoin(users, eq(buyerProfiles.brokerId, users.id));

  const partnershipList = await db
    .select()
    .from(partnerships)
    .orderBy(desc(partnerships.createdAt));

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  const allTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      description: transactions.description,
      createdAt: transactions.createdAt,
      userName: users.name,
      userCreci: users.creci,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.userId, users.id))
    .orderBy(desc(transactions.createdAt));

  return {
    properties: propertyList,
    radarList,
    partnershipList,
    users: allUsers,
    transactions: allTransactions,
  };
}

export async function updateUserStatus(userId: string, newStatus: string) {
  await db
    .update(users)
    .set({
      verificationStatus: newStatus,
      isVerified: newStatus === "aprovado",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/");
  return { success: true };
}

export async function createProperty(formData: {
  title: string;
  propertyType: string;
  salePrice: string;
  condoFee?: string;
  iptu?: string;
  city: string;
  neighborhood: string;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  areaM2: string;
  description: string;
  photos: string[];
  confidentialAddress: string;
  ownerName: string;
  ownerPhone: string;
  acceptsPartnership: boolean;
  splitPercentage: string;
}) {
  const allBrokers = await db.select().from(users).limit(1);
  const brokerId = allBrokers[0]?.id;

  if (!brokerId) throw new Error("Nenhum corretor encontrado");

  await db.insert(properties).values({
    brokerId,
    title: formData.title,
    propertyType: formData.propertyType,
    salePrice: formData.salePrice,
    condoFee: formData.condoFee || "0",
    iptu: formData.iptu || "0",
    city: formData.city,
    neighborhood: formData.neighborhood,
    bedrooms: formData.bedrooms,
    suites: formData.suites,
    bathrooms: formData.bathrooms,
    parkingSpots: formData.parkingSpots,
    areaM2: formData.areaM2,
    description: formData.description,
    photos: formData.photos.length > 0 ? formData.photos : [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80"
    ],
    confidentialAddress: formData.confidentialAddress,
    ownerName: formData.ownerName,
    ownerPhone: formData.ownerPhone,
    acceptsPartnership: formData.acceptsPartnership,
    splitPercentage: formData.splitPercentage,
    status: "disponivel",
  });

  revalidatePath("/");
  return { success: true };
}

export async function validateCreciWithAI(creci: string, state: string, name?: string) {
  const cleanCreci = creci.trim().toUpperCase();
  const creciRegex = /^[0-9]{3,7}-?[FJ]?$/i;

  if (!creciRegex.test(cleanCreci)) {
    return {
      isValid: false,
      message: "Formato de CRECI inválido. Utilize o número seguido de -F (físico) ou -J (jurídico).",
    };
  }

  // Simula o tempo de consulta do crawler/IA no portal público
  await new Promise((r) => setTimeout(r, 900));

  // Simula bloqueio de exemplo se o CRECI for suspenso
  if (cleanCreci.includes("174921")) {
    return {
      isValid: false,
      status: "SUSPENSO / BLOQUEADO",
      council: `CRECI-${state.toUpperCase()}`,
      message: "Inscrição suspensa perante o Conselho Regional de Corretores de Imóveis por pendências ético-disciplinares.",
    };
  }

  const isJuridica = cleanCreci.endsWith("J");

  return {
    isValid: true,
    status: "REGULAR / ATIVO",
    council: `CRECI-${state.toUpperCase()} (${state === "SP" ? "2ª Região" : state === "RJ" ? "1ª Região" : "Regional"})`,
    type: isJuridica ? "Pessoa Jurídica (Imobiliária)" : "Pessoa Física (Corretor Autônomo)",
    verifiedAt: new Date().toISOString(),
    message: `Inscrição confirmada como ATIVA e REGULAR perante o Conselho Regional de Corretores de Imóveis.`,
  };
}

export async function registerUserWithPix(userData: {
  name: string;
  email: string;
  whatsapp: string;
  creci: string;
  state: string;
  city: string;
  plan: string;
  monthlyFee: string;
}) {
  const [newUser] = await db
    .insert(users)
    .values({
      name: userData.name,
      email: userData.email,
      whatsapp: userData.whatsapp,
      creci: userData.creci,
      state: userData.state,
      city: userData.city,
      isVerified: true,
      verificationStatus: "aprovado",
      plan: userData.plan,
      subscriptionStatus: "ativo",
      monthlyFee: userData.monthlyFee,
      trustScore: 100,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  await db.insert(transactions).values({
    userId: newUser.id,
    amount: userData.monthlyFee,
    type: userData.plan === "imobiliaria" ? "mensalidade_imobiliaria" : "mensalidade_pro",
    paymentMethod: "pix",
    status: "pago",
    description: `Assinatura Plano ${userData.plan.toUpperCase()} via Pix Itaú`,
  });

  revalidatePath("/");
  return { success: true, user: newUser };
}
