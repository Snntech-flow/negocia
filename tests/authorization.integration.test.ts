import assert from "node:assert/strict";
import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac, randomUUID } from "node:crypto";
import test from "node:test";

const testDatabaseUrl = process.env.NEGOCIAR_LAR_TEST_DATABASE_URL;
const approvedLocalDatabase = (() => {
  if (!testDatabaseUrl) return false;
  try {
    const url = new URL(testDatabaseUrl);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname.toLowerCase().includes("test") &&
      !/supabase|pooler/i.test(url.hostname);
  } catch {
    return false;
  }
})();

if (process.env.NEGOCIAR_LAR_REQUIRE_INTEGRATION === "1" && !approvedLocalDatabase) {
  throw new Error("Os testes de autorização exigem NEGOCIAR_LAR_TEST_DATABASE_URL local e descartável.");
}

test("server actions enforce account ownership and admin-only Pix confirmation", {
  skip: !approvedLocalDatabase ? "Configure NEGOCIAR_LAR_TEST_DATABASE_URL with a disposable local test database." : false,
}, async (t) => {
  if (!testDatabaseUrl || !approvedLocalDatabase) return;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NEGOCIAR_LAR_SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
  (globalThis as typeof globalThis & { AsyncLocalStorage: typeof NodeAsyncLocalStorage }).AsyncLocalStorage = NodeAsyncLocalStorage;

  const [{ db, users, leads, buyerProfiles, transactions, notifications, properties, partnerships, authLoginAttempts }, { eq, inArray }, { workAsyncStorage }, { workUnitAsyncStorage }, actions] = await Promise.all([
    import("../src/lib/db"),
    import("drizzle-orm"),
    import("next/dist/server/app-render/work-async-storage.external"),
    import("next/dist/server/app-render/work-unit-async-storage.external"),
    import("../src/lib/actions"),
  ]);

  const suffix = cryptoRandomSuffix();
  const registeredIds: string[] = [];
  const [owner] = await db.insert(users).values({
    name: "Teste Proprietário",
    email: `owner-${suffix}@example.test`,
    creci: `1${suffix.slice(0, 6)}F`,
    whatsapp: "11999990001",
    city: "São Paulo",
    state: "SP",
    role: "corretor",
    verificationStatus: "aprovado",
    subscriptionStatus: "pendente",
    plan: "10",
  }).returning();
  const [otherBroker] = await db.insert(users).values({
    name: "Teste Outro Corretor",
    email: `broker-${suffix}@example.test`,
    creci: `2${suffix.slice(0, 6)}F`,
    whatsapp: "11999990002",
    city: "São Paulo",
    state: "SP",
    role: "corretor",
    verificationStatus: "aprovado",
    subscriptionStatus: "ativo",
    plan: "10",
  }).returning();
  const referrerExpiry = new Date(Date.now() + 15 * 86_400_000);
  await db.update(users).set({ nextBillingDate: referrerExpiry }).where(eq(users.id, otherBroker.id));
  await db.update(users).set({ referredBy: otherBroker.id }).where(eq(users.id, owner.id));
  const [admin] = await db.insert(users).values({
    name: "Teste Admin",
    email: `admin-${suffix}@example.test`,
    creci: `3${suffix.slice(0, 6)}F`,
    whatsapp: "11999990003",
    city: "São Paulo",
    state: "SP",
    role: "admin",
    verificationStatus: "aprovado",
    subscriptionStatus: "ativo",
    plan: "10",
  }).returning();

  const [ownerLead] = await db.insert(leads).values({
    ownerUserId: owner.id,
    fullName: "Cliente particular",
    phone: "11988887777",
    normalizedPhone: "11988887777",
    leadType: "comprador",
    source: "indicacao",
    nextActionAt: new Date(Date.now() + 86_400_000),
  }).returning();
  const [ownerProfile] = await db.insert(buyerProfiles).values({
    brokerId: owner.id,
    clientInternalName: "Cliente confidencial",
    propertyType: "Apartamento",
    city: "São Paulo",
    neighborhoods: ["Centro"],
    maxBudget: "900000",
    minBedrooms: 2,
    minParkingSpots: 1,
    notes: "Observação privada do cliente.",
    active: true,
  }).returning();
  const [ownerNotification] = await db.insert(notifications).values({
    userId: owner.id,
    title: "Notificação privada",
    message: "Mensagem de teste.",
    type: "sistema",
    read: false,
  }).returning();
  const [payment] = await db.insert(transactions).values({
    userId: owner.id,
    amount: "59.90",
    type: "mensalidade_pro",
    paymentMethod: "pix",
    status: "pendente",
    description: "Plano de teste via Pix",
  }).returning();

  t.after(async () => {
    const userIds = [owner.id, otherBroker.id, admin.id, ...registeredIds];
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(transactions).where(inArray(transactions.userId, userIds));
    await db.delete(buyerProfiles).where(inArray(buyerProfiles.id, [ownerProfile.id]));
    await db.delete(leads).where(inArray(leads.id, [ownerLead.id]));
    await db.delete(users).where(inArray(users.id, userIds));
    await db.$client.end();
  });

  async function asUser<T>(userId: string, callback: () => Promise<T>, options: { version?: number; expiresAt?: number; signature?: string; address?: string } = {}): Promise<T> {
    const expiresAt = options.expiresAt ?? Math.floor(Date.now() / 1000) + 300;
    const version = options.version ?? 0;
    const payload = `${userId}.${version}.${expiresAt}`;
    const signature = createHmac("sha256", process.env.NEGOCIAR_LAR_SESSION_SECRET!).update(payload).digest("hex");
    const cookieValue = `${payload}.${options.signature ?? signature}`;
    const cookieStore = { set: () => {}, delete: () => {}, get: (name: string) => name === "negocialar_session" ? { name, value: cookieValue } : undefined };
    const headers = new Headers();
    if (options.address) headers.set("x-vercel-forwarded-for", options.address);
    const workStore = { route: "/", page: "/", incrementalCache: {}, pendingRevalidatedTags: [] as unknown[] } as unknown as Parameters<typeof workAsyncStorage.run>[0];
    const requestStore = { type: "request", phase: "action", cookies: cookieStore, mutableCookies: cookieStore, userspaceMutableCookies: cookieStore, headers } as unknown as Parameters<typeof workUnitAsyncStorage.run>[0];
    return workAsyncStorage.run(workStore, () =>
      workUnitAsyncStorage.run(requestStore, callback));
  }

  await t.test("carteira permite edição e arquivamento apenas pelo dono, com controle de versão", async () => {
    const inventory = await import("../src/lib/actions/property-inventory");
    const form = { title: "Imóvel editável", propertyType: "Apartamento", salePrice: "550000", city: "São Paulo", neighborhood: "Centro",
      bedrooms: 2, suites: 1, bathrooms: 2, parkingSpots: 1, areaM2: "80", description: "Descrição original",
      confidentialAddress: "Rua protegida, 123", ownerName: "Proprietário privado", ownerPhone: "11933332222",
      acceptsPartnership: true, splitPercentage: "50", photos: [], purpose: "venda" };
    const [property] = await db.insert(properties).values({ ...form, brokerId: otherBroker.id }).returning();
    try {
      const [partnership] = await db.insert(partnerships).values({ propertyId: property.id, captorBrokerId: otherBroker.id, partnerBrokerId: owner.id }).returning();
      const revision = property.updatedAt.toISOString();
      const foreign = await asUser(owner.id, () => inventory.getOwnProperties());
      assert.ok(!foreign.items.some(item => item.id === property.id));
      await assert.rejects(asUser(owner.id, () => inventory.updateOwnProperty(property.id, revision, form)), /não encontrado/);
      await assert.rejects(asUser(owner.id, () => inventory.updateOwnPropertyStatus(property.id, revision, "arquivado")), /não encontrado/);
      const own = await asUser(otherBroker.id, () => inventory.getOwnProperties({ search: "editável" }));
      assert.equal(own.items[0].ownerName, form.ownerName);
      const saved = await asUser(otherBroker.id, () => inventory.updateOwnProperty(property.id, revision,
        { ...form, title: "Título atualizado", salePrice: "575000", hideStreet: false, propertyAge: 0, ownerPhone: "11944443333",
          brokerId: owner.id, status: "vendido" } as typeof form));
      assert.equal(saved.property.title, "Título atualizado");
      assert.equal(saved.property.brokerId, otherBroker.id);
      assert.equal(saved.property.status, "disponivel");
      assert.equal(saved.property.propertyAge, 0);
      await assert.rejects(asUser(otherBroker.id, () => inventory.updateOwnProperty(property.id, revision, form)), /outra sessão/);
      await assert.rejects(asUser(otherBroker.id, () => inventory.updateOwnPropertyStatus(property.id, revision, "arquivado")), /outra sessão/);
      const archived = await asUser(otherBroker.id, () => inventory.updateOwnPropertyStatus(property.id, saved.property.updatedAt.toISOString(), "arquivado"));
      assert.equal(archived.property.status, "arquivado");
      const history = await asUser(owner.id, () => actions.getMarketplaceData({ section: "termo" }));
      assert.ok(history.partnerships.some(item => item.id === partnership.id));
      const network = await asUser(admin.id, () => actions.getMarketplaceData({ section: "radar" }));
      assert.ok(!network.properties.some(item => item.id === property.id));
      const archivedOwn = await asUser(otherBroker.id, () => inventory.getOwnProperties({ status: "arquivado" }));
      assert.ok(archivedOwn.items.some(item => item.id === property.id));
      const restored = await asUser(otherBroker.id, () => inventory.updateOwnPropertyStatus(property.id, archived.property.updatedAt.toISOString(), "disponivel"));
      assert.equal(restored.property.ownerPhone, "11944443333");
      const visible = await asUser(admin.id, () => actions.getMarketplaceData({ section: "vitrine", search: "Título atualizado" }));
      assert.ok(visible.properties.some(item => item.id === property.id));
      await assert.rejects(asUser(owner.id, () => inventory.updateOwnPropertyStatus(property.id, restored.property.updatedAt.toISOString(), "disponivel")), /assinatura/);
    } finally { await db.delete(properties).where(eq(properties.id, property.id)); }
  });

  await t.test("recuperação mantém resposta genérica, envia link sem expor token e limita solicitações", async () => {
    const recovery = await import("../src/lib/actions/password-recovery");
    const { passwordResetTokens } = await import("../src/lib/db");
    const { resetTokenHash, RESET_MESSAGE } = await import("../src/lib/password-recovery");
    const originalFetch = globalThis.fetch;
    const envKeys = ["RESEND_API_KEY", "NEGOCIAR_LAR_EMAIL_FROM", "NEGOCIAR_LAR_APP_URL"] as const;
    const previous = envKeys.map(key => process.env[key]);
    process.env.RESEND_API_KEY = "fake-key-test-only";
    process.env.NEGOCIAR_LAR_EMAIL_FROM = "NegociaLar <test@example.test>";
    process.env.NEGOCIAR_LAR_APP_URL = "https://example.test";
    const messages: { to: string[]; text: string }[] = [];
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      messages.push(JSON.parse(String(options?.body)));
      return new Response(JSON.stringify({ id: "test-only" }), { status: 200 });
    };
    const unknownEmail = `unknown-${suffix}@example.test`;
    const keyHashes = [`recovery-account:${owner.email}`, `recovery-account:${unknownEmail}`, "recovery-address:unknown"].map(key => createHash("sha256").update(key).digest("hex"));
    try {
      const missing = await asUser(owner.id, () => recovery.requestPasswordReset(unknownEmail));
      const known = await asUser(owner.id, () => recovery.requestPasswordReset(owner.email.toUpperCase()));
      assert.deepEqual(missing, known); assert.equal(known.message, RESET_MESSAGE);
      assert.equal(messages.length, 1); assert.deepEqual(messages[0].to, [owner.email]);
      const token = messages[0].text.match(/recuperar-senha#([a-f0-9]{64})/)?.[1];
      assert.ok(token);
      const [stored] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, owner.id));
      assert.equal(stored.tokenHash, resetTokenHash(token)); assert.notEqual(stored.tokenHash, token);
      assert.ok(stored.expiresAt.getTime() > Date.now() + 29 * 60_000);
      for (let i = 0; i < 5; i++) assert.deepEqual(await asUser(owner.id, () => recovery.requestPasswordReset(owner.email)), known);
      assert.equal(messages.length, 3);
      await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, keyHashes));
      globalThis.fetch = async () => new Response("provider failure", { status: 500 });
      const before = (await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, owner.id))).length;
      assert.deepEqual(await asUser(owner.id, () => recovery.requestPasswordReset(owner.email)), known);
      assert.equal((await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, owner.id))).length, before);
    } finally {
      globalThis.fetch = originalFetch;
      envKeys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, owner.id));
      await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, keyHashes));
    }
  });

  await t.test("link de senha expira, é usado uma vez e revoga sessões e outros links", async () => {
    const recovery = await import("../src/lib/actions/password-recovery");
    const { passwordResetTokens } = await import("../src/lib/db");
    const { createResetToken } = await import("../src/lib/password-recovery");
    const { verifyPassword } = await import("../src/lib/auth");
    const [account] = await db.insert(users).values({ name: "Recuperação", email: `recovery-${suffix}@example.test`, creci: "12345F", whatsapp: "11944443333", city: "São Paulo", verificationStatus: "aprovado" }).returning();
    registeredIds.push(account.id);
    const expired = createResetToken(), valid = createResetToken(), second = createResetToken();
    await db.insert(passwordResetTokens).values([expired, valid, second].map((reset, index) => ({ tokenHash: reset.tokenHash, userId: account.id, sessionVersion: 0, expiresAt: index === 0 ? new Date(Date.now() - 1000) : reset.expiresAt })));
    const password = "Nova senha forte 2026!";
    const invalidResult = await asUser(account.id, () => recovery.resetPasswordForm("a".repeat(64), password));
    assert.deepEqual(invalidResult, { success: false, error: "Link inválido ou expirado. Solicite uma nova recuperação de senha." });
    await assert.rejects(asUser(account.id, () => recovery.resetPassword(expired.token, password)), /inválido ou expirado/);
    await assert.rejects(asUser(account.id, () => recovery.resetPassword(valid.token, "curta")), /12 e 200/);
    const attempts = await Promise.allSettled([asUser(account.id, () => recovery.resetPassword(valid.token, password)), asUser(account.id, () => recovery.resetPassword(valid.token, password))]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    await assert.rejects(asUser(account.id, () => recovery.resetPassword(second.token, password)), /inválido ou expirado/);
    const [changed] = await db.select().from(users).where(eq(users.id, account.id));
    assert.equal(changed.sessionVersion, 1); assert.ok(await verifyPassword(password, changed.passwordHash));
    assert.equal(await asUser(account.id, () => actions.getCurrentUserId()), null);
    assert.equal(await asUser(account.id, () => actions.getCurrentUserId(), { version: 1 }), account.id);
    const old = createResetToken();
    await db.insert(passwordResetTokens).values({ tokenHash: old.tokenHash, userId: account.id, sessionVersion: 0, expiresAt: old.expiresAt });
    await assert.rejects(asUser(account.id, () => recovery.resetPassword(old.token, password)), /inválido ou expirado/);
    await db.update(users).set({ verificationStatus: "suspenso" }).where(eq(users.id, account.id));
    const suspended = createResetToken();
    await db.insert(passwordResetTokens).values({ tokenHash: suspended.tokenHash, userId: account.id, sessionVersion: 1, expiresAt: suspended.expiresAt });
    await assert.rejects(asUser(account.id, () => recovery.resetPassword(suspended.token, password)), /inválido ou expirado/);
  });

  await t.test("um corretor não lê nem altera leads e notificações de outra conta", async () => {
    const updatedLead = {
      fullName: "Cliente alterado",
      phone: "11988887777",
      leadType: "comprador",
      source: "indicacao",
    };
    await assert.rejects(asUser(otherBroker.id, () => actions.updateLead(ownerLead.id, updatedLead)), /Lead não encontrado/);
    await assert.rejects(asUser(otherBroker.id, () => actions.updateLeadStage(ownerLead.id, "perdido", "teste")), /Lead não encontrado/);
    await assert.rejects(asUser(otherBroker.id, () => actions.addLeadActivity({
      leadId: ownerLead.id,
      activityType: "nota",
      description: "Tentativa de acesso cruzado.",
    })), /Lead não encontrado/);
    await assert.rejects(asUser(otherBroker.id, () => actions.completeLeadFollowUp(ownerLead.id)), /Lead não encontrado/);

    await asUser(otherBroker.id, () => actions.markNotificationAsRead(ownerNotification.id));
    const [notification] = await db.select({ read: notifications.read }).from(notifications).where(eq(notifications.id, ownerNotification.id));
    assert.equal(notification.read, false, "a notificação de outra conta deve continuar não lida");
  });

  await t.test("documentação e modelos permanecem privados por corretor", async () => {
    const data = {propertyId:null, propertyTitle:"", city:"São Paulo", financing:false, fgts:false, statuses:{}, costs:[0,0,0,0,0,0], customGroups:{comprador:["Documento personalizado"], vendedor:[], imovel:[]}};
    await assert.rejects(asUser(otherBroker.id, () => actions.saveNegotiationDocuments(ownerLead.id, data)), /Cliente não encontrado/);
    const [privateLead] = await db.insert(leads).values({ownerUserId:otherBroker.id, fullName:"Cliente documentação", phone:"11900001234", normalizedPhone:"11900001234"}).returning();
    const result = await asUser(otherBroker.id, () => actions.saveNegotiationDocuments(privateLead.id, data));
    assert.deepEqual(result.documentation?.customGroups?.comprador, ["Documento personalizado"]);
    await asUser(otherBroker.id, () => actions.saveMyDocumentationTemplate({...data, propertyTitle:"Não guardar", statuses:{"comprador-0":"recebido"}}));
    const template = await asUser(otherBroker.id, () => actions.getMyDocumentationTemplate());
    assert.equal(template?.propertyTitle, ""); assert.deepEqual(template?.statuses, {});
    assert.equal(await asUser(admin.id, () => actions.getMyDocumentationTemplate()), null);
    await db.delete(leads).where(eq(leads.id, privateLead.id));
  });

  await t.test("DVP e documentação seguem a visibilidade da vitrine", async () => {
    const [pendingCaptor] = await db.insert(users).values({name:"Captador pendente", email:`pending-${suffix}@example.test`, creci:"999999F", whatsapp:"11900001235", city:"São Paulo", verificationStatus:"pendente", subscriptionStatus:"ativo"}).returning();
    registeredIds.push(pendingCaptor.id);
    const base = {brokerId:admin.id, title:"Oferta para negociação", propertyType:"Apartamento", salePrice:"300000", city:`Negociação ${suffix}`, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Teste", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:true, status:"disponivel", purpose:"venda"};
    const [valid, sold, privateProperty, pendingProperty] = await db.insert(properties).values([base, {...base, status:"vendido"}, {...base, acceptsPartnership:false}, {...base, brokerId:pendingCaptor.id}]).returning();
    const [client] = await db.insert(leads).values({ownerUserId:otherBroker.id, fullName:"Cliente negociação", phone:"11900001236", normalizedPhone:"11900001236"}).returning();
    const documentation = {propertyId:valid.id, propertyTitle:"", city:"São Paulo", financing:false, fgts:false, statuses:{}, costs:[0,0,0,0,0,0]};
    const visit = {propertyId:valid.id, captorBrokerId:admin.id, partnerBrokerId:otherBroker.id, clientName:"Cliente teste", clientCpfPartial:"***.123.456-**", visitDate:new Date().toISOString(), commissionSplit:"50"};
    try {
      for (const property of [sold, privateProperty, pendingProperty]) {
        await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visit, propertyId:property.id, captorBrokerId:property.brokerId})), /Imóvel ou parceria inválidos/);
        await assert.rejects(asUser(otherBroker.id, () => actions.saveNegotiationDocuments(client.id, {...documentation, propertyId:property.id})), /Imóvel não disponível/);
      }
      await db.update(users).set({verificationStatus:"suspenso"}).where(eq(users.id, pendingCaptor.id));
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visit, propertyId:pendingProperty.id, captorBrokerId:pendingCaptor.id})), /Imóvel ou parceria inválidos/);
      const saved = await asUser(otherBroker.id, () => actions.saveNegotiationDocuments(client.id, documentation));
      assert.equal(saved.documentation.propertyTitle, valid.title);
      const certificate = await asUser(otherBroker.id, () => actions.createDvpCertificate(visit));
      assert.equal(certificate.certificate.propertyId, valid.id);
      // An owner can still document their own sold/private inventory.
      const [ownerClient] = await db.insert(leads).values({ownerUserId:admin.id, fullName:"Cliente captador", phone:"11900001237", normalizedPhone:"11900001237"}).returning();
      const own = await asUser(admin.id, () => actions.saveNegotiationDocuments(ownerClient.id, {...documentation, propertyId:sold.id}));
      assert.equal(own.documentation.propertyId, sold.id);
      await db.delete(leads).where(eq(leads.id, ownerClient.id));
      await db.update(users).set({nextBillingDate:new Date(Date.now()-86400000)}).where(eq(users.id, otherBroker.id));
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate(visit)), /assinatura/);
      await assert.rejects(asUser(otherBroker.id, () => actions.saveNegotiationDocuments(client.id, documentation)), /assinatura/);
    } finally {
      await db.update(users).set({nextBillingDate:referrerExpiry}).where(eq(users.id, otherBroker.id));
      await db.delete(properties).where(eq(properties.city, base.city));
      await db.delete(leads).where(eq(leads.id, client.id));
    }
  });

  await t.test("Radar e notificações excluem contas pendentes e suspensas", async () => {
    const [unapproved] = await db.insert(users).values({name:"Conta não aprovada", email:`radar-pending-${suffix}@example.test`, creci:"999998F", whatsapp:"11900001238", city:"São Paulo", verificationStatus:"pendente", subscriptionStatus:"ativo"}).returning();
    registeredIds.push(unapproved.id);
    const city = `Radar aprovação ${suffix}`;
    const [profile] = await db.insert(buyerProfiles).values({brokerId:unapproved.id, clientInternalName:"Cliente restrito", propertyType:"Apartamento", city, neighborhoods:["Centro"], maxBudget:"400000", minBedrooms:2, minParkingSpots:1, active:true}).returning();
    const base = {brokerId:unapproved.id, title:"Oferta restrita", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Teste", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:true, status:"disponivel", purpose:"venda"};
    const [property] = await db.insert(properties).values(base).returning();
    try {
      for (const status of ["pendente", "suspenso"]) {
        await db.update(users).set({verificationStatus:status}).where(eq(users.id, unapproved.id));
        const radar = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"radar"}));
        assert.ok(!radar.radarList.some(item => item.id === profile.id));
        assert.ok(!radar.properties.some(item => item.id === property.id));
      }
      await asUser(otherBroker.id, () => actions.createBuyerProfile({clientInternalName:"Procura aprovada", propertyType:"Apartamento", city, neighborhoods:["Centro"], maxBudget:"400000", minBedrooms:2, minParkingSpots:1}));
      const notices = await db.select().from(notifications).where(eq(notifications.userId, otherBroker.id));
      assert.ok(!notices.some(item => item.propertyId === property.id));
      await asUser(otherBroker.id, () => actions.createProperty({...base, bathrooms:1, suites:0, photos:[], splitPercentage:"50"}));
      const restrictedNotices = await db.select().from(notifications).where(eq(notifications.userId, unapproved.id));
      assert.equal(restrictedNotices.length, 0);
      await db.update(users).set({verificationStatus:"aprovado"}).where(eq(users.id, unapproved.id));
      const approved = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"radar"}));
      assert.ok(approved.radarList.some(item => item.id === profile.id));
    } finally {
      await db.delete(properties).where(eq(properties.city, city));
      await db.delete(buyerProfiles).where(eq(buyerProfiles.city, city));
    }
  });

  await t.test("vitrine pagina e filtra no servidor sem carregar dados de outras áreas", async () => {
    const city = `Paginação ${suffix}`;
    const base = {brokerId:admin.id, title:"Oferta paginada", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Teste", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:true, status:"disponivel", purpose:"venda"};
    await db.insert(properties).values(Array.from({length:25}, (_, index) => ({...base, title:`Oferta ${index}`})));
    await db.insert(properties).values({...base, title:"Incompatível", purpose:"aluguel"});
    try {
      const first = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"vitrine", search:city, purpose:"venda"}));
      const second = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"vitrine", search:city, purpose:"venda", page:2}));
      assert.equal(first.propertyTotal, 25); assert.equal(first.properties.length, 24); assert.equal(second.properties.length, 1);
      assert.ok(!first.properties.some(item => item.id === second.properties[0].id));
      assert.equal(first.leads.length, 0); assert.equal(first.radarList.length, 0); assert.equal(first.transactions.length, 0); assert.equal(first.partnerships.length, 0);
      const crm = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"crm"}));
      assert.ok(crm.properties.filter(item => item.city === city).length >= 25, "a paginação da vitrine não pode limitar os imóveis usados pelo CRM");
      const adminVitrine = await asUser(admin.id, () => actions.getMarketplaceData({section:"vitrine"}));
      assert.equal(adminVitrine.users.length, 1); assert.equal(adminVitrine.transactions.length, 0);
      const literal = await asUser(otherBroker.id, () => actions.getMarketplaceData({section:"vitrine", search:"%_"}));
      assert.equal(literal.properties.length, 0, "curingas digitados são texto literal");
    } finally { await db.delete(properties).where(eq(properties.city, city)); }
  });

  await t.test("Radar cruza todos os critérios nos dois sentidos e ignora imóveis fora da parceria", async () => {
    const city = `Cidade teste ${suffix}`;
    const base = {brokerId:admin.id, title:"Imóvel teste radar", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Imóvel fictício de testes", acceptsPartnership:true, status:"disponivel", purpose:"venda"};
    const [valid] = await db.insert(properties).values(base).returning();
    await db.insert(properties).values([
      {...base, propertyType:"Casa Solta"}, {...base, neighborhood:"Outro bairro"},
      {...base, status:"vendido"}, {...base, purpose:"aluguel"},
      {...base, acceptsPartnership:false}, {...base, salePrice:"900000"},
    ]);
    const profile = {clientInternalName:"Teste radar", propertyType:"Apartamento", city, neighborhoods:["Centro"], maxBudget:"400000", minBedrooms:2, minParkingSpots:1};
    await asUser(otherBroker.id, () => actions.createBuyerProfile(profile));
    const notices = await db.select().from(notifications).where(eq(notifications.userId, otherBroker.id));
    const notice = notices.find(row => row.type === "ai_match" && row.propertyId === valid.id);
    assert.ok(notice); assert.match(notice.title, /1 Imóveis Encontrados/);
    await asUser(admin.id, () => actions.createBuyerProfile(profile));
    const before = await db.select().from(notifications).where(eq(notifications.userId, admin.id));
    const form = {title:"Nova oferta radar", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, bathrooms:1, suites:0, areaM2:"80", description:"Imóvel de testes", photos:[], confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:true, splitPercentage:"50", purpose:"venda"};
    const created = await asUser(otherBroker.id, () => actions.createProperty(form));
    const after = await db.select().from(notifications).where(eq(notifications.userId, admin.id));
    assert.equal(after.length, before.length + 1); assert.ok(after.some(row => row.propertyId === created.property.id));
    await asUser(otherBroker.id, () => actions.createProperty({...form, acceptsPartnership:false}));
    await asUser(otherBroker.id, () => actions.createProperty({...form, purpose:"aluguel"}));
    const unchanged = await db.select().from(notifications).where(eq(notifications.userId, admin.id));
    assert.equal(unchanged.length, after.length);
    await db.delete(properties).where(eq(properties.city, city));
    await db.delete(buyerProfiles).where(eq(buyerProfiles.city, city));
  });

  await t.test("inventário privado não vaza para visitantes ou outras contas", async () => {
    const city = `Privacidade ${suffix}`;
    const base = {brokerId: otherBroker.id, title:"Inventário privado teste", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Teste", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:false, status:"disponivel", purpose:"venda"};
    const [privateProperty, sharedProperty, soldProperty] = await db.insert(properties).values([base, {...base, acceptsPartnership:true}, {...base, acceptsPartnership:true, status:"vendido"}]).returning();
    try {
      const visitor = await asUser("", () => actions.getMarketplaceData());
      assert.equal(visitor.properties.length, 0);
      const own = await asUser(otherBroker.id, () => actions.getMarketplaceData());
      assert.ok(own.properties.some(p => p.id === privateProperty.id));
      await db.update(users).set({subscriptionStatus:"ativo", nextBillingDate: new Date(Date.now()+86400000)}).where(eq(users.id, owner.id));
      const other = await asUser(owner.id, () => actions.getMarketplaceData());
      assert.ok(other.properties.some(p => p.id === sharedProperty.id));
      assert.ok(!other.properties.some(p => p.id === privateProperty.id || p.id === soldProperty.id));
      await db.update(users).set({subscriptionStatus:"pendente", nextBillingDate:null}).where(eq(users.id, owner.id));
      const inactive = await asUser(owner.id, () => actions.getMarketplaceData());
      assert.ok(!inactive.properties.some(p => p.id === sharedProperty.id));
    } finally {await db.delete(properties).where(eq(properties.city, city));}
  });

  await t.test("IA exige assinatura ativa e transmite somente resumo agregado da própria carteira", async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;
    let body = "";
    process.env.GEMINI_API_KEY = "test-only-fake-key";
    globalThis.fetch = async (_url, options) => {
      body = String(options?.body);
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:"Resposta de teste"}]},finishReason:"STOP"}]}));
    };
    try {
      await assert.rejects(asUser(owner.id, () => actions.askBrokerAssistant({question:"Como organizar minha carteira?",history:[]})), /assinatura|plano|acesso/i);
      const answer = await asUser(otherBroker.id, () => actions.askBrokerAssistant({question:"Como organizar minha carteira?",history:[]}));
      assert.equal(answer.text, "Resposta de teste");
      assert.ok(body.includes("sem nomes nem contatos: []"));
      assert.ok(!body.includes(ownerLead.fullName));
      assert.ok(!body.includes(ownerLead.phone));
    } finally {
      globalThis.fetch = originalFetch;
      if(originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test("o radar oculta dados internos do perfil de busca de outra conta", async () => {
    const result = await asUser(otherBroker.id, () => actions.getMarketplaceData());
    assert.equal(result.leads.some((lead: { id: string }) => lead.id === ownerLead.id), false);
    assert.equal(result.users.some((user: { id: string }) => user.id === owner.id), false);
    assert.equal(result.transactions.length, 0);
    const sharedProfile = result.radarList.find((profile: { id: string }) => profile.id === ownerProfile.id);
    assert.ok(sharedProfile);
    assert.equal(sharedProfile.clientInternalName, "Cliente parceiro");
    assert.equal(sharedProfile.notes, null);
  });

  await t.test("somente admin confirma Pix e a confirmação ativa a assinatura sem aprovar o CRECI", async () => {
    await assert.rejects(asUser(otherBroker.id, () => actions.confirmPixSubscriptionPayment(payment.id)), /Ação restrita à administração/);
    let [savedPayment] = await db.select().from(transactions).where(eq(transactions.id, payment.id));
    let [savedUser] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(savedPayment.status, "pendente");
    assert.equal(savedUser.subscriptionStatus, "pendente");

    await asUser(admin.id, () => actions.confirmPixSubscriptionPayment(payment.id));
    [savedPayment] = await db.select().from(transactions).where(eq(transactions.id, payment.id));
    [savedUser] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(savedPayment.status, "pago");
    assert.equal(savedUser.subscriptionStatus, "ativo");
    assert.equal(savedUser.verificationStatus, "aprovado", "confirmar o Pix não deve alterar a aprovação de CRECI");
    await assert.rejects(asUser(admin.id, () => actions.confirmPixSubscriptionPayment(payment.id)), /não está pendente/);
  });
  await t.test("indicação concede exatamente 30 dias uma única vez após pagamento, e renovação pendente é reutilizada", async () => {
    const [referrer] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    const [referred] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(referrer.nextBillingDate!.getTime(), referrerExpiry.getTime() + 30 * 86_400_000);
    assert.ok(referred.referralRewardedAt);
    const subscription = await asUser(owner.id, () => actions.getMySubscription());
    assert.equal(subscription.user.id, owner.id);
    assert.ok(subscription.payments.every(item => item.id === payment.id));
    const renewals = await Promise.all([
      asUser(owner.id, () => actions.requestSubscriptionRenewal()),
      asUser(owner.id, () => actions.requestSubscriptionRenewal()),
    ]);
    assert.equal(renewals[0].payment.id, renewals[1].payment.id);
    await asUser(admin.id, () => actions.confirmPixSubscriptionPayment(renewals[0].payment.id));
    const [afterRenewal] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    assert.equal(afterRenewal.nextBillingDate!.getTime(), referrer.nextBillingDate!.getTime(), "a segunda cobrança não pode gerar outro bônus");
  });

  await t.test("cadastro inicia 30 dias gratuitos e vincula indicação sem cobrar nem premiar antes do pagamento", async () => {
    const [before] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    const startedAt = Date.now();
    const result = await asUser(owner.id, () => actions.registerUserWithPix({
      name: "Corretor teste cadastro", email: `new-${suffix}@example.test`, whatsapp: "11999990004",
      creci: "999999-F", state: "SP", city: "São Paulo", plan: "40", billingCycle: "annual",
      password: "test-only-password-12345", referralCode: otherBroker.id,
    }));
    registeredIds.push(result.user.id);
    assert.equal(result.user.role, "corretor");
    assert.equal(result.user.verificationStatus, "pendente");
    assert.equal(result.user.subscriptionStatus, "teste");
    assert.equal(result.user.billingCycle, "annual");
    assert.equal(result.user.referredBy, otherBroker.id);
    assert.equal(result.user.referralRewardedAt, null);
    assert.ok(result.user.nextBillingDate!.getTime() >= startedAt + 30 * 86_400_000);
    assert.ok(result.user.nextBillingDate!.getTime() <= Date.now() + 30 * 86_400_000);
    const initialPayments = await db.select().from(transactions).where(eq(transactions.userId, result.user.id));
    assert.equal(initialPayments.length, 0);
    const [after] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    assert.equal(after.nextBillingDate!.getTime(), before.nextBillingDate!.getTime());
  });

  await t.test("sessões adulteradas, expiradas e copiadas após logout são rejeitadas", async () => {
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId(), {signature:"f".repeat(64)}), null);
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId(), {signature:"a".repeat(64)+"zz"}), null);
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId(), {expiresAt:1}), null);
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId()), owner.id);
    await asUser(owner.id, () => actions.logoutUser());
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId()), null);
    assert.equal(await asUser(owner.id, () => actions.getCurrentUserId(), {version:1}), owner.id);
  });
  await t.test("tentativas simultâneas e troca de IP não contornam o limite de login", async () => {
    const previousVercel = process.env.VERCEL; process.env.VERCEL = "1";
    const email = `invalid-${suffix}@example.test`;
    const keyHashes: string[] = [];
    const hash = (key: string) => createHash("sha256").update(key).digest("hex");
    try {
      for (let i=0; i<8; i++) {
        const address = `192.0.2.${i+1}`;
        keyHashes.push(hash(`login-pair:${email}:${address}`), hash(`login-address:${address}`));
        await assert.rejects(asUser(owner.id, () => actions.loginUser(email,"wrong-password"), {address}), /incorretos/);
      }
      await assert.rejects(asUser(owner.id, () => actions.loginUser(email,"wrong-password"), {address:"192.0.2.9"}), /Muitas tentativas/);
      const concurrentEmail=`concurrent-${suffix}@example.test`, address="192.0.2.20";
      keyHashes.push(hash(`login-account:${concurrentEmail}`),hash(`login-pair:${concurrentEmail}:${address}`),hash(`login-address:${address}`));
      const results=await Promise.allSettled(Array.from({length:8},()=>asUser(owner.id,()=>actions.loginUser(concurrentEmail,"wrong-password"),{address})));
      assert.ok(results.filter(r=>r.status==="rejected" && /Muitas tentativas/.test(String(r.reason))).length >= 3);
    } finally {
      keyHashes.push(hash(`login-account:${email}`));
      await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash,keyHashes));
      if (previousVercel===undefined) delete process.env.VERCEL; else process.env.VERCEL=previousVercel;
    }
  });

});

function cryptoRandomSuffix() {
  return randomUUID().replaceAll("-", "").slice(0, 10);
}
