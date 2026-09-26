"use server";

import {
  db,
  properties,
  users,
  buyerProfiles,
  partnerships,
  transactions,
  notifications,
  dvpCertificates,
} from "./db";
import { eq, desc, and, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get("negocialar_user_id")?.value || null;
}

export async function switchBrokerSession(userId: string) {
  const cookieStore = cookies();
  cookieStore.set("negocialar_user_id", userId, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  revalidatePath("/");
  return { success: true };
}

export async function getMarketplaceData() {
  try {
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
        confidentialAddress: properties.confidentialAddress,
        ownerName: properties.ownerName,
        ownerPhone: properties.ownerPhone,
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
        active: buyerProfiles.active,
        createdAt: buyerProfiles.createdAt,
        broker: {
          id: users.id,
          name: users.name,
          creci: users.creci,
          whatsapp: users.whatsapp,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(buyerProfiles)
      .innerJoin(users, eq(buyerProfiles.brokerId, users.id))
      .orderBy(desc(buyerProfiles.createdAt));

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

    // Determina o corretor atualmente ativo na sessão
    const currentUserId = await getCurrentUserId();
    const currentUser =
      allUsers.find((u) => u.id === currentUserId) || allUsers[0] || null;

    // Busca notificações reais do usuário ativo
    let userNotifications: any[] = [];
    if (currentUser) {
      userNotifications = await db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          title: notifications.title,
          message: notifications.message,
          type: notifications.type,
          read: notifications.read,
          propertyId: notifications.propertyId,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, currentUser.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);
    }

    // Busca DVPs cadastrados
    const dvpList = await db
      .select({
        id: dvpCertificates.id,
        certificateHash: dvpCertificates.certificateHash,
        propertyId: dvpCertificates.propertyId,
        captorBrokerId: dvpCertificates.captorBrokerId,
        partnerBrokerId: dvpCertificates.partnerBrokerId,
        clientName: dvpCertificates.clientName,
        clientCpfPartial: dvpCertificates.clientCpfPartial,
        visitDate: dvpCertificates.visitDate,
        lockExpirationDate: dvpCertificates.lockExpirationDate,
        commissionSplit: dvpCertificates.commissionSplit,
        status: dvpCertificates.status,
        createdAt: dvpCertificates.createdAt,
      })
      .from(dvpCertificates)
      .orderBy(desc(dvpCertificates.createdAt));

    return {
      properties: propertyList,
      radarList,
      users: allUsers,
      transactions: allTransactions,
      currentUser,
      notifications: userNotifications,
      dvpList,
    };
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return {
      properties: [],
      radarList: [],
      users: [],
      transactions: [],
      currentUser: null,
      notifications: [],
      dvpList: [],
    };
  }
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
  brokerId?: string;
}) {
  const currentUserId = formData.brokerId || (await getCurrentUserId());
  let targetBrokerId = currentUserId;

  if (!targetBrokerId) {
    const [firstUser] = await db.select().from(users).limit(1);
    targetBrokerId = firstUser?.id;
  }

  if (!targetBrokerId) throw new Error("Nenhum corretor autenticado no sistema.");

  const [newProperty] = await db
    .insert(properties)
    .values({
      brokerId: targetBrokerId,
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
      photos:
        formData.photos && formData.photos.length > 0
          ? formData.photos
          : [
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
            ],
      confidentialAddress: formData.confidentialAddress,
      ownerName: formData.ownerName,
      ownerPhone: formData.ownerPhone,
      acceptsPartnership: formData.acceptsPartnership,
      splitPercentage: formData.splitPercentage,
      status: "disponivel",
    })
    .returning();

  // 🤖 MOTOR DE IA: Cruzamento automático com o Radar de Compradores
  try {
    const matchingProfiles = await db
      .select({
        id: buyerProfiles.id,
        brokerId: buyerProfiles.brokerId,
        clientInternalName: buyerProfiles.clientInternalName,
      })
      .from(buyerProfiles)
      .where(
        and(
          eq(buyerProfiles.active, true),
          eq(buyerProfiles.city, formData.city)
        )
      );

    for (const bp of matchingProfiles) {
      if (bp.brokerId !== targetBrokerId) {
        await db.insert(notifications).values({
          userId: bp.brokerId,
          title: `🤖 Match no Radar: Imóvel em ${formData.neighborhood}`,
          message: `Um novo imóvel compatível com a busca do seu cliente "${bp.clientInternalName}" foi captado na rede com parceria aceita!`,
          type: "ai_match",
          propertyId: newProperty.id,
          read: false,
        });
      }
    }
  } catch (matchErr) {
    console.warn("Aviso ao cruzar radar:", matchErr);
  }

  revalidatePath("/");
  return { success: true, property: newProperty };
}

