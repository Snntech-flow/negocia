"use server";

import { db, properties, users, buyerProfiles, leads, leadActivities, partnerships, partnershipActivities,
  pilotFeedback, transactions, notifications, dvpCertificates } from "../db";
import { eq, ne, desc, and, or, sql, ilike, count, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getCurrentUserId } from "../auth";
import { hasSubscriptionAccess } from "../subscription";
import { networkPropertyScope, networkProfileScope } from "../property-access";
import { validateMarketplaceQuery, PROPERTY_PAGE_SIZE, type MarketplaceQuery, type WorkspaceSection } from "../marketplace-query";

// CRM, Radar e Visitas cruzam com o estoque recente; a vitrine pagina e enxerga tudo.
const NETWORK_PROPERTY_CAP = 500;

const partnershipCaptor = alias(users, "partnership_captor");
const partnershipPartner = alias(users, "partnership_partner");

export async function getMarketplaceData(input: MarketplaceQuery = {}) {
  const { section, page, search, purpose, propertyType } = validateMarketplaceQuery(input);
  const includes = (...sections: WorkspaceSection[]) => section === "full" || sections.includes(section);
  const includeProperties = includes("vitrine", "radar", "crm", "atendimento", "dvp");
  const includePropertyCount = includeProperties || includes("cadastrar");
  const includePartnerships = includes("dvp", "termo");
  try {
    const currentUserId = await getCurrentUserId();
    const [currentUser] = currentUserId
      ? await db.select({
          id: users.id, name: users.name, email: users.email, creci: users.creci,
          whatsapp: users.whatsapp, avatarUrl: users.avatarUrl, city: users.city,
          state: users.state, isVerified: users.isVerified,
          verificationStatus: users.verificationStatus, plan: users.plan,
          subscriptionStatus: users.subscriptionStatus, monthlyFee: users.monthlyFee,
          nextBillingDate: users.nextBillingDate, billingCycle: users.billingCycle,
          role: users.role, trustScore: users.trustScore,
          successfulDeals: users.successfulDeals, bypassReports: users.bypassReports,
          verificationReviewedAt: users.verificationReviewedAt, verificationReviewedBy: users.verificationReviewedBy,
          billingExemptAt: users.billingExemptAt,
          // Para o aviso da mensalidade no sino: primeira cobrança (escolhe mensal ou anual) e Pix aguardando conferência.
          // "users.id" escrito por extenso: o Drizzle põe só "id" no select de uma tabela, e na subconsulta isso viraria t.id.
          hasPaid: sql<boolean>`exists (select 1 from transactions t where t.user_id = users.id and t.status = 'pago' and t.type like 'mensalidade\\_%')`,
          pendingPix: sql<boolean>`exists (select 1 from transactions t where t.user_id = users.id and t.status = 'pendente' and t.payment_method = 'pix' and t.type like 'mensalidade\\_%')`,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.id, currentUserId)).limit(1)
      : [];
    if (!currentUser) return {
      properties: [], propertyTotal: 0, radarList: [], users: [], transactions: [], currentUser: null,
      notifications: [], dvpList: [], partnerships: [], partnershipActivities: [], leads: [], leadActivities: [], pilotFeedback: [],
    };
    const isAdmin = currentUser.role === "admin";
    const paginated = section === "vitrine";
    const pattern = `%${search.replace(/[\\%_]/g, character => `\\${character}`)}%`;
    const emptySessionId = "00000000-0000-0000-0000-000000000000";
    const ownsProperty = sql<boolean>`${properties.brokerId} = ${currentUser?.id ?? emptySessionId}`;
    const ownsProfile = sql<boolean>`${buyerProfiles.brokerId} = ${currentUser?.id ?? emptySessionId}`;

    // Private inventory stays with its owner. Only active, approved brokers
    // can read available properties explicitly offered for partnership.
    const canBrowseNetwork = currentUser?.verificationStatus === "aprovado" &&
      hasSubscriptionAccess(currentUser.subscriptionStatus, currentUser.nextBillingDate);
    const propertyScope = isAdmin ? undefined : currentUser
      ? canBrowseNetwork
        ? or(eq(properties.brokerId, currentUser.id), networkPropertyScope())
        : eq(properties.brokerId, currentUser.id)
      : eq(properties.id, emptySessionId);

    const filteredPropertyScope = and(propertyScope, ne(properties.status, "arquivado"),
      ...(paginated && purpose !== "todos" ? [eq(properties.purpose, purpose)] : []),
      ...(paginated && propertyType !== "todos" ? [eq(properties.propertyType, propertyType)] : []),
      ...(paginated && search ? [or(ilike(properties.title, pattern), ilike(properties.city, pattern), ilike(properties.neighborhood, pattern),
        and(ownsProperty, ilike(properties.condoName, pattern)))] : []),
    );
    const propertyListQuery = includeProperties ? db
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
          verificationStatus: users.verificationStatus,
          name: users.name,
          creci: users.creci,
          whatsapp: users.whatsapp,
          avatarUrl: users.avatarUrl,
          city: users.city,
        },
      })
      .from(properties)
      .innerJoin(users, eq(properties.brokerId, users.id))
      .where(filteredPropertyScope)
      .orderBy(desc(properties.createdAt), desc(properties.id))
      .limit(paginated ? PROPERTY_PAGE_SIZE : NETWORK_PROPERTY_CAP)
      .offset(paginated ? (page - 1) * PROPERTY_PAGE_SIZE : 0) : [];
    const propertyCountQuery = includePropertyCount ? db.select({ total: count() }).from(properties)
      .innerJoin(users, eq(properties.brokerId, users.id)).where(filteredPropertyScope) : [];

    const radarScope = canBrowseNetwork
      ? or(and(eq(buyerProfiles.brokerId, currentUser!.id), eq(buyerProfiles.active, true)), networkProfileScope())
      : currentUser
        ? and(eq(buyerProfiles.active, true), eq(buyerProfiles.brokerId, currentUser.id))
        : eq(buyerProfiles.id, "00000000-0000-0000-0000-000000000000");
    const radarListQuery = includes("radar") ? db
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
      .orderBy(desc(buyerProfiles.createdAt)) : [];

    const allUsersQuery = db
      .select({
        id: users.id, name: users.name, email: users.email, creci: users.creci,
        whatsapp: users.whatsapp, avatarUrl: users.avatarUrl, city: users.city,
        state: users.state, isVerified: users.isVerified,
        verificationStatus: users.verificationStatus, plan: users.plan,
        subscriptionStatus: users.subscriptionStatus, monthlyFee: users.monthlyFee,
          nextBillingDate: users.nextBillingDate, billingCycle: users.billingCycle,
        role: users.role, trustScore: users.trustScore,
        verificationReviewedAt: users.verificationReviewedAt, verificationReviewedBy: users.verificationReviewedBy,
        billingExemptAt: users.billingExemptAt, billingExemptBy: users.billingExemptBy,
        successfulDeals: users.successfulDeals, bypassReports: users.bypassReports,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isAdmin && includes("admin") ? undefined : currentUser ? eq(users.id, currentUser.id) : eq(users.id, "00000000-0000-0000-0000-000000000000"))
      .orderBy(desc(users.createdAt));

    const allTransactionsQuery = isAdmin && includes("admin") ? db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        type: transactions.type,
        paymentMethod: transactions.paymentMethod,
        status: transactions.status,
        confirmedAt: transactions.confirmedAt,
        confirmedBy: transactions.confirmedBy,
        refundedAt: transactions.refundedAt,
        refundReason: transactions.refundReason,
        periodEnd: transactions.periodEnd,
        description: transactions.description,
        createdAt: transactions.createdAt,
        userName: users.name,
        userCreci: users.creci,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt)) : [];

    // Busca notificações reais do usuário ativo
    const notificationsQuery = db
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

    // Busca DVPs cadastrados
    const dvpListQuery = includes("dvp") ? db
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

    const partnershipListQuery = includePartnerships ? db
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
        commissionStatus: partnerships.commissionStatus,
        commissionRevision: partnerships.commissionRevision,
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

    const leadListQuery = includes("crm", "atendimento") ? db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        documentation: leads.documentation,
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

    const leadActivityListQuery = includes("crm", "atendimento") ? db
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

    const pilotFeedbackQuery = isAdmin && includes("admin") ? db
      .select({
        id: pilotFeedback.id,
        userId: pilotFeedback.userId,
        userName: users.name,
        userCreci: users.creci,
        screen: pilotFeedback.screen,
        category: pilotFeedback.category,
        message: pilotFeedback.message,
        status: pilotFeedback.status,
        createdAt: pilotFeedback.createdAt,
      })
      .from(pilotFeedback)
      .innerJoin(users, eq(pilotFeedback.userId, users.id))
      .orderBy(desc(pilotFeedback.createdAt))
      .limit(200) : [];

    const [propertyList, propertyCounts, radarList, allUsers, allTransactions, userNotifications, dvpList,
      partnershipList, leadList, leadActivityList, pilotFeedbackList] = await Promise.all([
      propertyListQuery, propertyCountQuery, radarListQuery, allUsersQuery, allTransactionsQuery,
      notificationsQuery, dvpListQuery, partnershipListQuery, leadListQuery, leadActivityListQuery, pilotFeedbackQuery,
    ]);
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
      .where(inArray(partnershipActivities.partnershipId, partnershipList.map((partnership) => partnership.id)))
      .orderBy(desc(partnershipActivities.createdAt))
      .limit(500)
      : [];

    return {
      properties: propertyList,
      propertyTotal: Number(propertyCounts[0]?.total ?? 0),
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
      pilotFeedback: pilotFeedbackList,
    };
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    throw error;
  }
}
