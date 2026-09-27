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
import { eq, desc, and, lte, gte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "negocialar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret() {
  const secret = process.env.NEGOCIAR_LAR_SESSION_SECRET;
  if (secret && secret.length < 32) {
    throw new Error("NEGOCIAR_LAR_SESSION_SECRET deve ter pelo menos 32 caracteres.");
  }
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEGOCIAR_LAR_SESSION_SECRET precisa estar configurado em produção.");
  }
  return "negociar-lar-local-development-secret-change-before-deploy";
}

function signUserId(userId: string, expiresAt: number) {
  return crypto.createHmac("sha256", sessionSecret()).update(`${userId}.${expiresAt}`).digest("hex");
}

async function setBrokerSession(userId: string) {
  const cookieStore = cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  cookieStore.set(SESSION_COOKIE, `${userId}.${expiresAt}.${signUserId(userId, expiresAt)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

function hashPassword(password: string) {
  if (password.length < 12 || password.length > 200) {
    throw new Error("A senha precisa ter entre 12 e 200 caracteres.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, expectedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function requireCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Faça login para continuar.");
  const [user] = await db.select({ id: users.id, role: users.role, verificationStatus: users.verificationStatus, subscriptionStatus: users.subscriptionStatus }).from(users).where(eq(users.id, id)).limit(1);
  if (!user || user.verificationStatus === "suspenso") throw new Error("A conta não está autorizada.");
  return user;
}

function requireActiveBroker(actor: Awaited<ReturnType<typeof requireCurrentUser>>) {
  if (actor.verificationStatus !== "aprovado") throw new Error("Seu cadastro ainda aguarda verificação.");
  if (actor.subscriptionStatus !== "ativo") throw new Error("Ative sua assinatura para usar esta função.");
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [userId, expiresAtText, signature, ...extra] = value.split(".");
  if (!userId || !expiresAtText || !signature || extra.length) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = signUserId(userId, expiresAt);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return userId;
}

export async function getMarketplaceData() {
  try {
    const currentUserId = await getCurrentUserId();
    const [currentUser] = currentUserId
      ? await db.select({
          id: users.id, name: users.name, email: users.email, creci: users.creci,
          whatsapp: users.whatsapp, avatarUrl: users.avatarUrl, city: users.city,
          state: users.state, isVerified: users.isVerified,
          verificationStatus: users.verificationStatus, plan: users.plan,
          subscriptionStatus: users.subscriptionStatus, monthlyFee: users.monthlyFee,
          role: users.role, trustScore: users.trustScore,
          successfulDeals: users.successfulDeals, bypassReports: users.bypassReports,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.id, currentUserId)).limit(1)
      : [];
    const isAdmin = currentUser?.role === "admin";
    const emptySessionId = "00000000-0000-0000-0000-000000000000";
    const ownsProperty = sql<boolean>`${properties.brokerId} = ${currentUser?.id ?? emptySessionId}`;
    const ownsProfile = sql<boolean>`${buyerProfiles.brokerId} = ${currentUser?.id ?? emptySessionId}`;

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
        purpose: properties.purpose,
        acceptsTrade: properties.acceptsTrade,
        tradeDetails: properties.tradeDetails,
        condition: properties.condition,
        hotelRoomsCount: properties.hotelRoomsCount,
        usefulAreaM2: properties.usefulAreaM2,
        totalAreaM2: properties.totalAreaM2,
        solarPosition: properties.solarPosition,
        viewType: properties.viewType,
        propertyAge: properties.propertyAge,
        iptuPeriod: properties.iptuPeriod,
        documentationStatus: properties.documentationStatus,
        acceptsFinancing: properties.acceptsFinancing,
        privateAmenities: properties.privateAmenities,
        condoAmenities: properties.condoAmenities,
        garageType: properties.garageType,
        cep: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.cep} ELSE NULL END`,
        street: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.street} ELSE NULL END`,
        streetNumber: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.streetNumber} ELSE NULL END`,
        block: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.block} ELSE NULL END`,
        floor: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.floor} ELSE NULL END`,
        condoName: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.condoName} ELSE NULL END`,
        hideStreet: properties.hideStreet,
        videoUrl: properties.videoUrl,
        coverPhoto: properties.coverPhoto,
        floorPlanPhotos: properties.floorPlanPhotos,
        acceptsPartnership: properties.acceptsPartnership,
        splitPercentage: properties.splitPercentage,
        status: properties.status,
        confidentialAddress: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.confidentialAddress} ELSE NULL END`,
        ownerName: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.ownerName} ELSE NULL END`,
        ownerPhone: sql<string | null>`CASE WHEN ${ownsProperty} THEN ${properties.ownerPhone} ELSE NULL END`,
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

    const radarScope = currentUser?.verificationStatus === "aprovado"
      ? eq(buyerProfiles.active, true)
      : currentUser
        ? and(eq(buyerProfiles.active, true), eq(buyerProfiles.brokerId, currentUser.id))
        : eq(buyerProfiles.id, "00000000-0000-0000-0000-000000000000");
    const radarList = await db
      .select({
        id: buyerProfiles.id,
        clientInternalName: sql<string>`CASE WHEN ${ownsProfile} THEN ${buyerProfiles.clientInternalName} ELSE 'Cliente parceiro' END`,
        propertyType: buyerProfiles.propertyType,
        city: buyerProfiles.city,
        neighborhoods: buyerProfiles.neighborhoods,
        maxBudget: buyerProfiles.maxBudget,
        minBedrooms: buyerProfiles.minBedrooms,
        minParkingSpots: buyerProfiles.minParkingSpots,
        notes: sql<string | null>`CASE WHEN ${ownsProfile} THEN ${buyerProfiles.notes} ELSE NULL END`,
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
      .where(radarScope)
      .orderBy(desc(buyerProfiles.createdAt));

    const allUsers = await db
      .select({
        id: users.id, name: users.name, email: users.email, creci: users.creci,
        whatsapp: users.whatsapp, avatarUrl: users.avatarUrl, city: users.city,
        state: users.state, isVerified: users.isVerified,
        verificationStatus: users.verificationStatus, plan: users.plan,
        subscriptionStatus: users.subscriptionStatus, monthlyFee: users.monthlyFee,
        role: users.role, trustScore: users.trustScore,
        successfulDeals: users.successfulDeals, bypassReports: users.bypassReports,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isAdmin ? undefined : currentUser ? eq(users.id, currentUser.id) : eq(users.id, "00000000-0000-0000-0000-000000000000"))
      .orderBy(desc(users.createdAt));

    const allTransactions = isAdmin ? await db
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
      .orderBy(desc(transactions.createdAt)) : [];

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
    const dvpList = currentUser ? await db
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
        status: sql<string>`'rascunho'`,
        createdAt: dvpCertificates.createdAt,
      })
      .from(dvpCertificates)
      .where(isAdmin ? undefined : or(eq(dvpCertificates.captorBrokerId, currentUser.id), eq(dvpCertificates.partnerBrokerId, currentUser.id)))
      .orderBy(desc(dvpCertificates.createdAt))
      : [];

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
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new Error("Ação restrita à administração.");
  if (!["pendente", "aprovado", "suspenso"].includes(newStatus)) throw new Error("Status inválido.");
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
  splitPercentage: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const targetBrokerId = actor.id;

  const [newProperty] = await db
    .insert(properties)
    .values({
      brokerId: targetBrokerId,
      title: formData.title,
      propertyType: formData.propertyType,
      salePrice: formData.salePrice,
      purpose: formData.purpose || "venda",
      acceptsTrade: formData.acceptsTrade ?? false,
      tradeDetails: formData.tradeDetails || null,
      condition: formData.condition || "usado",
      hotelRoomsCount: formData.hotelRoomsCount || null,
      condoFee: formData.condoFee || "0",
      iptu: formData.iptu || "0",
      iptuPeriod: formData.iptuPeriod || "anual",
      city: formData.city,
      state: formData.state || "SP",
      neighborhood: formData.neighborhood,
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
      garageType: formData.garageType || "coberta",
      areaM2: formData.areaM2,
      usefulAreaM2: formData.usefulAreaM2 || null,
      totalAreaM2: formData.totalAreaM2 || null,
      solarPosition: formData.solarPosition || null,
      viewType: formData.viewType || null,
      propertyAge: formData.propertyAge || null,
      documentationStatus: formData.documentationStatus || null,
      acceptsFinancing: formData.acceptsFinancing ?? true,
      privateAmenities: formData.privateAmenities || [],
      condoAmenities: formData.condoAmenities || [],
      description: formData.description,
      videoUrl: formData.videoUrl || null,
      coverPhoto: formData.coverPhoto || null,
      photos:
        formData.photos && formData.photos.length > 0
          ? formData.photos
          : [
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
            ],
      floorPlanPhotos: formData.floorPlanPhotos || [],
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
        propertyType: buyerProfiles.propertyType,
        neighborhoods: buyerProfiles.neighborhoods,
        maxBudget: buyerProfiles.maxBudget,
        minBedrooms: buyerProfiles.minBedrooms,
        minParkingSpots: buyerProfiles.minParkingSpots,
      })
      .from(buyerProfiles)
      .where(
        and(
          eq(buyerProfiles.active, true),
          eq(buyerProfiles.city, formData.city)
        )
      );

    const actualMatches = matchingProfiles.filter((bp) => {
      const maxBudget = Number(bp.maxBudget);
      const price = Number(formData.salePrice);
      const neighborhoods = Array.isArray(bp.neighborhoods) ? bp.neighborhoods as string[] : [];
      return bp.propertyType === formData.propertyType
        && (!neighborhoods.length || neighborhoods.includes(formData.neighborhood))
        && (!Number.isFinite(maxBudget) || maxBudget <= 0 || price <= maxBudget)
        && formData.bedrooms >= bp.minBedrooms
        && formData.parkingSpots >= bp.minParkingSpots;
    });
    for (const bp of actualMatches) {
      if (bp.brokerId !== targetBrokerId) {
        await db.insert(notifications).values({
          userId: bp.brokerId,
          title: `🤖 Match no Radar: Imóvel em ${formData.neighborhood}`,
          message: "Um imóvel compatível com os critérios do seu cliente foi cadastrado na rede.",
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
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
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
          eq(properties.acceptsPartnership, true),
          lte(properties.salePrice, profileData.maxBudget),
          gte(properties.bedrooms, profileData.minBedrooms),
          gte(properties.parkingSpots, profileData.minParkingSpots),
        )
      )
      .limit(3);

    if (matchingProps.length > 0) {
      await db.insert(notifications).values({
        userId: targetBrokerId,
        title: `🤖 ${matchingProps.length} Imóveis Encontrados para "${profileData.clientInternalName}"`,
        message: "Localizamos imóveis que atendem a alguns critérios cadastrados. Confirme os detalhes e as condições de parceria com o captador.",
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
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (data.partnerBrokerId !== actor.id) throw new Error("O corretor parceiro deve ser o usuário conectado.");
  const [property] = await db.select({ brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership }).from(properties).where(eq(properties.id, data.propertyId)).limit(1);
  if (!property || property.brokerId !== data.captorBrokerId || !property.acceptsPartnership || property.brokerId === actor.id) {
    throw new Error("Imóvel ou parceria inválidos para este registro.");
  }
  if (data.clientName.trim().length < 2 || !/^\*{3}\.\d{3}\.\d{3}-\*\*$/.test(data.clientCpfPartial.trim())) {
    throw new Error("Informe o nome do cliente e apenas o CPF parcialmente mascarado.");
  }
  const rawHashString = `${data.propertyId}-${data.captorBrokerId}-${data.partnerBrokerId}-${data.clientName}-${data.clientCpfPartial}-${Date.now()}`;
  const certificateHash = crypto
    .createHash("sha256")
    .update(rawHashString)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const visitDate = new Date(data.visitDate);
  if (!Number.isFinite(visitDate.getTime())) throw new Error("Informe uma data de visita válida.");
  const lockExpirationDate = new Date(visitDate.getTime() + 180 * 24 * 60 * 60 * 1000);

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
      status: "rascunho",
      legalClausesAccepted: false,
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
    notes: `Registro interno de visita ${dvp.certificateHash}. Requer validação e aceite das partes antes de qualquer efeito contratual.`,
  });

  // Notifica o corretor captador no sininho
  await db.insert(notifications).values({
    userId: data.captorBrokerId,
    title: "Novo registro de visita em rascunho",
    message: `Foi criado o registro ${dvp.certificateHash}. Ele ainda depende da validação e do aceite das partes.`,
    type: "dvp",
    propertyId: data.propertyId,
    read: false,
  });

  revalidatePath("/");
  return { success: true, certificate: dvp };
}

export async function markNotificationAsRead(notificationId: string) {
  const actor = await requireCurrentUser();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.id)));

  revalidatePath("/");
  return { success: true };
}

export async function validateCreciWithAI(creci: string, state: string, _name?: string) {
  const cleanCreci = creci.trim().toUpperCase();
  const creciRegex = /^[0-9]{3,7}-?[FJ]?$/i;

  if (!creciRegex.test(cleanCreci)) {
    return {
      isValid: false,
      message: "Formato de CRECI inválido. Utilize o número seguido de -F (físico) ou -J (jurídico).",
    };
  }

  const isJuridica = cleanCreci.endsWith("J");

  return {
    isValid: true,
    status: "PENDENTE DE VERIFICAÇÃO",
    council: `CRECI-${state.toUpperCase()}`,
    type: isJuridica ? "Pessoa Jurídica (Imobiliária)" : "Pessoa Física (Corretor Autônomo)",
    message: "O formato parece válido. A situação do registro ainda precisa ser conferida no conselho; seu cadastro ficará pendente até lá.",
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
  billingCycle: "monthly" | "annual";
  password: string;
}) {
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanCreci = userData.creci.trim().toUpperCase();
  const prices: Record<string, { monthly: string; annual: string }> = {
    "10": { monthly: "59.90", annual: "49.90" },
    "20": { monthly: "89.90", annual: "74.90" },
    "40": { monthly: "150.00", annual: "125.00" },
  };
  const selectedPlan = prices[userData.plan];
  if (!selectedPlan) throw new Error("Plano inválido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("E-mail inválido.");
  if (userData.name.trim().length < 2 || userData.city.trim().length < 2 || !/^[A-Z]{2}$/.test(userData.state.toUpperCase())) throw new Error("Confira nome, cidade e estado.");
  if (!/^[0-9]{3,7}-?[FJ]?$/.test(cleanCreci)) throw new Error("Informe um CRECI no formato numérico aceito.");
  const monthlyFee = selectedPlan[userData.billingCycle];
  const amountDue = userData.billingCycle === "annual"
    ? (Number(monthlyFee) * 12).toFixed(2)
    : monthlyFee;
  const passwordHash = hashPassword(userData.password);

  const [newUser] = await db
    .insert(users)
    .values({
      name: userData.name,
      email: cleanEmail,
      whatsapp: userData.whatsapp,
      creci: cleanCreci,
      state: userData.state.toUpperCase(),
      city: userData.city,
      passwordHash,
      role: "corretor",
      isVerified: false,
      verificationStatus: "pendente",
      plan: userData.plan,
      subscriptionStatus: "pendente",
      monthlyFee,
      trustScore: 0,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  await db.insert(transactions).values({
    userId: newUser.id,
    amount: amountDue,
    type: userData.plan === "imobiliaria" ? "mensalidade_imobiliaria" : "mensalidade_pro",
    paymentMethod: "pix",
    status: "pendente",
    description: `Plano ${userData.plan} (${userData.billingCycle}) — pagamento aguardando configuração do gateway`,
  });

  // Notificação de boas-vindas do sistema
  await db.insert(notifications).values({
    userId: newUser.id,
    title: `🎉 Bem-vindo ao Negocia Lar!`,
    message: "Recebemos seu cadastro. O acesso e a assinatura ficam pendentes até validação do CRECI e confirmação de pagamento.",
    type: "sistema",
    read: false,
  });

  // Salva a sessão do corretor
  await setBrokerSession(newUser.id);

  revalidatePath("/");
  const { passwordHash: _passwordHash, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export async function loginUser(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("E-mail ou senha incorretos.");
  if (user.verificationStatus === "suspenso") throw new Error("Esta conta está suspensa.");
  await setBrokerSession(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  revalidatePath("/");
  return { success: true, user: safeUser };
}

export async function logoutUser() {
  cookies().delete(SESSION_COOKIE);
  revalidatePath("/");
  return { success: true };
}