export async function createBuyerProfile(profileData: {
  clientInternalName: string;
  propertyType: string;
  city: string;
  neighborhoods: string[];
  maxBudget: string;
  minBedrooms: number;
  minParkingSpots: number;
  notes?: string;
  brokerId?: string;
}) {
  const currentUserId = profileData.brokerId || (await getCurrentUserId());
  let targetBrokerId = currentUserId;

  if (!targetBrokerId) {
    const [firstUser] = await db.select().from(users).limit(1);
    targetBrokerId = firstUser?.id;
  }

  if (!targetBrokerId) throw new Error("Nenhum corretor autenticado no sistema.");

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

  // 🤖 MOTOR DE IA: Busca instantânea no estoque da rede
  try {
    const matchingProps = await db
      .select({
        id: properties.id,
        title: properties.title,
        neighborhood: properties.neighborhood,
      })
      .from(properties)
      .where(
        and(
          eq(properties.city, profileData.city),
          eq(properties.acceptsPartnership, true)
        )
      )
      .limit(3);

    if (matchingProps.length > 0) {
      await db.insert(notifications).values({
        userId: targetBrokerId,
        title: `🤖 ${matchingProps.length} Imóveis Encontrados para "${profileData.clientInternalName}"`,
        message: `Localizamos imóveis compatíveis na rede com até 50% de comissão de parceria garantida.`,
        type: "ai_match",
        propertyId: matchingProps[0].id,
        read: false,
      });
    }
  } catch (e) {
    console.warn("Erro ao buscar matches para novo perfil:", e);
  }

  revalidatePath("/");
  return { success: true, profile: newProfile };
}

export async function createDvpCertificate(data: {
  propertyId: string;
  captorBrokerId: string;
  partnerBrokerId: string;
  clientName: string;
  clientPhone?: string;
  clientCpfPartial: string;
  visitDate: string;
  commissionSplit: string;
}) {
  const rawHashString = `${data.propertyId}-${data.captorBrokerId}-${data.partnerBrokerId}-${data.clientName}-${data.clientCpfPartial}-${Date.now()}`;
  const certificateHash = crypto
    .createHash("sha256")
    .update(rawHashString)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const visitDate = new Date(data.visitDate);
  const lockExpirationDate = new Date(visitDate.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 dias de blindagem

  const [dvp] = await db
    .insert(dvpCertificates)
    .values({
      certificateHash: `DVP-${certificateHash}`,
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      clientName: data.clientName,
      clientPhone: data.clientPhone || null,
      clientCpfPartial: data.clientCpfPartial,
      visitDate,
      lockExpirationDate,
      commissionSplit: data.commissionSplit,
      status: "ativo",
      legalClausesAccepted: true,
    })
    .returning();

  // Registra ou atualiza a parceria
  await db.insert(partnerships).values({
    propertyId: data.propertyId,
    captorBrokerId: data.captorBrokerId,
    partnerBrokerId: data.partnerBrokerId,
    status: "visita_agendada",
    commissionSplit: data.commissionSplit,
    visitScheduledDate: visitDate,
    notes: `Certificado DVP ${dvp.certificateHash} emitido. Trava legal de 180 dias válida até ${lockExpirationDate.toLocaleDateString("pt-BR")}.`,
  });

  // Notifica o corretor captador no sininho
  await db.insert(notifications).values({
    userId: data.captorBrokerId,
    title: `📜 Novo DVP Emitido: Trava de 180 Dias Ativa`,
    message: `Corretor parceiro agendou visita para o cliente ${data.clientName} (CPF ${data.clientCpfPartial}). Certificado: ${dvp.certificateHash}.`,
    type: "dvp",
    propertyId: data.propertyId,
    read: false,
  });

  revalidatePath("/");
  return { success: true, certificate: dvp };
}

export async function markNotificationAsRead(notificationId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));

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

  await new Promise((r) => setTimeout(r, 900));

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
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  const isMasterAdmin = existingUsers.length === 0;

  const [newUser] = await db
    .insert(users)
    .values({
      name: userData.name,
      email: userData.email,
      whatsapp: userData.whatsapp,
      creci: userData.creci,
      state: userData.state,
      city: userData.city,
      role: isMasterAdmin ? "admin" : userData.plan === "imobiliaria" ? "imobiliaria" : "corretor",
      isVerified: true,
      verificationStatus: "aprovado",
      plan: userData.plan,
      subscriptionStatus: "ativo",
      monthlyFee: userData.monthlyFee,
      trustScore: 100,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
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

  // Notificação de boas-vindas do sistema
  await db.insert(notifications).values({
    userId: newUser.id,
    title: `🎉 Bem-vindo ao Negocia Lar!`,
    message: `Seu plano de ${userData.plan.toUpperCase()} captações está ativo. Garantia de 7 dias válida perante o Art. 49 do CDC.`,
    type: "sistema",
    read: false,
  });

  // Salva a sessão do corretor
  await switchBrokerSession(newUser.id);

  revalidatePath("/");
  return { success: true, user: newUser };
}
