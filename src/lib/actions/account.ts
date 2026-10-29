// Cadastro, login, logout e validação de formato do CRECI. Movido de actions.ts (Fase 0) — comportamento idêntico.
import { municipioDaUf } from "../municipios";
import { ActionError, isUniqueViolation } from "../action-result";
import { db, users, notifications, authLoginAttempts } from "../db";
import { eq, and, or, inArray, isNull, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";
import { addFreeDays } from "../subscription";
import { CURRENT_PRICE_TABLE, isPlanId, planMonthlyEquivalent } from "../plans";
import { isBrazilianState } from "../brazil-states";
import { getCurrentUserId as readCurrentUserId, requestAddress, limitRegistrationAttempts, setBrokerSession, hashPassword, verifyPassword, SESSION_COOKIE } from "../auth";

// Confere só o formato do número; a situação no conselho é conferida pela equipe.
export async function validateCreciFormatImpl(creci: string, state: string) {
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

export async function registerUserWithPixImpl(userData: {
  name: string;
  email: string;
  whatsapp: string;
  creci: string;
  state: string;
  city: string;
  plan: string;
  billingCycle: "monthly" | "annual";
  password: string;
  referralCode?: string;
}) {
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanCreci = userData.creci.trim().toUpperCase();
  if (!isPlanId(userData.plan)) throw new ActionError("Plano inválido.");
  if (!['monthly', 'annual'].includes(userData.billingCycle)) throw new ActionError("Ciclo de cobrança inválido.");
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new ActionError("E-mail inválido.");
  if (userData.name.trim().length < 2 || userData.name.length > 120 || userData.city.trim().length < 2 || userData.city.length > 120 || !isBrazilianState(userData.state.toUpperCase())) throw new ActionError("Confira nome, cidade e estado.");
  // A cidade tem de ser um município da UF (IBGE) e vai com o nome oficial — 28/10/2026, "São Paulo/BA" (lib/municipios).
  const cidadeOficial = municipioDaUf(userData.state, userData.city);
  if (!cidadeOficial) throw new ActionError(`Escolha a cidade na lista de municípios de ${userData.state.toUpperCase()}.`);
  const phoneDigits = userData.whatsapp.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15 || userData.whatsapp.length > 30) throw new ActionError("WhatsApp inválido.");
  if (!/^[0-9]{3,7}-?[FJ]?$/.test(cleanCreci)) throw new ActionError("Informe um CRECI no formato numérico aceito.");
  const monthlyFee = planMonthlyEquivalent(userData.plan, userData.billingCycle);
  const referralCode = userData.referralCode?.trim() || null;
  if (referralCode && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referralCode)) throw new ActionError("Código de indicação inválido.");
  // O limite vem antes de qualquer consulta: tentativas em série não testam códigos de indicação à vontade.
  await limitRegistrationAttempts();
  const [referrer] = referralCode ? await db.select({ id: users.id, email: users.email, verificationStatus: users.verificationStatus }).from(users).where(eq(users.id, referralCode)).limit(1) : [];
  if (referralCode && (!referrer || referrer.verificationStatus === "suspenso" || referrer.email === cleanEmail)) throw new ActionError("Código de indicação indisponível.");
  const passwordHash = await hashPassword(userData.password);

  let newUser;
  try {
    newUser = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({
        name: userData.name.trim(),
        email: cleanEmail,
        whatsapp: userData.whatsapp,
        creci: cleanCreci,
        state: userData.state.toUpperCase(),
        city: cidadeOficial,
        passwordHash,
        role: "corretor",
        isVerified: false,
        verificationStatus: "pendente",
        plan: userData.plan,
        subscriptionStatus: "teste",
        nextBillingDate: addFreeDays(new Date()),
        billingCycle: userData.billingCycle,
        referredBy: referrer?.id || null,
        monthlyFee,
        priceTable: CURRENT_PRICE_TABLE,
        avatarUrl: null,
      }).returning();

      await tx.insert(notifications).values({
        userId: created.id,
        title: "Bem-vindo ao Negocia Lar!",
        message: "Você tem 30 dias grátis a partir do cadastro, sem pagamento inicial. O uso da rede depende da aprovação do CRECI. Ao terminar, renove seu plano via Pix.",
        type: "sistema",
        read: false,
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ActionError("Este e-mail já tem cadastro. Entre com sua senha ou use Esqueci minha senha.");
    throw error;
  }

  // Salva a sessão do corretor
  await setBrokerSession(newUser.id);

  revalidatePath("/");
  const { passwordHash: _passwordHash, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

async function reserveLoginAttempt(email: string, address: string) {
  // Ordem importa: conexão e par conta+conexão travam antes de contar na conta. Assim uma única conexão
  // não consegue bloquear o login de outra pessoa; para travar a conta são precisas várias conexões.
  const buckets = [
    { key: `login-address:${address}`, limit: address === "unknown" ? 100 : 50, clearOnSuccess: false },
    { key: `login-pair:${email}:${address}`, limit: 5, clearOnSuccess: true },
    { key: `login-account:${email}`, limit: 30, clearOnSuccess: true },
  ];
  // Contadores vencidos não servem para nada; limpeza ocasional para a tabela não crescer sem fim.
  if (Math.random() < 0.02) {
    await db.delete(authLoginAttempts).where(and(lt(authLoginAttempts.updatedAt, new Date(Date.now() - 2 * 86_400_000)),
      or(isNull(authLoginAttempts.blockedUntil), lt(authLoginAttempts.blockedUntil, new Date()))));
  }
  const successfulLoginKeys: string[] = [];
  for (const bucket of buckets) {
    const keyHash = crypto.createHash("sha256").update(bucket.key).digest("hex");
    // Reserve before hashing: concurrent requests cannot all pass an old counter.
    const [counter] = await db.insert(authLoginAttempts).values({keyHash, attempts: 1, updatedAt: new Date()}).onConflictDoUpdate({
      target: authLoginAttempts.keyHash,
      set: {
        attempts: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.attempts} when ${authLoginAttempts.updatedAt} < now() - interval '15 minutes' then 1 else ${authLoginAttempts.attempts} + 1 end`,
        blockedUntil: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.blockedUntil} when ${authLoginAttempts.updatedAt} < now() - interval '15 minutes' then null when ${authLoginAttempts.attempts} + 1 > ${bucket.limit} then now() + interval '15 minutes' else null end`,
        updatedAt: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.updatedAt} else now() end`,
      },
    }).returning({blockedUntil:authLoginAttempts.blockedUntil});
    if (counter.blockedUntil && counter.blockedUntil.getTime() > Date.now()) throw new ActionError("Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.");
    if (bucket.clearOnSuccess) successfulLoginKeys.push(keyHash);
  }
  return successfulLoginKeys;
}

export async function loginUserImpl(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length > 254 || password.length > 200) throw new ActionError("E-mail ou senha incorretos.");
  const loginKeys = await reserveLoginAttempt(cleanEmail, await requestAddress());
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !passwordMatches) throw new ActionError("E-mail ou senha incorretos.");
  if (user.verificationStatus === "suspenso") throw new ActionError("Esta conta está suspensa.");
  await db.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, loginKeys));
  await setBrokerSession(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  revalidatePath("/");
  return { success: true, user: safeUser };
}

// Sair encerra a sessão em todos os aparelhos (a versão da sessão muda): um cookie copiado deixa de valer.
export async function logoutUserImpl() {
  const userId = await readCurrentUserId();
  if (userId) await db.update(users).set({sessionVersion:sql`${users.sessionVersion} + 1`}).where(eq(users.id, userId));
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  revalidatePath("/");
  return { success: true };
}
