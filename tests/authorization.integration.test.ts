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

// As ações devolvem { ok, data } ou { ok, error }; aqui o erro volta a ser lançado para as asserções com rejects.
type Unwrapped<R> = [R] extends [{ ok: boolean }] ? (Extract<R, { ok: true }> extends { data: infer D } ? D : never) : R;
function strict<M extends object>(mod: M) {
  return new Proxy(mod, {
    get(target, key) {
      const value = Reflect.get(target, key) as unknown;
      if (typeof value !== "function") return value;
      const call = value as (...args: unknown[]) => Promise<unknown>;
      return async (...args: unknown[]) => {
        const result = await call(...args);
        if (result && typeof result === "object" && "ok" in result) {
          const outcome = result as { ok: boolean; data?: unknown; error?: string };
          if (!outcome.ok) throw new Error(outcome.error);
          return outcome.data;
        }
        return result;
      };
    },
  }) as { [K in keyof M]: M[K] extends (...args: infer A) => Promise<infer R> ? (...args: A) => Promise<Unwrapped<R>> : M[K] };
}

test("server actions enforce account ownership and admin-only Pix confirmation", {
  skip: !approvedLocalDatabase ? "Configure NEGOCIAR_LAR_TEST_DATABASE_URL with a disposable local test database." : false,
}, async (t) => {
  if (!testDatabaseUrl || !approvedLocalDatabase) return;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NEGOCIAR_LAR_SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
  (globalThis as typeof globalThis & { AsyncLocalStorage: typeof NodeAsyncLocalStorage }).AsyncLocalStorage = NodeAsyncLocalStorage;

  const [{ db, users, leads, buyerProfiles, transactions, notifications, properties, partnerships, partnershipActivities, partnershipTermAcceptances, authLoginAttempts, brokerFinanceEntries, dvpCertificates }, { and, eq, inArray, ne }, { workAsyncStorage }, { workUnitAsyncStorage }, rawActions, rawFinance, rawTerms, rawVisit] = await Promise.all([
    import("../src/lib/db"),
    import("drizzle-orm"),
    import("next/dist/server/app-render/work-async-storage.external"),
    import("next/dist/server/app-render/work-unit-async-storage.external"),
    import("../src/lib/actions"),
    import("../src/lib/actions/finance"),
    import("../src/lib/actions/partnership-terms"),
    import("../src/lib/actions/visit-control"),
  ]);
  const actions = strict(rawActions);
  const finance = strict(rawFinance);
  const terms = strict(rawTerms);
  const visit = strict(rawVisit);

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

  await t.test("as migrations criam toda coluna que o código usa (coluna sem migration derruba a produção)", async () => {
    const schema = await import("../src/lib/db/schema");
    const { getTableConfig, PgTable } = await import("drizzle-orm/pg-core");
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`);
    const existing = new Set(rows.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const tables = Object.values(schema as Record<string, unknown>).filter((value) => value instanceof PgTable) as InstanceType<typeof PgTable>[];
    const missing = tables
      .flatMap((table) => { const config = getTableConfig(table); return config.columns.map((column) => `${config.name}.${column.name}`); })
      .filter((column) => !existing.has(column));
    assert.deepEqual(missing, []);
  });

  await t.test("carteira permite edição e arquivamento apenas pelo dono, com controle de versão", async () => {
    const inventory = strict(await import("../src/lib/actions/property-inventory"));
    const [fotoSala, fotoFachada] = ["https://fotos.exemplo.test/sala.jpg", "https://fotos.exemplo.test/fachada.jpg"];
    const form = { title: "Imóvel editável", propertyType: "Apartamento", salePrice: "550000", city: "São Paulo", neighborhood: "Centro",
      bedrooms: 2, suites: 1, bathrooms: 2, parkingSpots: 1, areaM2: "80", description: "Descrição original",
      confidentialAddress: "Rua protegida, 123", ownerName: "Proprietário privado", ownerPhone: "11933332222",
      acceptsPartnership: true, splitPercentage: "50", photos: [], purpose: "venda" };
    const [property] = await db.insert(properties).values({ ...form, brokerId: otherBroker.id }).returning();
    const cleanupExtras: string[] = [];
    try {
      const [partnership] = await db.insert(partnerships).values({ propertyId: property.id, captorBrokerId: otherBroker.id, partnerBrokerId: owner.id }).returning();
      const revision = property.updatedAt.toISOString();
      const foreign = await asUser(owner.id, () => inventory.getOwnProperties());
      assert.ok(!foreign.items.some(item => item.id === property.id));
      await assert.rejects(asUser(owner.id, () => inventory.updateOwnProperty(property.id, revision, form)), /não encontrado/);
      await assert.rejects(asUser(owner.id, () => inventory.updateOwnPropertyStatus(property.id, revision, "arquivado")), /não encontrado/);
      // "Editar em Meus imóveis" (Vitrine) abre um imóvel pelo id — só se for da carteira de quem pede. Um imóvel a mais
      // para cada corretor: sem o filtro, a lista viria com eles (sem isso o teste passava por sorte).
      const extras = await db.insert(properties).values([{ ...form, title: "Outro do captador", status: "arquivado", brokerId: otherBroker.id },
        { ...form, title: "Do outro corretor", status: "arquivado", brokerId: owner.id }]).returning();
      cleanupExtras.push(...extras.map(item => item.id));
      assert.deepEqual((await asUser(owner.id, () => inventory.getOwnProperties({ id: property.id }))).items, []);
      assert.deepEqual((await asUser(otherBroker.id, () => inventory.getOwnProperties({ id: property.id }))).items.map(item => item.id), [property.id]);
      await assert.rejects(asUser(otherBroker.id, () => inventory.getOwnProperties({ id: "nao-e-um-id" })), /Filtros inválidos/);
      const own = await asUser(otherBroker.id, () => inventory.getOwnProperties({ search: "editável" }));
      assert.equal(own.items[0].ownerName, form.ownerName);
      const saved = await asUser(otherBroker.id, () => inventory.updateOwnProperty(property.id, revision,
        { ...form, title: "Título atualizado", salePrice: "575000", hideStreet: false, propertyAge: 0, ownerPhone: "11944443333",
          brokerId: owner.id, status: "vendido", partnershipModels: "ambos", confirmaParceria: true,
          photos: [fotoSala, fotoFachada], coverPhoto: fotoFachada } as unknown as typeof form));
      assert.equal(saved.property.title, "Título atualizado");
      // a ordem da grade é a gravada e a capa é a primeira foto — a capa mandada pelo navegador não manda
      assert.deepEqual(saved.property.photos, [fotoSala, fotoFachada]);
      assert.equal(saved.property.coverPhoto, fotoSala);
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
      // imóvel editado antes de 14/10/2026 ficou com a capa vazia: a Vitrine e o CRM mostram a primeira foto
      await db.update(properties).set({ coverPhoto: null }).where(eq(properties.id, property.id));
      const semCapa = await asUser(admin.id, () => actions.getMarketplaceData({ section: "vitrine", search: "Título atualizado" }));
      assert.equal(semCapa.properties.find(item => item.id === property.id)?.coverPhoto, fotoSala);
    } finally { for (const id of [property.id, ...cleanupExtras]) await db.delete(properties).where(eq(properties.id, id)); }
  });

  await t.test("visualização da Administração: vê corretores, pagamentos e feedback em modo leitura — as ações seguem só do administrador e a Vitrine não se amplia", async () => {
    // Imóvel só de carteira do otherBroker: o administrador vê; quem só visualiza a Administração, não.
    const [carteira] = await db.insert(properties).values({ title: "Só na carteira (teste)", propertyType: "Apartamento", salePrice: "300000", city: "São Paulo",
      neighborhood: "Centro", bedrooms: 1, suites: 0, bathrooms: 1, parkingSpots: 0, areaM2: "40", description: "Carteira", confidentialAddress: "Rua X, 1",
      ownerName: "Dono", ownerPhone: "11900000000", acceptsPartnership: false, splitPercentage: "50", photos: [], purpose: "venda", brokerId: otherBroker.id }).returning();
    try {
      // sem o acesso: a aba não traz ninguém além da própria pessoa
      const antes = await asUser(owner.id, () => actions.getMarketplaceData({ section: "admin" }));
      assert.deepEqual(antes.users.map((u) => u.id), [owner.id]);
      assert.deepEqual(antes.transactions, []);
      // só o administrador libera — nem a própria pessoa, nem outro corretor
      await assert.rejects(asUser(owner.id, () => actions.setAdminViewAccess(owner.id, true)), /restrita à administração/);
      await assert.rejects(asUser(otherBroker.id, () => actions.setAdminViewAccess(owner.id, true)), /restrita à administração/);
      await assert.rejects(asUser(admin.id, () => actions.setAdminViewAccess(admin.id, true)), /já é administrador/);
      const liberado = await asUser(admin.id, () => actions.setAdminViewAccess(owner.id, true));
      assert.equal(liberado.adminViewAccess, true);
      assert.equal(liberado.adminViewAccessBy, admin.id);
      // com o acesso: vê os corretores (e os pagamentos) da plataforma
      const depois = await asUser(owner.id, () => actions.getMarketplaceData({ section: "admin" }));
      assert.ok(depois.users.some((u) => u.id === admin.id) && depois.users.some((u) => u.id === otherBroker.id));
      assert.equal(depois.currentUser?.adminViewAccess, true);
      // 🔴 mas não age: aprovar, suspender, isentar, confirmar, estornar e liberar continuam recusados
      await assert.rejects(asUser(owner.id, () => actions.updateUserStatus(otherBroker.id, "suspenso")), /restrita à administração/);
      await assert.rejects(asUser(owner.id, () => actions.exemptUserFromBilling(otherBroker.id)), /restrita à administração/);
      await assert.rejects(asUser(owner.id, () => actions.setAdminViewAccess(otherBroker.id, true)), /restrita à administração/);
      // 🔴 e a Vitrine não se amplia: o imóvel só de carteira do outro corretor não aparece (para o administrador, sim)
      const vitrine = await asUser(owner.id, () => actions.getMarketplaceData({ section: "vitrine", search: "Só na carteira" }));
      assert.ok(!vitrine.properties.some((item) => item.id === carteira.id));
      const vitrineAdmin = await asUser(admin.id, () => actions.getMarketplaceData({ section: "vitrine", search: "Só na carteira" }));
      assert.ok(vitrineAdmin.properties.some((item) => item.id === carteira.id));
      // tirar o acesso volta ao escopo do corretor
      await asUser(admin.id, () => actions.setAdminViewAccess(owner.id, false));
      assert.deepEqual((await asUser(owner.id, () => actions.getMarketplaceData({ section: "admin" }))).users.map((u) => u.id), [owner.id]);
    } finally {
      await db.update(users).set({ adminViewAccess: false, adminViewAccessBy: null, adminViewAccessAt: null }).where(eq(users.id, owner.id));
      await db.delete(properties).where(eq(properties.id, carteira.id));
    }
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
    await asUser(otherBroker.id, () => actions.markAllNotificationsAsRead());
    const [notification] = await db.select({ read: notifications.read }).from(notifications).where(eq(notifications.id, ownerNotification.id));
    assert.equal(notification.read, false, "a notificação de outra conta deve continuar não lida");
    const [mine] = await db.insert(notifications).values({ userId: otherBroker.id, title: "Própria", message: "Teste", type: "sistema", read: false }).returning();
    await asUser(otherBroker.id, () => actions.markAllNotificationsAsRead());
    const [own] = await db.select({ read: notifications.read }).from(notifications).where(eq(notifications.id, mine.id));
    assert.equal(own.read, true, "marcar todas grava no banco as notificações da própria conta");
  });

  await t.test("a mensagem esperada volta como valor: em produção o Next esconde o texto de erro lançado", async () => {
    const email = `sem-conta-${suffix}@example.test`;
    const result = await asUser(owner.id, () => rawActions.loginUser(email, "senha-errada-de-teste"));
    assert.deepEqual(result, { ok: false, error: "E-mail ou senha incorretos." });
    const keyHashes = [`login-account:${email}`, `login-pair:${email}:unknown`].map(key => createHash("sha256").update(key).digest("hex"));
    await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, keyHashes));
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
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visit, visitDate:"2026-10-12T14:00"})), /data de visita válida/,
        "sem fuso o servidor leria o horário como UTC");
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visit, visitDate:new Date(Date.now() + 400 * 86_400_000).toISOString()})), /próximos 12 meses/);
      const certificate = await asUser(otherBroker.id, () => actions.createDvpCertificate(visit));
      assert.equal(certificate.certificate.propertyId, valid.id);
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visit, clientName:"  cliente TESTE "})), /já tem um registro de visita/,
        "o mesmo cliente não ganha um segundo registro para o mesmo imóvel");
      await assert.rejects(asUser(admin.id, () => actions.respondToPartnershipSplit(certificate.partnership.id, true, 2)), /mudou para a versão 1/,
        "a confirmação precisa ser da versão que o corretor viu");
      const answered = await asUser(admin.id, () => actions.respondToPartnershipSplit(certificate.partnership.id, true, 1));
      assert.ok(answered.partnership.captorAcceptedAt);
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
      await asUser(otherBroker.id, () => actions.createProperty({...base, bathrooms:1, suites:0, photos:[], splitPercentage:"50", condition:"usado", acceptsFinancing:true, state:"SP", partnershipModels:"ambos", confirmaParceria:true}));
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
    assert.ok(notice); assert.match(notice.title, /1 imóvel compatível/);
    await asUser(admin.id, () => actions.createBuyerProfile(profile));
    const before = await db.select().from(notifications).where(eq(notifications.userId, admin.id));
    const form = {title:"Nova oferta radar", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, bathrooms:1, suites:0, areaM2:"80", description:"Imóvel de testes", photos:[], condition:"usado", acceptsFinancing:true, state:"SP", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:true, splitPercentage:"50", purpose:"venda", partnershipModels:"ambos" as const, confirmaParceria:true};
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

  await t.test("limite de anúncios do plano vale no servidor, inclusive ao reativar um anúncio", async () => {
    const inventory = strict(await import("../src/lib/actions/property-inventory"));
    const city = `Limite ${suffix}`;
    const base = {brokerId: otherBroker.id, title:"Anúncio do limite", propertyType:"Apartamento", salePrice:"300000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, areaM2:"80", description:"Teste", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900001234", acceptsPartnership:false, status:"disponivel", purpose:"venda"};
    const active = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.brokerId, otherBroker.id), inArray(properties.status, ["disponivel", "em_negociacao"])));
    await db.insert(properties).values(Array.from({length: 10 - active.length}, (_, index) => ({...base, title:`Anúncio ${index}`, status: index % 2 ? "em_negociacao" : "disponivel"})));
    const [archived] = await db.insert(properties).values({...base, title:"Anúncio arquivado", status:"arquivado"}).returning();
    try {
      const { brokerId: _brokerId, status: _status, ...fields } = base;
      const form = {...fields, bathrooms:1, suites:0, photos:[], splitPercentage:"50", condition:"usado", acceptsFinancing:true, state:"SP", partnershipModels:"ambos" as const, confirmaParceria:true};
      await assert.rejects(asUser(otherBroker.id, () => actions.createProperty(form)), /permite 10 anúncios ativos e você já tem 10/);
      await assert.rejects(asUser(otherBroker.id, () => inventory.updateOwnPropertyStatus(archived.id, archived.updatedAt.toISOString(), "disponivel")), /permite 10 anúncios/);
      const sold = await asUser(otherBroker.id, () => inventory.updateOwnPropertyStatus(archived.id, archived.updatedAt.toISOString(), "vendido"));
      assert.equal(sold.property.status, "vendido", "trocar entre situações inativas não consome vaga");
      const page = await asUser(otherBroker.id, () => inventory.getOwnProperties());
      assert.equal(page.activeListings, 10); assert.equal(page.listingLimit, 10);
      await assert.rejects(asUser(otherBroker.id, () => actions.createProperty({...form, condition:undefined})), /condição do imóvel/);
    } finally { await db.delete(properties).where(eq(properties.city, city)); }
  });

  await t.test("condição de parceria: publicar exige escolher e confirmar; visita e revisão só com a divisão que o imóvel aceita — no servidor e no banco", async () => {
    const inventory = strict(await import("../src/lib/actions/property-inventory"));
    const city = `Condição ${suffix}`;
    const form = {title:"Imóvel com condição", propertyType:"Apartamento", salePrice:"400000", city, neighborhood:"Centro", bedrooms:2, parkingSpots:1, bathrooms:1, suites:0, areaM2:"70", description:"Teste da condição de parceria", photos:[], condition:"usado", acceptsFinancing:true, state:"SP", confidentialAddress:"Endereço fictício", ownerName:"Pessoa fictícia", ownerPhone:"11900000000", acceptsPartnership:true, purpose:"venda"};
    try {
      // publicar na rede: escolher a condição e confirmar — nada presumido
      await assert.rejects(asUser(otherBroker.id, () => actions.createProperty(form)), /condição de parceria/);
      await assert.rejects(asUser(otherBroker.id, () => actions.createProperty({...form, partnershipModels:"50_50"})), /confirme que este imóvel aceita parceria/);
      const so40 = (await asUser(otherBroker.id, () => actions.createProperty({...form, title:"Imóvel de outro corretor", partnershipModels:"40_40_20", confirmaParceria:true}))).property;
      assert.equal(so40.partnershipModels, "40_40_20"); assert.ok(so40.partnershipConfirmedAt); assert.equal(so40.partnershipReviewPending, false);
      assert.equal(so40.splitPercentage, "40.00", "o percentual do captador acompanha a condição");
      const carteira = (await asUser(otherBroker.id, () => actions.createProperty({...form, title:"Só na carteira", acceptsPartnership:false}))).property;
      assert.equal(carteira.partnershipConfirmedAt, null, "na carteira não se pede confirmação");

      // registro de visita e revisão: só a divisão que o imóvel aceita
      const [so50] = await db.insert(properties).values({...form, brokerId:admin.id, title:"Só 50/50", partnershipModels:"50_50", partnershipConfirmedAt:new Date(), partnershipReviewPending:false}).returning();
      const visita = {propertyId:so50.id, captorBrokerId:admin.id, partnerBrokerId:otherBroker.id, clientName:"Cliente da condição", clientCpfPartial:"***.123.456-**", visitDate:new Date().toISOString(), commissionSplit:"50"};
      await assert.rejects(asUser(otherBroker.id, () => actions.createDvpCertificate({...visita, commissionModel:"three_party_referral_40_40_20", externalReferrerName:"Indicador fictício", externalReferrerCreci:"TESTE-03"})), /só faz parceria 50\/50/);
      await asUser(otherBroker.id, () => actions.createDvpCertificate({...visita, commissionModel:"two_party_50_50"}));
      const [parceria] = await db.select().from(partnerships).where(eq(partnerships.propertyId, so50.id)).limit(1);
      assert.equal(parceria.commissionModel, "two_party_50_50");
      await assert.rejects(asUser(otherBroker.id, () => actions.revisePartnershipCommission(parceria.id, { commissionModel:"three_party_referral_40_40_20", externalReferrerName:"Indicador fictício", externalReferrerCreci:"TESTE-03" })), /só faz parceria 50\/50/);
      // o banco recusa mesmo sem passar pelas ações (o Drizzle embrulha: a frase do banco vem em `cause`)
      const doBanco = (frase: RegExp) => (e: unknown) => frase.test(String((e as { cause?: { message?: string } }).cause?.message ?? e));
      await assert.rejects(db.update(partnerships).set({ commissionModel:"three_party_referral_40_40_20" }).where(eq(partnerships.id, parceria.id)), doBanco(/só faz parceria 50\/50/));
      await assert.rejects(db.insert(partnerships).values({ propertyId:so40.id, captorBrokerId:otherBroker.id, partnerBrokerId:admin.id, commissionModel:"two_party_50_50" }), doBanco(/só faz parceria 40\/40\/20/));

      // imóvel de antes (revisão pendente): salvar na rede pede a confirmação, que encerra a revisão
      const [antigo] = await db.insert(properties).values({...form, brokerId:otherBroker.id, title:"Imóvel antigo"}).returning();
      assert.equal(antigo.partnershipReviewPending, true); assert.equal(antigo.partnershipModels, "ambos");
      const revisao = antigo.updatedAt.toISOString();
      await assert.rejects(asUser(otherBroker.id, () => inventory.updateOwnProperty(antigo.id, revisao, {...form, partnershipModels:"50_50"})), /Confirme que este imóvel aceita parceria/);
      const revisado = (await asUser(otherBroker.id, () => inventory.updateOwnProperty(antigo.id, revisao, {...form, partnershipModels:"50_50", confirmaParceria:true}))).property;
      assert.equal(revisado.partnershipReviewPending, false); assert.ok(revisado.partnershipConfirmedAt); assert.equal(revisado.partnershipModels, "50_50");
      assert.equal(revisado.splitPercentage, "50.00");
    } finally {
      await db.delete(dvpCertificates).where(inArray(dvpCertificates.propertyId, db.select({ id: properties.id }).from(properties).where(eq(properties.city, city))));
      await db.delete(properties).where(eq(properties.city, city));
    }
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

  await t.test("estorno desfaz exatamente a confirmação, do mais recente para o mais antigo, e retira o bônus de indicação", async () => {
    const [first] = await db.select().from(transactions).where(eq(transactions.id, payment.id));
    const [renewal] = await db.select().from(transactions).where(and(eq(transactions.userId, owner.id), eq(transactions.status, "pago"), ne(transactions.id, payment.id)));
    assert.equal(first.confirmedBy, admin.id); assert.ok(first.confirmedAt); assert.equal(first.referralRewardedUserId, otherBroker.id);
    await assert.rejects(asUser(otherBroker.id, () => actions.refundPixSubscriptionPayment(renewal.id, "Pagamento devolvido")), /restrita à administração/);
    await assert.rejects(asUser(admin.id, () => actions.refundPixSubscriptionPayment(renewal.id, "x")), /motivo/);
    await assert.rejects(asUser(admin.id, () => actions.refundPixSubscriptionPayment(first.id, "Pagamento devolvido")), /Estorne primeiro o pagamento mais recente/);
    await asUser(admin.id, () => actions.refundPixSubscriptionPayment(renewal.id, "Pagamento devolvido ao corretor"));
    let [subscriber] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(subscriber.nextBillingDate!.getTime(), first.periodEnd!.getTime());
    assert.equal(subscriber.subscriptionStatus, "ativo");
    await asUser(admin.id, () => actions.refundPixSubscriptionPayment(first.id, "Pix devolvido ao corretor"));
    [subscriber] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(subscriber.nextBillingDate, null);
    assert.equal(subscriber.subscriptionStatus, "pendente");
    assert.equal(subscriber.referralRewardedAt, null, "um novo primeiro pagamento pode premiar a indicação de novo");
    const [referrer] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    assert.equal(referrer.nextBillingDate!.getTime(), referrerExpiry.getTime(), "o indicador volta à data anterior ao bônus");
    const [refunded] = await db.select().from(transactions).where(eq(transactions.id, first.id));
    assert.equal(refunded.status, "estornado"); assert.equal(refunded.refundedBy, admin.id); assert.equal(refunded.refundReason, "Pix devolvido ao corretor");
    await assert.rejects(asUser(admin.id, () => actions.refundPixSubscriptionPayment(first.id, "De novo")), /Só mensalidades Pix confirmadas/);
  });

  await t.test("cadastro inicia 30 dias gratuitos e vincula indicação sem cobrar nem premiar antes do pagamento", async () => {
    const [before] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    await assert.rejects(asUser(owner.id, () => actions.registerUserWithPix({
      name: "Corretor teste UF", email: `uf-${suffix}@example.test`, whatsapp: "11999990005",
      creci: "999998-F", state: "XX", city: "São Paulo", plan: "40", billingCycle: "monthly",
      password: "test-only-password-12345",
    })), /estado/);
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
    assert.equal(result.user.avatarUrl, null, "conta nova não recebe foto de outra pessoa");
    await assert.rejects(asUser(owner.id, () => actions.registerUserWithPix({
      name: "Corretor repetido", email: `NEW-${suffix}@example.test`, whatsapp: "11999990006",
      creci: "999997-F", state: "BA", city: "Salvador", plan: "10", billingCycle: "monthly",
      password: "test-only-password-12345",
    })), /já tem cadastro/);
    const initialPayments = await db.select().from(transactions).where(eq(transactions.userId, result.user.id));
    assert.equal(initialPayments.length, 0);
    const [after] = await db.select().from(users).where(eq(users.id, otherBroker.id));
    assert.equal(after.nextBillingDate!.getTime(), before.nextBillingDate!.getTime());
  });

  await t.test("isenção de cobrança: só admin isenta; conta isenta fica sem vencimento, não confirma Pix e o estorno não corta o acesso", async () => {
    const [partner] = await db.insert(users).values({
      name: "Teste Sócia", email: `socia-${suffix}@example.test`, creci: `3${suffix.slice(0, 6)}F`, whatsapp: "11999990006",
      city: "São Paulo", state: "SP", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "teste",
      nextBillingDate: new Date(Date.now() + 2 * 86_400_000), plan: "40", monthlyFee: "150.00",
    }).returning();
    registeredIds.push(partner.id);
    // Pix confirmado antes do registro de estorno (sem confirmed_at e period_end) e um Pix aguardando conferência.
    const [legacy] = await db.insert(transactions).values({ userId: partner.id, amount: "150.00", type: "mensalidade_pro", paymentMethod: "pix", status: "pago", description: "Pix antigo de teste" }).returning();
    const [waiting] = await db.insert(transactions).values({ userId: partner.id, amount: "150.00", type: "mensalidade_pro", paymentMethod: "pix", status: "pendente", description: "Pix aguardando" }).returning();

    await assert.rejects(asUser(otherBroker.id, () => actions.exemptUserFromBilling(partner.id)), /restrita à administração/);
    await assert.rejects(asUser(partner.id, () => actions.exemptUserFromBilling(partner.id)), /restrita à administração/);
    await asUser(admin.id, () => actions.exemptUserFromBilling(partner.id));
    const [exempted] = await db.select().from(users).where(eq(users.id, partner.id));
    assert.equal(exempted.subscriptionStatus, "ativo");
    assert.equal(exempted.nextBillingDate, null);
    assert.equal(exempted.monthlyFee, "0.00");
    assert.equal(exempted.billingExemptBy, admin.id);
    assert.ok(exempted.billingExemptAt);
    await assert.rejects(asUser(admin.id, () => actions.exemptUserFromBilling(partner.id)), /já está sem cobrança/);

    await assert.rejects(asUser(admin.id, () => actions.confirmPixSubscriptionPayment(waiting.id)), /não tem cobrança/);
    await assert.rejects(asUser(partner.id, () => actions.requestSubscriptionRenewal()), /não tem cobrança/);
    const [stillWaiting] = await db.select().from(users).where(eq(users.id, partner.id));
    assert.equal(stillWaiting.nextBillingDate, null, "confirmar Pix de conta isenta poria um vencimento de volta");

    await asUser(admin.id, () => actions.refundPixSubscriptionPayment(legacy.id, "Pagamento de teste da equipe"));
    const [afterRefund] = await db.select().from(users).where(eq(users.id, partner.id));
    assert.equal(afterRefund.subscriptionStatus, "ativo");
    assert.equal(afterRefund.nextBillingDate, null);
    const [refunded] = await db.select().from(transactions).where(eq(transactions.id, legacy.id));
    assert.equal(refunded.status, "estornado");
    assert.equal(refunded.refundedBy, admin.id);
  });

  await t.test("primeira cobrança escolhe mensal ou anual; depois do primeiro pagamento o ciclo fica", async () => {
    const [trial] = await db.insert(users).values({
      name: "Teste Ciclo", email: `ciclo-${suffix}@example.test`, creci: `4${suffix.slice(0, 6)}F`, whatsapp: "11999990007",
      city: "São Paulo", state: "SP", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "teste",
      nextBillingDate: new Date(Date.now() + 2 * 86_400_000), plan: "40", billingCycle: "monthly", monthlyFee: "150.00",
    }).returning();
    registeredIds.push(trial.id);
    const first = await asUser(trial.id, () => actions.requestSubscriptionRenewal("annual"));
    let [charge] = await db.select().from(transactions).where(eq(transactions.id, first.payment.id));
    assert.equal(charge.amount, "1650.00");
    const [chosen] = await db.select().from(users).where(eq(users.id, trial.id));
    assert.equal(chosen.billingCycle, "annual");
    assert.equal(chosen.monthlyFee, "137.50");
    let view = await asUser(trial.id, () => actions.getMarketplaceData({ section: "vitrine" }));
    assert.equal(view.currentUser?.hasPaid, false);
    assert.equal(view.currentUser?.pendingPix, true);
    await assert.rejects(asUser(trial.id, () => actions.requestSubscriptionRenewal("monthly")), /aguardando a conferência/);

    await asUser(admin.id, () => actions.confirmPixSubscriptionPayment(first.payment.id));
    view = await asUser(trial.id, () => actions.getMarketplaceData({ section: "vitrine" }));
    assert.equal(view.currentUser?.hasPaid, true);
    assert.equal(view.currentUser?.pendingPix, false);
    await assert.rejects(asUser(trial.id, () => actions.requestSubscriptionRenewal("monthly")), /ciclo é escolhido no primeiro pagamento/);
    const renewal = await asUser(trial.id, () => actions.requestSubscriptionRenewal());
    [charge] = await db.select().from(transactions).where(eq(transactions.id, renewal.payment.id));
    assert.equal(charge.amount, "1650.00");
  });

  await t.test("financeiro é privado por corretor: outra conta não lê, não altera, não exclui nem vincula cliente alheio", async () => {
    const broker = (n: number, extra: Record<string, unknown> = {}) => ({
      name: `Teste Financeiro ${n}`, email: `fin${n}-${suffix}@example.test`, creci: `${5 + n}${suffix.slice(0, 6)}F`, whatsapp: `1199999001${n}`,
      city: "São Paulo", state: "SP", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "ativo", nextBillingDate: null, plan: "10", ...extra,
    });
    const [alice] = await db.insert(users).values(broker(1)).returning();
    const [bruno] = await db.insert(users).values(broker(2)).returning();
    const [expired] = await db.insert(users).values(broker(3, { nextBillingDate: new Date(Date.now() - 86_400_000) })).returning();
    registeredIds.push(alice.id, bruno.id, expired.id);
    const [aliceClient] = await db.insert(leads).values({ ownerUserId: alice.id, fullName: "Cliente da Alice", phone: "11 98888-0001", normalizedPhone: "11988880001" }).returning();

    await finance.createFinanceEntry({ kind: "receita", description: "Comissão parcelada", category: "comissao_venda", amount: "1000", dueDate: "2026-01-31", paidAt: "2026-01-31", leadId: aliceClient.id, repeatMonths: 3 })
      .then(() => assert.fail("sem sessão não pode lançar"), (error: Error) => assert.match(error.message, /.+/));
    await asUser(alice.id, () => finance.createFinanceEntry({ kind: "receita", description: "Comissão parcelada", category: "comissao_venda", amount: "1000", dueDate: "2026-01-31", paidAt: "2026-01-31", leadId: aliceClient.id, repeatMonths: 3 }));
    const created = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.ownerUserId, alice.id)).orderBy(brokerFinanceEntries.dueDate);
    assert.deepEqual(created.map((row) => [row.dueDate, row.paidAt, row.description]), [
      ["2026-01-31", "2026-01-31", "Comissão parcelada (1/3)"],
      ["2026-02-28", null, "Comissão parcelada (2/3)"],
      ["2026-03-31", null, "Comissão parcelada (3/3)"],
    ]);

    const february = await asUser(alice.id, () => finance.getFinancePeriod({ from: "2026-02", to: "2026-02" }));
    assert.equal(february.entries.length, 1);
    assert.equal(february.entries[0].leadName, "Cliente da Alice");
    assert.ok(february.clients.some((client) => client.id === aliceClient.id));
    assert.equal(february.overdue.find((row) => row.kind === "receita")?.count, 2, "fevereiro e março estão em aberto com data passada");
    const brunoView = await asUser(bruno.id, () => finance.getFinancePeriod({ from: "2026-02", to: "2026-02" }));
    assert.equal(brunoView.entries.length, 0);
    assert.equal(brunoView.clients.length, 0);
    await assert.rejects(asUser(bruno.id, () => finance.getFinancePeriod({ from: "2026-13", to: "2026-13" })), /Período inválido/);
    await assert.rejects(asUser(bruno.id, () => finance.getFinancePeriod({ from: "2026-05", to: "2026-02" })), /mês inicial/);
    await assert.rejects(asUser(bruno.id, () => finance.getFinancePeriod({ from: "2024-01", to: "2026-02" })), /até 24 meses/);
    // Período de 3 meses: totais por mês para o gráfico (6 meses, terminando em março) e o período anterior para comparar.
    const quarter = await asUser(alice.id, () => finance.getFinancePeriod({ from: "2026-01", to: "2026-03" }));
    assert.equal(quarter.entries.length, 3);
    assert.deepEqual(quarter.monthly.map((row) => [row.month, row.kind, row.total, row.realized]).sort(), [
      ["2026-01", "receita", "1000.00", "1000.00"], ["2026-02", "receita", "1000.00", "0"], ["2026-03", "receita", "1000.00", "0"],
    ]);
    assert.deepEqual([quarter.previous.from, quarter.previous.to, quarter.previous.totals.length], ["2025-10", "2025-12", 0]);
    assert.equal((await asUser(bruno.id, () => finance.getFinancePeriod({ from: "2026-01", to: "2026-03" }))).monthly.length, 0);

    const target = created[1];
    await assert.rejects(asUser(bruno.id, () => finance.updateFinanceEntry(target.id, { kind: "despesa", description: "Alterado", category: "impostos", amount: "1", dueDate: "2026-02-28" })), /não encontrado/);
    await assert.rejects(asUser(bruno.id, () => finance.setFinanceEntryPaid(target.id, "2026-02-28")), /não encontrado/);
    await assert.rejects(asUser(bruno.id, () => finance.deleteFinanceEntry(target.id)), /não encontrado/);
    await assert.rejects(asUser(bruno.id, () => finance.createFinanceEntry({ kind: "receita", description: "Vínculo alheio", category: "comissao_venda", amount: "10", dueDate: "2026-02-01", leadId: aliceClient.id })), /Cliente não encontrado na sua carteira/);
    const [untouched] = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.id, target.id));
    assert.equal(untouched.paidAt, null);
    assert.equal(untouched.description, "Comissão parcelada (2/3)");

    await asUser(alice.id, () => finance.setFinanceEntryPaid(target.id, "2026-03-02"));
    let [paid] = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.id, target.id));
    assert.equal(paid.paidAt, "2026-03-02");
    await asUser(alice.id, () => finance.setFinanceEntryPaid(target.id, null));
    [paid] = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.id, target.id));
    assert.equal(paid.paidAt, null);
    await asUser(alice.id, () => finance.updateFinanceEntry(target.id, { kind: "despesa", description: "Virou despesa", category: "impostos", amount: "12.5", dueDate: "2026-02-10" }));
    [paid] = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.id, target.id));
    assert.deepEqual([paid.kind, paid.amount, paid.dueDate, paid.leadId], ["despesa", "12.50", "2026-02-10", null]);

    // Conta vencida continua vendo os lançamentos, mas não lança.
    await assert.rejects(asUser(expired.id, () => finance.createFinanceEntry({ kind: "despesa", description: "Combustível", category: "deslocamento", amount: "50", dueDate: "2026-10-01" })), /Ative sua assinatura/);
    assert.equal((await asUser(expired.id, () => finance.getFinancePeriod({}))).entries.length, 0);

    await asUser(alice.id, () => finance.deleteFinanceEntry(target.id));
    assert.equal((await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.id, target.id))).length, 0);
  });

  await t.test("fechar parceria exige o valor da comissão e lança a parte de cada corretor no Financeiro, uma vez só", async () => {
    const broker = (n: number) => ({
      name: `Teste Fechamento ${n}`, email: `close${n}-${suffix}@example.test`, creci: `${7 + n}${suffix.slice(0, 6)}F`, whatsapp: `1199999002${n}`,
      city: "São Paulo", state: "SP", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "ativo", nextBillingDate: null, plan: "10",
    });
    const [captor] = await db.insert(users).values(broker(1)).returning();
    const [partner] = await db.insert(users).values(broker(2)).returning();
    const [outsider] = await db.insert(users).values(broker(3)).returning();
    registeredIds.push(captor.id, partner.id, outsider.id);
    const [property] = await db.insert(properties).values({ brokerId: captor.id, title: "Casa da parceria", propertyType: "Casa Solta", salePrice: "500000",
      city: "São Paulo", neighborhood: "Centro", bedrooms: 3, parkingSpots: 2, areaM2: "150", description: "Teste", confidentialAddress: "Endereço fictício",
      ownerName: "Pessoa fictícia", ownerPhone: "11900002233", acceptsPartnership: true, status: "disponivel", purpose: "venda" }).returning();
    try {
      const [partnership] = await db.insert(partnerships).values({ propertyId: property.id, captorBrokerId: captor.id, partnerBrokerId: partner.id,
        status: "em_negociacao", commissionStatus: "confirmada", commissionModel: "three_party_referral_40_40_20",
        captorCommissionPercent: "40.00", partnerCommissionPercent: "40.00", referrerCommissionPercent: "20.00",
        externalReferrerName: "Indicador Teste", externalReferrerCreci: "TESTE-01" }).returning();
      const closing = { commissionTotal: "30000", expectedDate: "2026-11-20" };
      await assert.rejects(asUser(outsider.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "", closing)), /não encontrada/);
      await assert.rejects(asUser(partner.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "")), /valor total da comissão/);
      await assert.rejects(asUser(partner.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "", { commissionTotal: "0", expectedDate: "2026-11-20" })), /valor total da comissão/);
      await assert.rejects(asUser(partner.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "", { commissionTotal: "30000", expectedDate: "20/11/2026" })), /data prevista/);
      assert.equal((await db.select().from(partnerships).where(eq(partnerships.id, partnership.id)))[0].status, "em_negociacao");

      const closed = await asUser(partner.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "Escritura marcada", closing));
      assert.equal(closed.forecastCents, 1_200_000);
      const [saved] = await db.select().from(partnerships).where(eq(partnerships.id, partnership.id));
      assert.deepEqual([saved.status, saved.commissionTotal, saved.commissionExpectedDate], ["fechado", "30000.00", "2026-11-20"]);
      const forecasts = await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.partnershipId, partnership.id));
      assert.deepEqual(forecasts.map((row) => [row.ownerUserId, row.kind, row.category, row.amount, row.dueDate, row.paidAt]).sort(), [
        [captor.id, "receita", "comissao_parceria", "12000.00", "2026-11-20", null],
        [partner.id, "receita", "comissao_parceria", "12000.00", "2026-11-20", null],
      ].sort());
      const captorView = await asUser(captor.id, () => finance.getFinancePeriod({ from: "2026-11", to: "2026-11" }));
      assert.deepEqual(captorView.entries.map((entry) => [entry.amount, entry.description]), [["12000.00", "Comissão da parceria — Casa da parceria"]]);
      assert.equal((await asUser(outsider.id, () => finance.getFinancePeriod({ from: "2026-11", to: "2026-11" }))).entries.length, 0);
      const [notice] = await db.select().from(notifications).where(and(eq(notifications.userId, captor.id), eq(notifications.title, "Parceria fechada")));
      assert.match(notice.message, /R\$\s12\.000,00.*20\/11\/2026/);

      await assert.rejects(asUser(captor.id, () => actions.updatePartnershipStatus(partnership.id, "fechado", "", closing)), /não é permitida/);
      await assert.rejects(db.insert(brokerFinanceEntries).values({ ownerUserId: captor.id, kind: "receita", description: "Duplicada", category: "comissao_parceria",
        amount: "1", dueDate: "2026-11-20", partnershipId: partnership.id }), (error: { cause?: { code?: string } }) => error.cause?.code === "23505", "uma previsão por corretor e parceria");
      assert.equal((await db.select().from(brokerFinanceEntries).where(eq(brokerFinanceEntries.partnershipId, partnership.id))).length, 2);
    } finally {
      await db.delete(brokerFinanceEntries).where(inArray(brokerFinanceEntries.ownerUserId, [captor.id, partner.id]));
      await db.delete(partnerships).where(eq(partnerships.propertyId, property.id));
      await db.delete(properties).where(eq(properties.id, property.id));
    }
  });

  await t.test("Termo de Parceria: só captador e parceiro aceitam, o texto aceito é conferido e gravado, e assinado vale o texto gravado", async () => {
    const broker = (n: number) => ({
      name: `Teste Termo ${n}`, email: `term${n}-${suffix}@example.test`, creci: `${4 + n}${suffix.slice(0, 6)}T`, whatsapp: `1199999003${n}`,
      city: "Salvador", state: "BA", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "ativo", nextBillingDate: null, plan: "10",
    });
    const [captor] = await db.insert(users).values(broker(1)).returning();
    const [partner] = await db.insert(users).values(broker(2)).returning();
    const [outsider] = await db.insert(users).values(broker(3)).returning();
    registeredIds.push(captor.id, partner.id, outsider.id);
    const [property] = await db.insert(properties).values({ brokerId: captor.id, title: "Casa do termo", propertyType: "Casa Solta", salePrice: "500000",
      city: "Salvador", neighborhood: "Centro", bedrooms: 3, parkingSpots: 2, areaM2: "150", description: "Teste", confidentialAddress: "Endereço fictício",
      ownerName: "Pessoa fictícia", ownerPhone: "11900003344", acceptsPartnership: true, status: "disponivel", purpose: "venda" }).returning();
    const previousVercel = process.env.VERCEL; process.env.VERCEL = "1";
    try {
      const [partnership] = await db.insert(partnerships).values({ propertyId: property.id, captorBrokerId: captor.id, partnerBrokerId: partner.id,
        status: "em_negociacao", commissionStatus: "aguardando_aceites" }).returning();
      const doCorretor = async (userId: string) => (await asUser(userId, () => terms.listMyPartnershipTerms())).find((item) => item.id === partnership.id);
      const sha = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

      // Divisão ainda não confirmada pelos dois: não há termo.
      assert.equal((await doCorretor(partner.id))?.termo, null);
      await assert.rejects(asUser(partner.id, () => terms.acceptPartnershipTerm(partnership.id, "0".repeat(64))), /confirmam a divisão/);

      await db.update(partnerships).set({ commissionStatus: "confirmada" }).where(eq(partnerships.id, partnership.id));
      const lido = (await doCorretor(partner.id))!;
      assert.ok(lido.termo && !lido.termo.assinado && lido.podeAceitar);
      assert.match(lido.termo.texto, /CAPTADOR: Teste Termo 1, CRECI .*\/BA\.[\s\S]*"Casa do termo"[\s\S]*CAPTADOR 50% e PARCEIRO 50%/);
      assert.equal(lido.termo.impressao, sha(lido.termo.texto));

      // Quem não é da parceria não vê nem aceita.
      assert.equal(await doCorretor(outsider.id), undefined);
      await assert.rejects(asUser(outsider.id, () => terms.acceptPartnershipTerm(partnership.id, lido.termo!.impressao)), /não encontrada/);
      await assert.rejects(asUser(partner.id, () => terms.acceptPartnershipTerm(partnership.id, "f".repeat(64))), /mudou enquanto você lia/);
      assert.equal((await db.select().from(partnershipTermAcceptances).where(eq(partnershipTermAcceptances.partnershipId, partnership.id))).length, 0);

      const primeiro = await asUser(partner.id, () => terms.acceptPartnershipTerm(partnership.id, lido.termo!.impressao), { address: "200.10.20.30" });
      assert.deepEqual(primeiro, { jaAceito: false, assinado: false });
      const [gravado] = await db.select().from(partnershipTermAcceptances).where(eq(partnershipTermAcceptances.partnershipId, partnership.id));
      assert.deepEqual([gravado.userId, gravado.termVersion, gravado.commissionRevision, gravado.textHash, gravado.termText, gravado.ip],
        [partner.id, "1", 1, lido.termo.impressao, lido.termo.texto, "200.10.20.30"]);
      assert.deepEqual(await asUser(partner.id, () => terms.acceptPartnershipTerm(partnership.id, lido.termo!.impressao)), { jaAceito: true, assinado: false });
      const [aviso] = await db.select().from(notifications).where(and(eq(notifications.userId, captor.id), eq(notifications.title, "Termo de Parceria aceito pelo outro corretor")));
      assert.match(aviso.message, /Teste Termo 2 aceitou .*"Casa do termo"/);

      // O cadastro do imóvel mudou antes do captador aceitar: texto novo, o parceiro precisa aceitar de novo.
      await db.update(properties).set({ title: "Casa do termo reformada" }).where(eq(properties.id, property.id));
      const mudou = (await doCorretor(captor.id))!;
      assert.notEqual(mudou.termo!.impressao, lido.termo.impressao);
      assert.deepEqual([mudou.termo!.captador.situacao, mudou.termo!.parceiro.situacao], ["pendente", "texto_anterior"]);
      assert.deepEqual(await asUser(captor.id, () => terms.acceptPartnershipTerm(partnership.id, mudou.termo!.impressao)), { jaAceito: false, assinado: false });
      assert.deepEqual(await asUser(partner.id, () => terms.acceptPartnershipTerm(partnership.id, mudou.termo!.impressao)), { jaAceito: false, assinado: true });

      // Assinado: vale o texto gravado, mesmo que o imóvel mude de novo; ninguém aceita outra vez.
      await db.update(properties).set({ title: "Outro título depois da assinatura" }).where(eq(properties.id, property.id));
      const assinado = (await doCorretor(captor.id))!;
      assert.deepEqual([assinado.termo!.assinado, assinado.termo!.impressao, assinado.podeAceitar], [true, mudou.termo!.impressao, false]);
      assert.match(assinado.termo!.texto, /"Casa do termo reformada"/);
      await assert.rejects(asUser(captor.id, () => terms.acceptPartnershipTerm(partnership.id, mudou.termo!.impressao)), /já aceitaram/);
      const linha = await db.select({ status: partnershipActivities.newStatus }).from(partnershipActivities).where(eq(partnershipActivities.partnershipId, partnership.id));
      assert.deepEqual(linha.map((a) => a.status).sort(), ["termo_aceito", "termo_aceito", "termo_aceito_ambos"]);
      await assert.rejects(db.insert(partnershipTermAcceptances).values({ partnershipId: partnership.id, userId: captor.id, termVersion: "1", commissionRevision: 1,
        textHash: mudou.termo!.impressao, termText: "duplicado" }), (error: { cause?: { code?: string } }) => error.cause?.code === "23505", "um aceite por corretor e texto");

      // Divisão revisada: o termo assinado era da revisão 1; a revisão 2 precisa de confirmação e de termo novo.
      await asUser(captor.id, () => actions.revisePartnershipCommission(partnership.id, { commissionModel: "three_party_referral_40_40_20", externalReferrerName: "Indicador Teste", externalReferrerCreci: "TESTE-02" }));
      assert.equal((await doCorretor(partner.id))!.termo, null);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
      await db.delete(partnerships).where(eq(partnerships.propertyId, property.id));
      await db.delete(properties).where(eq(properties.id, property.id));
    }
  });

  await t.test("controle de visita: só quem registrou a visita imprime, só imóvel à venda, e o endereço protegido não sai", async () => {
    const broker = (n: number) => ({
      name: `Teste Visita ${n}`, email: `visit${n}-${suffix}@example.test`, creci: `${n}${suffix.slice(0, 6)}V`, whatsapp: `1199999004${n}`,
      city: "Salvador", state: "BA", role: "corretor", verificationStatus: "aprovado", subscriptionStatus: "ativo", nextBillingDate: null, plan: "10",
    });
    const [captor] = await db.insert(users).values(broker(1)).returning();
    const [partner] = await db.insert(users).values(broker(2)).returning();
    const [outsider] = await db.insert(users).values(broker(3)).returning();
    registeredIds.push(captor.id, partner.id, outsider.id);
    const imovel = (purpose: string, title: string) => ({ brokerId: captor.id, title, propertyType: "Casa Solta", salePrice: "500000",
      city: "Salvador", neighborhood: "Centro", bedrooms: 3, parkingSpots: 2, areaM2: "150", description: "Teste",
      confidentialAddress: "Rua Protegida 123", ownerName: "Pessoa fictícia", ownerPhone: "11900005566", acceptsPartnership: true,
      status: "disponivel", purpose });
    const [venda] = await db.insert(properties).values(imovel("venda", "Casa à venda")).returning();
    const [aluguel] = await db.insert(properties).values(imovel("aluguel", "Casa para alugar")).returning();
    const registro = (propertyId: string, hash: string) => ({ certificateHash: `${hash}${suffix}`.slice(0, 32), propertyId, captorBrokerId: captor.id,
      partnerBrokerId: partner.id, clientName: "Cliente da Visita", clientCpfPartial: "***.456.789-**",
      visitDate: new Date("2026-10-11T23:30:00Z"), lockExpirationDate: new Date("2027-01-11T00:00:00Z") });
    try {
      const [dvp] = await db.insert(dvpCertificates).values(registro(venda.id, "VISITAVENDA")).returning();
      const [dvpAluguel] = await db.insert(dvpCertificates).values(registro(aluguel.id, "VISITAALUGUEL")).returning();
      const dados = await asUser(partner.id, () => visit.getVisitControl(dvp.id));
      assert.equal(dados.corretor.nome, "Teste Visita 2");
      assert.deepEqual([dados.corretor.uf, dados.imovel.bairro, dados.imovel.cidade, dados.cliente.nome], ["BA", "Centro", "Salvador", "Cliente da Visita"]);
      assert.equal(dados.dataDaVisita, "2026-10-11", "23h30 UTC é 20h30 em Brasília: o dia é 11");
      assert.ok(!JSON.stringify(dados).includes("Rua Protegida"), "o endereço protegido não sai");
      await assert.rejects(asUser(captor.id, () => visit.getVisitControl(dvp.id)), /não encontrado/);
      await assert.rejects(asUser(outsider.id, () => visit.getVisitControl(dvp.id)), /não encontrado/);
      await assert.rejects(asUser(partner.id, () => visit.getVisitControl(dvpAluguel.id)), /à venda/);
      await assert.rejects(asUser(partner.id, () => visit.getVisitControl("não-é-id")), /não encontrado/);
    } finally {
      await db.delete(dvpCertificates).where(inArray(dvpCertificates.propertyId, [venda.id, aluguel.id]));
      await db.delete(properties).where(inArray(properties.id, [venda.id, aluguel.id]));
    }
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
      // Uma conexão só esgota o próprio par (5) e para antes de contar na conta: não trava o login de outra pessoa.
      const single = `single-${suffix}@example.test`, singleAddress = "192.0.2.100";
      keyHashes.push(hash(`login-pair:${single}:${singleAddress}`), hash(`login-address:${singleAddress}`), hash(`login-account:${single}`));
      for (let i=0; i<10; i++) await assert.rejects(asUser(owner.id, () => actions.loginUser(single,"wrong-password"), {address:singleAddress}), /incorretos|Muitas tentativas/);
      const [accountCounter] = await db.select().from(authLoginAttempts).where(eq(authLoginAttempts.keyHash, hash(`login-account:${single}`)));
      assert.equal(accountCounter.attempts, 5);
      assert.equal(accountCounter.blockedUntil, null);
      for (let i=0; i<30; i++) {
        const address = `192.0.2.${i+1}`;
        keyHashes.push(hash(`login-pair:${email}:${address}`), hash(`login-address:${address}`));
        await assert.rejects(asUser(owner.id, () => actions.loginUser(email,"wrong-password"), {address}), /incorretos/);
      }
      keyHashes.push(hash("login-pair:" + email + ":192.0.2.31"), hash("login-address:192.0.2.31"));
      await assert.rejects(asUser(owner.id, () => actions.loginUser(email,"wrong-password"), {address:"192.0.2.31"}), /Muitas tentativas/);
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
