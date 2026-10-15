import { sql } from "drizzle-orm";
import { pgTable, uuid, text, numeric, integer, boolean, timestamp, date, jsonb, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  creci: text("creci").notNull(),
  whatsapp: text("whatsapp").notNull(),
  // Nullable for legacy/demo seed accounts; new accounts must authenticate with a password.
  passwordHash: text("password_hash"),
  documentationTemplate: jsonb("documentation_template").$type<import("../negotiation-documents").NegotiationDocuments>(),
  sessionVersion: integer("session_version").default(0).notNull(),
  avatarUrl: text("avatar_url"),
  city: text("city").notNull(),
  state: text("state").default("SP").notNull(),
  role: text("role").default("corretor").notNull(), // 'corretor', 'admin', 'imobiliaria'
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationStatus: text("verification_status").default("pendente").notNull(), // 'pendente', 'aprovado', 'suspenso'
  // Quem da equipe mudou a situação do CRECI por último, e quando.
  verificationReviewedBy: uuid("verification_reviewed_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  verificationReviewedAt: timestamp("verification_reviewed_at"),
  
  // Dados de Faturamento / Assinatura
  plan: text("plan").default("pro").notNull(), // 'free', 'pro', 'enterprise'
  subscriptionStatus: text("subscription_status").default("pendente").notNull(), // 'pendente', 'ativo', 'inadimplente', 'cancelado'
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }).default("149.00").notNull(),
  nextBillingDate: timestamp("next_billing_date"),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  referredBy: uuid("referred_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  referralRewardedAt: timestamp("referral_rewarded_at"),
  // Conta sem cobrança (sócios, cortesia): quem da equipe isentou e quando. Isenta = ativa, sem vencimento e sem mensalidade.
  billingExemptBy: uuid("billing_exempt_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  billingExemptAt: timestamp("billing_exempt_at"),
  // Visualização da Administração (15/10/2026): vê a aba em modo leitura; as ações seguem só do administrador.
  adminViewAccess: boolean("admin_view_access").default(false).notNull(),
  adminViewAccessBy: uuid("admin_view_access_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  adminViewAccessAt: timestamp("admin_view_access_at"),
  
  // Reputação Ética (Anti-Laranja Podre)
  trustScore: integer("trust_score").default(100).notNull(), // 0 a 100
  successfulDeals: integer("successful_deals").default(0).notNull(),
  bypassReports: integer("bypass_reports").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const authLoginAttempts = pgTable("auth_login_attempts", {
  keyHash: text("key_hash").primaryKey(),
  attempts: integer("attempts").default(0).notNull(),
  blockedUntil: timestamp("blocked_until"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionVersion: integer("session_version").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ userIdx: index("password_reset_tokens_user_idx").on(table.userId) }));

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  brokerId: uuid("broker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  propertyType: text("property_type").notNull(), // apartamento, casa, cobertura, etc.
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull(),
  condoFee: numeric("condo_fee", { precision: 10, scale: 2 }),
  iptu: numeric("iptu", { precision: 10, scale: 2 }),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  bedrooms: integer("bedrooms").default(1).notNull(),
  bathrooms: integer("bathrooms").default(1).notNull(),
  suites: integer("suites").default(0).notNull(),
  parkingSpots: integer("parking_spots").default(0).notNull(),
  areaM2: numeric("area_m2", { precision: 8, scale: 2 }).notNull(),
  description: text("description").notNull(),
  photos: jsonb("photos").$type<string[]>().default([]).notNull(),
  
  // Finalidade do Negócio (Venda / Aluguel / Temporada)
  purpose: text("purpose").default("venda").notNull(), // 'venda', 'aluguel', 'temporada'
  acceptsTrade: boolean("accepts_trade").default(false).notNull(), // Aceita permuta
  tradeDetails: text("trade_details"), // Detalhes da permuta
  
  // Condição da Obra (Novo / Usado / Em Construção / Na Planta)
  condition: text("condition").default("usado").notNull(), // 'novo', 'usado', 'em_construcao', 'na_planta'
  hotelRoomsCount: integer("hotel_rooms_count"), // Nº de quartos para Hotel ou Pousada
  
  // Áreas & Dimensões Detalhadas
  usefulAreaM2: numeric("useful_area_m2", { precision: 8, scale: 2 }), // Área útil
  totalAreaM2: numeric("total_area_m2", { precision: 8, scale: 2 }), // Área total
  
  // Posição Solar e Vista
  solarPosition: text("solar_position"), // 'nascente', 'norte_sul', 'poente'
  viewType: text("view_type"), // 'frente', 'fundos', 'lagoa', 'av_principal'
  propertyAge: integer("property_age"), // Idade do imóvel (anos)
  deliveryForecast: date("delivery_forecast", { mode: "string" }), // Previsão de entrega (dia 1 do mês) — só em construção/na planta
  iptuPeriod: text("iptu_period").default("anual"), // 'anual', 'mensal'
  
  // Situação Jurídica e Financiamento
  documentationStatus: text("documentation_status"), // 'escriturado', 'promessa_compra_venda', 'inventario'
  acceptsFinancing: boolean("accepts_financing").default(true).notNull(), // Pode ser financiado por todos os bancos?
  
  // Itens Privativos do Imóvel & Estrutura do Condomínio
  privateAmenities: jsonb("private_amenities").$type<string[]>().default([]).notNull(),
  condoAmenities: jsonb("condo_amenities").$type<string[]>().default([]).notNull(),
  garageType: text("garage_type").default("coberta"), // 'coberta', 'descoberta'
  
  // Localização & Blindagem de Rua
  cep: text("cep"),
  state: text("state"),
  street: text("street"),
  streetNumber: text("street_number"),
  block: text("block"),
  floor: text("floor"),
  condoName: text("condo_name"),
  hideStreet: boolean("hide_street").default(false).notNull(), // Ocultar rua para cliente final (Blindagem!)
  
  // Mídias
  videoUrl: text("video_url"), // Link do vídeo (YouTube/Vimeo)
  coverPhoto: text("cover_photo"),
  floorPlanPhotos: jsonb("floor_plan_photos").$type<string[]>().default([]).notNull(),
  
  // Regras de Co-corretagem
  acceptsPartnership: boolean("accepts_partnership").default(true).notNull(),
  splitPercentage: numeric("split_percentage", { precision: 5, scale: 2 }).default("50.00").notNull(),
  // Condição de parceria (14/10/2026): só 50/50, só 40/40/20 ou as duas — src/lib/partnership-models.ts.
  partnershipModels: text("partnership_models").default("ambos").notNull(),
  partnershipConfirmedAt: timestamp("partnership_confirmed_at", { withTimezone: true }),
  partnershipReviewPending: boolean("partnership_review_pending").default(true).notNull(),
  
  // 🛡️ DADOS BLINDADOS (Visíveis APENAS pelo corretor captador)
  confidentialAddress: text("confidential_address").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),

  status: text("status").default("disponivel").notNull(), // disponivel, em_negociacao, vendido, arquivado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const buyerProfiles = pgTable("buyer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  brokerId: uuid("broker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  clientInternalName: text("client_internal_name").notNull(),
  propertyType: text("property_type").notNull(),
  city: text("city").notNull(),
  neighborhoods: jsonb("neighborhoods").$type<string[]>().default([]).notNull(),
  maxBudget: numeric("max_budget", { precision: 12, scale: 2 }).notNull(),
  minBedrooms: integer("min_bedrooms").default(1).notNull(),
  minParkingSpots: integer("min_parking_spots").default(0).notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  normalizedPhone: text("normalized_phone").notNull(),
  documentation: jsonb("documentation").$type<import("../negotiation-documents").NegotiationDocuments>(),
  email: text("email"),
  leadType: text("lead_type").default("comprador").notNull(),
  stage: text("stage").default("novo").notNull(),
  source: text("source").default("outro").notNull(),
  propertyType: text("property_type"),
  city: text("city"),
  neighborhoods: jsonb("neighborhoods").$type<string[]>().default([]).notNull(),
  maxBudget: numeric("max_budget", { precision: 12, scale: 2 }),
  minBedrooms: integer("min_bedrooms"),
  notes: text("notes"),
  nextAction: text("next_action"),
  nextActionAt: timestamp("next_action_at"),
  lastContactAt: timestamp("last_contact_at"),
  lostReason: text("lost_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ownerStageIdx: index("leads_owner_stage_idx").on(table.ownerUserId, table.stage),
  ownerActionIdx: index("leads_owner_action_idx").on(table.ownerUserId, table.nextActionAt),
  ownerPhoneUnique: uniqueIndex("leads_owner_phone_unique").on(table.ownerUserId, table.normalizedPhone),
}));

export const leadActivities = pgTable("lead_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  leadTimelineIdx: index("lead_activities_timeline_idx").on(table.leadId, table.occurredAt),
}));

