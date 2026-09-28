"use server";

import {
  db,
  properties,
  users,
  buyerProfiles,
  leads,
  leadActivities,
  partnerships,
  partnershipActivities,
  transactions,
  notifications,
  dvpCertificates,
  authLoginAttempts,
} from "./db";
import { eq, desc, and, lte, gte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

const LEAD_STAGES = ["novo", "contato", "qualificado", "visita", "proposta", "negociacao", "fechado", "perdido"] as const;
const LEAD_ACTIVITY_TYPES = ["ligacao", "mensagem", "visita", "proposta", "nota"] as const;
const partnershipCaptor = alias(users, "partnership_captor");
const partnershipPartner = alias(users, "partnership_partner");

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function parseLeadDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Informe uma data válida para o próximo retorno.");
  return date;
}

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
        leadId: dvpCertificates.leadId,
        clientName: dvpCertificates.clientName,
        clientCpfPartial: dvpCertificates.clientCpfPartial,
        visitDate: dvpCertificates.visitDate,
        lockExpirationDate: dvpCertificates.lockExpirationDate,
        commissionSplit: dvpCertificates.commissionSplit,
        commissionModel: dvpCertificates.commissionModel,
        captorCommissionPercent: dvpCertificates.captorCommissionPercent,
        partnerCommissionPercent: dvpCertificates.partnerCommissionPercent,
        referrerCommissionPercent: dvpCertificates.referrerCommissionPercent,
        externalReferrerName: dvpCertificates.externalReferrerName,
        externalReferrerCreci: dvpCertificates.externalReferrerCreci,
        externalReferrerWhatsapp: dvpCertificates.externalReferrerWhatsapp,
        status: sql<string>`'rascunho'`,
        createdAt: dvpCertificates.createdAt,
      })
      .from(dvpCertificates)
      .where(isAdmin ? undefined : or(eq(dvpCertificates.captorBrokerId, currentUser.id), eq(dvpCertificates.partnerBrokerId, currentUser.id)))
      .orderBy(desc(dvpCertificates.createdAt))
      : [];

    const partnershipList = currentUser ? await db
      .select({
        id: partnerships.id,
        propertyId: partnerships.propertyId,
        propertyTitle: properties.title,
        captorBrokerId: partnerships.captorBrokerId,
        captorName: partnershipCaptor.name,
        partnerBrokerId: partnerships.partnerBrokerId,
        partnerName: partnershipPartner.name,
        status: partnerships.status,
        commissionSplit: partnerships.commissionSplit,
        captorAcceptedAt: partnerships.captorAcceptedAt,
        partnerAcceptedAt: partnerships.partnerAcceptedAt,
        commissionModel: partnerships.commissionModel,
        captorCommissionPercent: partnerships.captorCommissionPercent,
        partnerCommissionPercent: partnerships.partnerCommissionPercent,
        referrerCommissionPercent: partnerships.referrerCommissionPercent,
        externalReferrerName: partnerships.externalReferrerName,
        externalReferrerCreci: partnerships.externalReferrerCreci,
        externalReferrerWhatsapp: partnerships.externalReferrerWhatsapp,
        visitScheduledDate: partnerships.visitScheduledDate,
        notes: partnerships.notes,
        createdAt: partnerships.createdAt,
        updatedAt: partnerships.updatedAt,
      })
      .from(partnerships)
      .innerJoin(properties, eq(partnerships.propertyId, properties.id))
      .innerJoin(partnershipCaptor, eq(partnerships.captorBrokerId, partnershipCaptor.id))
      .innerJoin(partnershipPartner, eq(partnerships.partnerBrokerId, partnershipPartner.id))
      .where(isAdmin ? undefined : or(eq(partnerships.captorBrokerId, currentUser.id), eq(partnerships.partnerBrokerId, currentUser.id)))
      .orderBy(desc(partnerships.updatedAt))
      .limit(200)
      : [];

    const partnershipActivityList = currentUser && partnershipList.length ? await db
      .select({
        id: partnershipActivities.id,
        partnershipId: partnershipActivities.partnershipId,
        actorUserId: partnershipActivities.actorUserId,
        actorName: users.name,
        previousStatus: partnershipActivities.previousStatus,
        newStatus: partnershipActivities.newStatus,
        note: partnershipActivities.note,
        createdAt: partnershipActivities.createdAt,
      })
      .from(partnershipActivities)
      .innerJoin(users, eq(partnershipActivities.actorUserId, users.id))
      .where(or(...partnershipList.map((partnership) => eq(partnershipActivities.partnershipId, partnership.id))))
      .orderBy(desc(partnershipActivities.createdAt))
      .limit(500)
      : [];

    const leadList = currentUser ? await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        phone: leads.phone,
        email: leads.email,
        leadType: leads.leadType,
        stage: leads.stage,
        source: leads.source,
        propertyType: leads.propertyType,
        city: leads.city,
        neighborhoods: leads.neighborhoods,
        maxBudget: leads.maxBudget,
        minBedrooms: leads.minBedrooms,
        notes: leads.notes,
        nextAction: leads.nextAction,
        nextActionAt: leads.nextActionAt,
        lastContactAt: leads.lastContactAt,
        lostReason: leads.lostReason,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(eq(leads.ownerUserId, currentUser.id))
      .orderBy(desc(leads.updatedAt))
      : [];

    const leadActivityList = currentUser ? await db
      .select({
        id: leadActivities.id,
        leadId: leadActivities.leadId,
        userId: leadActivities.userId,
        activityType: leadActivities.activityType,
        description: leadActivities.description,
        occurredAt: leadActivities.occurredAt,
      })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .where(eq(leads.ownerUserId, currentUser.id))
      .orderBy(desc(leadActivities.occurredAt))
      .limit(500)
      : [];

    return {
      properties: propertyList,
      radarList,
      users: allUsers,
      transactions: allTransactions,
      currentUser,
      notifications: userNotifications,
      dvpList,
      partnerships: partnershipList,
      partnershipActivities: partnershipActivityList,
      leads: leadList,
      leadActivities: leadActivityList,
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
      partnerships: [],
      partnershipActivities: [],
      leads: [],
      leadActivities: [],
    };
  }
}

