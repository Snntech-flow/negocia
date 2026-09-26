import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  creci: text("creci").notNull(),
  whatsapp: text("whatsapp").notNull(),
  avatarUrl: text("avatar_url"),
  city: text("city").notNull(),
  state: text("state").default("SP").notNull(),
  role: text("role").default("corretor").notNull(), // 'corretor', 'admin', 'imobiliaria'
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationStatus: text("verification_status").default("aprovado").notNull(), // 'pendente', 'aprovado', 'suspenso'
  
  // Dados de Faturamento / Assinatura
  plan: text("plan").default("pro").notNull(), // 'free', 'pro', 'enterprise'
  subscriptionStatus: text("subscription_status").default("ativo").notNull(), // 'ativo', 'inadimplente', 'cancelado'
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }).default("149.00").notNull(),
  nextBillingDate: timestamp("next_billing_date"),
  
  // Reputação Ética (Anti-Laranja Podre)
  trustScore: integer("trust_score").default(100).notNull(), // 0 a 100
  successfulDeals: integer("successful_deals").default(0).notNull(),
  bypassReports: integer("bypass_reports").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  
  // Regras de Co-corretagem
  acceptsPartnership: boolean("accepts_partnership").default(true).notNull(),
  splitPercentage: numeric("split_percentage", { precision: 5, scale: 2 }).default("50.00").notNull(),
  
  // 🛡️ DADOS BLINDADOS (Visíveis APENAS pelo corretor captador)
  confidentialAddress: text("confidential_address").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),

  status: text("status").default("disponivel").notNull(), // disponivel, em_negociacao, vendido
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

export const partnerships = pgTable("partnerships", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  captorBrokerId: uuid("captor_broker_id").references(() => users.id).notNull(),
  partnerBrokerId: uuid("partner_broker_id").references(() => users.id).notNull(),
  status: text("status").default("proposta").notNull(), // proposta, visita_agendada, em_negociacao, fechado, recusado
  captorAcceptedAt: timestamp("captor_accepted_at"),
  partnerAcceptedAt: timestamp("partner_accepted_at"),
  commissionSplit: numeric("commission_split", { precision: 5, scale: 2 }).default("50.00").notNull(),
  visitScheduledDate: timestamp("visit_scheduled_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'mensalidade_pro', 'taxa_plataforma_parceria', 'mensalidade_imobiliaria'
  paymentMethod: text("payment_method").notNull(), // 'pix', 'cartao_credito'
  status: text("status").default("pago").notNull(), // 'pago', 'pendente', 'estornado'
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientCpfPartial: text("client_cpf_partial").notNull(), // ex: ***.456.789-**
  visitDate: timestamp("visit_date").notNull(),
  lockExpirationDate: timestamp("lock_expiration_date").notNull(), // 180 dias de trava jurídica
  commissionSplit: numeric("commission_split", { precision: 5, scale: 2 }).default("50.00").notNull(),
  status: text("status").default("ativo").notNull(), // 'ativo', 'fechado', 'expirado', 'contestado'
  legalClausesAccepted: boolean("legal_clauses_accepted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