export const partnerships = pgTable("partnerships", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  captorBrokerId: uuid("captor_broker_id").references(() => users.id).notNull(),
  partnerBrokerId: uuid("partner_broker_id").references(() => users.id).notNull(),
  status: text("status").default("proposta").notNull(), // proposta, visita_agendada, em_negociacao, fechado, recusado
  captorAcceptedAt: timestamp("captor_accepted_at"),
  partnerAcceptedAt: timestamp("partner_accepted_at"),
  commissionStatus: text("commission_status").default("nao_registrada").notNull(),
  commissionRevision: integer("commission_revision").default(1).notNull(),
  commissionModel: text("commission_model").default("two_party_50_50").notNull(),
  commissionSplit: numeric("commission_split", { precision: 5, scale: 2 }).default("50.00").notNull(),
  captorCommissionPercent: numeric("captor_commission_percent", { precision: 5, scale: 2 }).default("50.00").notNull(),
  partnerCommissionPercent: numeric("partner_commission_percent", { precision: 5, scale: 2 }).default("50.00").notNull(),
  referrerCommissionPercent: numeric("referrer_commission_percent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  externalReferrerName: text("external_referrer_name"),
  externalReferrerCreci: text("external_referrer_creci"),
  externalReferrerWhatsapp: text("external_referrer_whatsapp"),
  visitScheduledDate: timestamp("visit_scheduled_date"),
  // Informados ao fechar: valor total da comissão e data prevista; geram a previsão no Financeiro de cada corretor.
  commissionTotal: numeric("commission_total", { precision: 12, scale: 2 }),
  commissionExpectedDate: date("commission_expected_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partnershipActivities = pgTable("partnership_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnershipId: uuid("partnership_id").references(() => partnerships.id, { onDelete: "cascade" }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ partnershipTimelineIdx: index("partnership_activities_timeline_idx").on(table.partnershipId, table.createdAt) }));

export const pilotFeedback = pgTable("pilot_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  screen: text("screen").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  status: text("status").default("novo").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ statusCreatedIdx: index("pilot_feedback_status_created_idx").on(table.status, table.createdAt) }));

// Financeiro do corretor: receitas e despesas privadas de cada conta.
// Datas em texto (aaaa-mm-dd): o driver converteria "date" em meia-noite local e o dia poderia voltar um.
export const brokerFinanceEntries = pgTable("broker_finance_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind").notNull(), // 'receita', 'despesa'
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  paidAt: date("paid_at", { mode: "string" }),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  // Previsão gerada pelo fechamento de uma parceria (uma por corretor e parceria).
  partnershipId: uuid("partnership_id").references(() => partnerships.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ownerDueIdx: index("broker_finance_entries_owner_due_idx").on(table.ownerUserId, table.dueDate),
  ownerPartnershipUnique: uniqueIndex("broker_finance_entries_owner_partnership_unique").on(table.ownerUserId, table.partnershipId).where(sql`partnership_id is not null`),
}));

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'mensalidade_pro', 'taxa_plataforma_parceria', 'mensalidade_imobiliaria'
  paymentMethod: text("payment_method").notNull(), // 'pix', 'cartao_credito'
  status: text("status").default("pendente").notNull(), // 'pago', 'pendente', 'estornado'
  description: text("description").notNull(),
  // Confirmação manual do Pix e o que ela mudou, para o estorno desfazer exatamente isso.
  confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at"),
  previousBillingDate: timestamp("previous_billing_date"),
  previousSubscriptionStatus: text("previous_subscription_status"),
  periodEnd: timestamp("period_end"),
  referralRewardedUserId: uuid("referral_rewarded_user_id").references(() => users.id, { onDelete: "set null" }),
  referralPreviousBillingDate: timestamp("referral_previous_billing_date"),
  referralPeriodEnd: timestamp("referral_period_end"),
  refundedBy: uuid("refunded_by").references(() => users.id, { onDelete: "set null" }),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Registro das migrations de supabase/migrations aplicadas por scripts/migrate.ts.