export async function createLead(data: {
  fullName: string;
  phone: string;
  email?: string;
  leadType: string;
  source: string;
  propertyType?: string;
  city?: string;
  neighborhoods?: string[];
  maxBudget?: string;
  minBedrooms?: number;
  notes?: string;
  nextAction?: string;
  nextActionAt?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome do lead.");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error("Informe um telefone válido com DDD.");
  if (!(["comprador", "proprietario", "locatario", "parceiro"] as string[]).includes(data.leadType)) throw new Error("Tipo de lead inválido.");
  if (!(["indicacao", "whatsapp", "portal", "site", "ligacao", "rede_social", "outro"] as string[]).includes(data.source)) throw new Error("Origem do lead inválida.");
  const email = data.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  const maxBudget = data.maxBudget?.trim() || null;
  if (maxBudget && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0)) throw new Error("O orçamento deve ser maior que zero.");
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 3000) throw new Error("As observações devem ter até 3.000 caracteres.");

  try {
    const result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(leads).values({
        ownerUserId: actor.id,
        fullName,
        phone,
        normalizedPhone,
        email,
        leadType: data.leadType,
        source: data.source,
        propertyType: data.propertyType?.trim() || null,
        city: data.city?.trim() || null,
        neighborhoods: (data.neighborhoods || []).map((value) => value.trim()).filter(Boolean).slice(0, 20),
        maxBudget,
        minBedrooms: Number.isInteger(data.minBedrooms) && Number(data.minBedrooms) > 0 ? Number(data.minBedrooms) : null,
        notes,
        nextAction: data.nextAction?.trim() || null,
        nextActionAt,
        stage: "novo",
        updatedAt: new Date(),
      }).returning();
      const [activity] = await tx.insert(leadActivities).values({
        leadId: created.id,
        userId: actor.id,
        activityType: "cadastro",
        description: "Lead cadastrado no CRM.",
      }).returning();
      return { lead: created, activity };
    });
    revalidatePath("/");
    return { success: true, ...result };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("Já existe um lead com este telefone na sua carteira.");
    throw error;
  }
}