export const appMigrations = pgTable("app_migrations", {
  name: text("name").primaryKey(),
  checksum: text("checksum").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("ai_match").notNull(), // 'ai_match', 'dvp', 'parceria', 'sistema'
  read: boolean("read").default(false).notNull(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dvpCertificates = pgTable("dvp_certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  certificateHash: text("certificate_hash").notNull().unique(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  captorBrokerId: uuid("captor_broker_id").references(() => users.id).notNull(),
  partnerBrokerId: uuid("partner_broker_id").references(() => users.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientCpfPartial: text("client_cpf_partial").notNull(), // ex: ***.456.789-**
  visitDate: timestamp("visit_date").notNull(),
  lockExpirationDate: timestamp("lock_expiration_date").notNull(), // data calculada; só tem efeito após formalização válida
  commissionModel: text("commission_model").default("two_party_50_50").notNull(),
  commissionSplit: numeric("commission_split", { precision: 5, scale: 2 }).default("50.00").notNull(),
  captorCommissionPercent: numeric("captor_commission_percent", { precision: 5, scale: 2 }).default("50.00").notNull(),
  partnerCommissionPercent: numeric("partner_commission_percent", { precision: 5, scale: 2 }).default("50.00").notNull(),
  referrerCommissionPercent: numeric("referrer_commission_percent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  externalReferrerName: text("external_referrer_name"),
  externalReferrerCreci: text("external_referrer_creci"),
  externalReferrerWhatsapp: text("external_referrer_whatsapp"),
  status: text("status").default("rascunho").notNull(), // 'rascunho', 'ativo', 'fechado', 'expirado', 'contestado'
  legalClausesAccepted: boolean("legal_clauses_accepted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Termo de Parceria com aceite eletrônico (20261011120000): cada corretor aceita o texto exato (gravado, com a impressão
// sha-256) da versão do termo e da revisão da divisão da comissão; mudou o texto, aceita de novo.
export const partnershipTermAcceptances = pgTable("partnership_term_acceptances", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnershipId: uuid("partnership_id").references(() => partnerships.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  termVersion: text("term_version").notNull(),
  commissionRevision: integer("commission_revision").notNull(),
  textHash: text("text_hash").notNull(),
  termText: text("term_text").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (table) => ({
  partnershipIdx: index("partnership_term_acceptances_partnership_idx").on(table.partnershipId),
  uniqueAcceptance: uniqueIndex("partnership_term_acceptances_unique")
    .on(table.partnershipId, table.userId, table.textHash),
}));

// Repasses dos sócios (15/10/2026, migration 20261015140000): % de cada sócio e da empresa sobre o faturamento das
// assinaturas; cada versão vale a partir de um mês. Soma 100%, mês passado imutável e retroativo só antes da primeira
// versão — garantidos por gatilhos no banco.
export const revenueSplitVersions = pgTable("revenue_split_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  validFromMonth: date("valid_from_month", { mode: "string" }).notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revenueSplitShares = pgTable("revenue_split_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").references(() => revenueSplitVersions.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
});