export async function importLeadsCsv(rows: Array<{
  fullName: string; phone: string; email?: string; leadType?: string; source?: string;
  propertyType?: string; city?: string; neighborhoods?: string; maxBudget?: string;
  minBedrooms?: string; notes?: string;
}>) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) {
    throw new Error("Importe de 1 a 100 contatos por arquivo.");
  }
  const typeMap: Record<string, string> = { comprador: "comprador", proprietario: "proprietario", "proprietário": "proprietario", "proprietario / vendedor": "proprietario", "proprietário / vendedor": "proprietario", locatario: "locatario", "locatário": "locatario", parceiro: "parceiro", "corretor parceiro": "parceiro" };
  const sourceMap: Record<string, string> = { indicacao: "indicacao", "indicação": "indicacao", whatsapp: "whatsapp", portal: "portal", "portal imobiliario": "portal", "portal imobiliário": "portal", site: "site", ligacao: "ligacao", "ligação": "ligacao", "rede social": "rede_social", rede_social: "rede_social", outro: "outro" };
  const seen = new Set<string>();
  const cleaned = rows.map((row, index) => {
    const fullName = String(row.fullName || "").trim();
    const phone = String(row.phone || "").trim();
    const normalizedPhone = normalizePhone(phone);
    const line = index + 2;
    if (fullName.length < 2 || fullName.length > 120) throw new Error(`Linha ${line}: nome inválido.`);
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error(`Linha ${line}: telefone inválido (inclua DDD).`);
    if (seen.has(normalizedPhone)) throw new Error(`Linha ${line}: telefone repetido no arquivo.`);
    seen.add(normalizedPhone);
    const email = String(row.email || "").trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Linha ${line}: e-mail inválido.`);
    const leadTypeInput = String(row.leadType || "comprador").trim().toLowerCase();
    const sourceInput = String(row.source || "outro").trim().toLowerCase();
    const leadType = typeMap[leadTypeInput];
    const source = sourceMap[sourceInput];
    if (!leadType) throw new Error(`Linha ${line}: tipo deve ser comprador, proprietario, locatario ou parceiro.`);
    if (!source) throw new Error(`Linha ${line}: origem inválida.`);
    const maxBudget = String(row.maxBudget || "").trim().replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".") || null;
    if (maxBudget && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0)) throw new Error(`Linha ${line}: orçamento inválido.`);
    const minBedrooms = String(row.minBedrooms || "").trim() ? Number(row.minBedrooms) : null;
    if (minBedrooms !== null && (!Number.isInteger(minBedrooms) || minBedrooms < 1 || minBedrooms > 20)) throw new Error(`Linha ${line}: quartos mínimos inválidos.`);
    const notes = String(row.notes || "").trim() || null;
    if (notes && notes.length > 3000) throw new Error(`Linha ${line}: observação acima de 3.000 caracteres.`);
    return {
      ownerUserId: actor.id, fullName, phone, normalizedPhone, email, leadType, source,
      propertyType: String(row.propertyType || "").trim() || null,
      city: String(row.city || "").trim() || null,
      neighborhoods: String(row.neighborhoods || "").split(/[|,]/).map((part) => part.trim()).filter(Boolean).slice(0, 20),
      maxBudget, minBedrooms, notes, stage: "novo" as const,
    };
  });
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(leads).values(cleaned).onConflictDoNothing({ target: [leads.ownerUserId, leads.normalizedPhone] }).returning();
    const insertedActivities = inserted.length ? await tx.insert(leadActivities).values(inserted.map(({ id }) => ({ leadId: id, userId: actor.id, activityType: "cadastro", description: "Lead importado por arquivo CSV." }))).returning() : [];
    return { imported: inserted.length, duplicates: rows.length - inserted.length, leads: inserted, activities: insertedActivities };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function updateLead(leadId: string, data: Parameters<typeof createLead>[0]) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome do lead.");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) throw new Error("Informe um telefone válido com DDD.");
  if (!( ["comprador", "proprietario", "locatario", "parceiro"] as string[]).includes(data.leadType)) throw new Error("Tipo de lead inválido.");
  if (!( ["indicacao", "whatsapp", "portal", "site", "ligacao", "rede_social", "outro"] as string[]).includes(data.source)) throw new Error("Origem do lead inválida.");
  const email = data.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  const maxBudget = data.maxBudget?.trim() || null;
  if (maxBudget && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) <= 0)) throw new Error("O orçamento deve ser maior que zero.");
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 3000) throw new Error("As observações devem ter até 3.000 caracteres.");
  const [ownedLead] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!ownedLead) throw new Error("Lead não encontrado na sua carteira.");

  try {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(leads).set({
        fullName,
        phone,
        normalizedPhone,
        email,
        leadType: data.leadType,
        source: data.source,
        propertyType: data.propertyType?.trim() || null,
        city: data.city?.trim() || null,
        neighborhoods: (data.neighborhoods || []).map((value) => value.trim()).filter(Boolean).slice(0, 20),
        maxBudget,
        minBedrooms: Number.isInteger(data.minBedrooms) && Number(data.minBedrooms) > 0 ? Number(data.minBedrooms) : null,
        notes,
        nextAction: data.nextAction?.trim() || null,
        nextActionAt,
        updatedAt: new Date(),
      }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
      const [activity] = await tx.insert(leadActivities).values({
        leadId,
        userId: actor.id,
        activityType: "nota",
        description: "Dados cadastrais e preferências do lead atualizados.",
      }).returning();
      return { lead: updated, activity };
    });
    revalidatePath("/");
    return { success: true, ...result };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("Já existe outro lead com este telefone na sua carteira.");
    throw error;
  }
}

export async function updateLeadStage(leadId: string, nextStage: string, lostReason?: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!(LEAD_STAGES as readonly string[]).includes(nextStage)) throw new Error("Etapa inválida.");
  const [lead] = await db.select({ id: leads.id, stage: leads.stage }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  const cleanLostReason = lostReason?.trim() || null;
  if (nextStage === "perdido" && !cleanLostReason) throw new Error("Informe o motivo da perda.");
  const result = await db.transaction(async (tx) => {
    const [saved] = await tx.update(leads).set({ stage: nextStage, lostReason: nextStage === "perdido" ? cleanLostReason : null, updatedAt: new Date() }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
    const [activity] = await tx.insert(leadActivities).values({
      leadId,
      userId: actor.id,
      activityType: "etapa",
      description: `Etapa alterada: ${lead.stage} → ${nextStage}${cleanLostReason ? `. Motivo: ${cleanLostReason}` : ""}.`,
    }).returning();
    return { lead: saved, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function addLeadActivity(data: {
  leadId: string;
  activityType: string;
  description: string;
  nextAction?: string;
  nextActionAt?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (!(LEAD_ACTIVITY_TYPES as readonly string[]).includes(data.activityType)) throw new Error("Tipo de atividade inválido.");
  const description = data.description.trim();
  if (description.length < 2 || description.length > 2000) throw new Error("Descreva o contato em até 2.000 caracteres.");
  const [lead] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  const nextAction = data.nextAction?.trim() || null;
  const nextActionAt = parseLeadDate(data.nextActionAt);
  const [activity] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(leadActivities).values({ leadId: lead.id, userId: actor.id, activityType: data.activityType, description }).returning();
    await tx.update(leads).set({
      ...(data.activityType === "nota" ? {} : { lastContactAt: new Date() }),
      nextAction,
      nextActionAt,
      updatedAt: new Date(),
    }).where(and(eq(leads.id, lead.id), eq(leads.ownerUserId, actor.id)));
    return [created];
  });
  revalidatePath("/");
  return { success: true, activity };
}

export async function completeLeadFollowUp(leadId: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const [lead] = await db.select({
    id: leads.id,
    stage: leads.stage,
    nextAction: leads.nextAction,
    nextActionAt: leads.nextActionAt,
  }).from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).limit(1);
  if (!lead) throw new Error("Lead não encontrado na sua carteira.");
  if (["fechado", "perdido"].includes(lead.stage)) throw new Error("Leads encerrados não têm retornos ativos.");
  if (!lead.nextActionAt) throw new Error("Este lead não tem retorno agendado.");

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(leads).set({
      nextAction: null,
      nextActionAt: null,
      lastContactAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(leads.id, leadId), eq(leads.ownerUserId, actor.id))).returning();
    const [activity] = await tx.insert(leadActivities).values({
      leadId,
      userId: actor.id,
      activityType: "nota",
      description: `Retorno concluído${lead.nextAction ? `: ${lead.nextAction}` : ""}.`,
    }).returning();
    return { lead: updated, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
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
  leadId?: string;
  clientName: string;
  clientPhone?: string;
  clientCpfPartial: string;
  visitDate: string;
  commissionSplit: string;
  commissionModel?: string;
  externalReferrerName?: string;
  externalReferrerCreci?: string;
  externalReferrerWhatsapp?: string;
}) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  if (data.partnerBrokerId !== actor.id) throw new Error("O corretor parceiro deve ser o usuário conectado.");
  const [property] = await db.select({ brokerId: properties.brokerId, acceptsPartnership: properties.acceptsPartnership, title: properties.title }).from(properties).where(eq(properties.id, data.propertyId)).limit(1);
  if (!property || property.brokerId !== data.captorBrokerId || !property.acceptsPartnership || property.brokerId === actor.id) {
    throw new Error("Imóvel ou parceria inválidos para este registro.");
  }
  const [lead] = data.leadId
    ? await db.select({ id: leads.id, fullName: leads.fullName, phone: leads.phone, leadType: leads.leadType, stage: leads.stage }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.ownerUserId, actor.id))).limit(1)
    : [];
  if (data.leadId && !lead) throw new Error("Lead não encontrado na sua carteira.");
  if (lead && !["comprador", "locatario"].includes(lead.leadType)) throw new Error("Só é possível vincular uma visita a um lead comprador ou locatário.");
  const clientName = lead?.fullName || data.clientName.trim();
  const clientPhone = lead?.phone || data.clientPhone || null;
  if (clientName.length < 2 || !/^\*{3}\.\d{3}\.\d{3}-\*\*$/.test(data.clientCpfPartial.trim())) {
    throw new Error("Informe o nome do cliente e apenas o CPF parcialmente mascarado.");
  }
  if (data.commissionModel && !["two_party_50_50", "three_party_referral_40_40_20"].includes(data.commissionModel)) {
    throw new Error("Escolha uma divisão de comissão válida.");
  }
  const commissionModel = data.commissionModel === "three_party_referral_40_40_20" ? data.commissionModel : "two_party_50_50";
  const externalReferrerName = data.externalReferrerName?.trim() || null;
  const externalReferrerCreci = data.externalReferrerCreci?.trim().toUpperCase() || null;
  const externalReferrerWhatsapp = data.externalReferrerWhatsapp?.trim() || null;
  if (commissionModel === "three_party_referral_40_40_20") {
    if (!externalReferrerName || externalReferrerName.length < 2 || externalReferrerName.length > 120) {
      throw new Error("Informe o nome do corretor indicador externo.");
    }
    if (!externalReferrerCreci || externalReferrerCreci.length < 2 || externalReferrerCreci.length > 30) {
      throw new Error("Informe o CRECI do corretor indicador externo.");
    }
    if (externalReferrerWhatsapp && externalReferrerWhatsapp.length > 30) {
      throw new Error("O WhatsApp do corretor indicador está inválido.");
    }
  }
  const captorCommissionPercent = commissionModel === "three_party_referral_40_40_20" ? "40.00" : "50.00";
  const partnerCommissionPercent = captorCommissionPercent;
  const referrerCommissionPercent = commissionModel === "three_party_referral_40_40_20" ? "20.00" : "0.00";
  const rawHashString = `${data.propertyId}-${data.captorBrokerId}-${data.partnerBrokerId}-${data.leadId || ""}-${clientName}-${data.clientCpfPartial}-${Date.now()}`;
  const certificateHash = crypto
    .createHash("sha256")
    .update(rawHashString)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const visitDate = new Date(data.visitDate);
  if (!Number.isFinite(visitDate.getTime())) throw new Error("Informe uma data de visita válida.");
  const lockExpirationDate = new Date(visitDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    const [certificate] = await tx.insert(dvpCertificates).values({
      certificateHash: `DVP-${certificateHash}`,
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      leadId: lead?.id || null,
      clientName,
      clientPhone,
      clientCpfPartial: data.clientCpfPartial.trim(),
      visitDate,
      lockExpirationDate,
      commissionModel,
      commissionSplit: captorCommissionPercent,
      captorCommissionPercent,
      partnerCommissionPercent,
      referrerCommissionPercent,
      externalReferrerName,
      externalReferrerCreci,
      externalReferrerWhatsapp,
      status: "rascunho",
      legalClausesAccepted: false,
    }).returning();

    const [partnership] = await tx.insert(partnerships).values({
      propertyId: data.propertyId,
      captorBrokerId: data.captorBrokerId,
      partnerBrokerId: data.partnerBrokerId,
      status: "visita_agendada",
      commissionModel,
      commissionSplit: captorCommissionPercent,
      captorCommissionPercent,
      partnerCommissionPercent,
      referrerCommissionPercent,
      externalReferrerName,
      externalReferrerCreci,
      externalReferrerWhatsapp,
      visitScheduledDate: visitDate,
      notes: `Registro interno de visita ${certificate.certificateHash}. Requer validação e aceite das partes antes de qualquer efeito contratual.`,
    }).returning();
    const [partnershipActivity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: null,
      newStatus: "visita_agendada",
      note: `Visita registrada para ${visitDate.toLocaleString("pt-BR")}. DVP em rascunho, sem aceite eletrônico.`,
    }).returning();

    await tx.insert(notifications).values({
      userId: data.captorBrokerId,
      title: "Novo registro de visita em rascunho",
      message: commissionModel === "three_party_referral_40_40_20"
        ? `Foi criado o registro ${certificate.certificateHash} para ${property.title}. Confira a divisão 40/40/20 e responda na tela de acompanhamento.`
        : `Foi criado o registro ${certificate.certificateHash} para ${property.title}. O rascunho ainda não tem assinatura eletrônica.`,
      type: "dvp",
      propertyId: data.propertyId,
      read: false,
    });

    let activity = null;
    if (lead) {
      const [createdActivity] = await tx.insert(leadActivities).values({
        leadId: lead.id,
        userId: actor.id,
        activityType: "visita",
        description: `Registro de visita ${certificate.certificateHash} criado para ${property.title}. O DVP ainda aguarda validação e aceite das partes.`,
      }).returning();
      activity = createdActivity;
      const [updatedLead] = await tx.update(leads).set({
        ...(["novo", "contato", "qualificado"].includes(lead.stage) ? { stage: "visita" } : {}),
        lastContactAt: new Date(),
        nextAction: "Confirmar visita e aceite do DVP",
        nextActionAt: visitDate,
        updatedAt: new Date(),
      }).where(and(eq(leads.id, lead.id), eq(leads.ownerUserId, actor.id))).returning({ stage: leads.stage, nextAction: leads.nextAction, nextActionAt: leads.nextActionAt, lastContactAt: leads.lastContactAt, updatedAt: leads.updatedAt });
      return { certificate, activity, lead: updatedLead, partnership, partnershipActivity };
    }

    return { certificate, activity, lead: null, partnership, partnershipActivity };
  });

  revalidatePath("/");
  return { success: true, ...result };
}

const PARTNERSHIP_TRANSITIONS: Record<string, string[]> = {
  proposta: ["visita_agendada", "recusado"],
  visita_agendada: ["em_negociacao", "recusado"],
  em_negociacao: ["fechado", "recusado"],
  fechado: [],
  recusado: [],
};

export async function updatePartnershipStatus(partnershipId: string, newStatus: string, note?: string) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > 500) throw new Error("A observação deve ter até 500 caracteres.");
  if (!Object.values(PARTNERSHIP_TRANSITIONS).some((statuses) => statuses.includes(newStatus))) throw new Error("Etapa de parceria inválida.");

  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new Error("Parceria não encontrada na sua carteira.");
    if (!PARTNERSHIP_TRANSITIONS[partnership.status]?.includes(newStatus)) throw new Error("Esta mudança de etapa não é permitida.");

    const [updated] = await tx.update(partnerships).set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(partnerships.id, partnership.id), eq(partnerships.status, partnership.status))).returning();
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus,
      note: cleanNote,
    }).returning();
    await tx.insert(notifications).values({
      userId: actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId,
      title: "Parceria atualizada",
      message: `A etapa da parceria foi alterada para ${newStatus.replaceAll("_", " ")}.${cleanNote ? ` Observação: ${cleanNote}` : ""} Esta atualização é operacional e não representa aceite contratual.`,
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity };
  });
  revalidatePath("/");
  return { success: true, ...result };
}

export async function respondToPartnershipSplit(partnershipId: string, accepted: boolean) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const result = await db.transaction(async (tx) => {
    const [partnership] = await tx.select({
      id: partnerships.id,
      propertyId: partnerships.propertyId,
      captorBrokerId: partnerships.captorBrokerId,
      partnerBrokerId: partnerships.partnerBrokerId,
      status: partnerships.status,
      commissionModel: partnerships.commissionModel,
      captorAcceptedAt: partnerships.captorAcceptedAt,
      partnerAcceptedAt: partnerships.partnerAcceptedAt,
    }).from(partnerships).where(and(
      eq(partnerships.id, partnershipId),
      or(eq(partnerships.captorBrokerId, actor.id), eq(partnerships.partnerBrokerId, actor.id)),
    )).for("update").limit(1);
    if (!partnership) throw new Error("Parceria não encontrada na sua carteira.");
    if (partnership.commissionModel !== "three_party_referral_40_40_20") throw new Error("Esta parceria não usa a divisão de indicação 40/40/20.");
    if (partnership.status === "recusado") throw new Error("Esta proposta já foi recusada.");
    const acceptedAt = actor.id === partnership.captorBrokerId ? partnership.captorAcceptedAt : partnership.partnerAcceptedAt;
    if (accepted && acceptedAt) return { partnership, activity: null, alreadyAccepted: true };
    if (!accepted && acceptedAt) throw new Error("Sua confirmação já foi registrada e não pode ser retirada nesta tela.");

    const now = new Date();
    const [updated] = await tx.update(partnerships).set({
      ...(accepted ? actor.id === partnership.captorBrokerId ? { captorAcceptedAt: now } : { partnerAcceptedAt: now } : { status: "recusado" }),
      updatedAt: now,
    }).where(eq(partnerships.id, partnership.id)).returning();
    const [activity] = await tx.insert(partnershipActivities).values({
      partnershipId: partnership.id,
      actorUserId: actor.id,
      previousStatus: partnership.status,
      newStatus: accepted ? "divisao_confirmada" : "divisao_recusada",
      note: accepted
        ? "Confirmou a proposta interna de divisão 40/40/20. Esta confirmação na plataforma não é assinatura eletrônica."
        : "Não aceitou a proposta interna de divisão 40/40/20.",
    }).returning();
    const otherBrokerId = actor.id === partnership.captorBrokerId ? partnership.partnerBrokerId : partnership.captorBrokerId;
    await tx.insert(notifications).values({
      userId: otherBrokerId,
      title: accepted ? "Confirmação da divisão de parceria" : "Divisão de parceria recusada",
      message: accepted
        ? "Um dos corretores confirmou a proposta de divisão 40/40/20. Esta confirmação interna não é assinatura eletrônica."
        : "Um dos corretores não aceitou a proposta de divisão 40/40/20. A parceria foi marcada como recusada.",
      type: "parceria",
      propertyId: partnership.propertyId,
      read: false,
    });
    return { partnership: updated, activity, alreadyAccepted: false };
  });
  revalidatePath("/");
  return { success: true, ...result };
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
  if (cleanEmail.length > 254 || password.length > 200) throw new Error("E-mail ou senha incorretos.");
  const requestHeaders = headers();
  const remoteAddress = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
  const rateLimitKey = crypto.createHash("sha256").update(`${cleanEmail}\n${remoteAddress}`).digest("hex");
  const [attemptState] = await db.select({ attempts: authLoginAttempts.attempts, blockedUntil: authLoginAttempts.blockedUntil, updatedAt: authLoginAttempts.updatedAt })
    .from(authLoginAttempts).where(eq(authLoginAttempts.keyHash, rateLimitKey)).limit(1);
  if (attemptState?.blockedUntil && attemptState.blockedUntil.getTime() > Date.now()) {
    throw new Error("Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.");
  }
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await db.insert(authLoginAttempts).values({ keyHash: rateLimitKey, attempts: 1, updatedAt: new Date() }).onConflictDoUpdate({
      target: authLoginAttempts.keyHash,
      set: {
        attempts: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '24 hours' or ${authLoginAttempts.blockedUntil} <= now() then 1 else ${authLoginAttempts.attempts} + 1 end`,
        blockedUntil: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '24 hours' or ${authLoginAttempts.blockedUntil} <= now() then null when ${authLoginAttempts.attempts} + 1 >= 5 then now() + interval '15 minutes' else null end`,
        updatedAt: new Date(),
      },
    });
    throw new Error("E-mail ou senha incorretos.");
  }
  if (user.verificationStatus === "suspenso") throw new Error("Esta conta está suspensa.");
  await db.delete(authLoginAttempts).where(eq(authLoginAttempts.keyHash, rateLimitKey));
  await setBrokerSession(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  revalidatePath("/");
  return { success: true, user: safeUser };
}

export async function logoutUser() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
  revalidatePath("/");
  return { success: true };
}
