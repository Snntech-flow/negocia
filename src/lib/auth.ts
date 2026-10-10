import { ActionError } from "./action-result";
import { db, users, authLoginAttempts } from "./db";
import { eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { isIP } from "node:net";
import { hasSubscriptionAccess } from "./subscription";

export async function requestAddress() {
  const requestHeaders = await headers();
  // Only Vercel's own forwarding header is trusted for per-IP limits.
  const candidate = process.env.VERCEL === "1"
    ? requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : null;
  return candidate && isIP(candidate) ? candidate : "unknown";
}

export async function limitRegistrationAttempts() {
  const address = await requestAddress();
  const limit = address === "unknown" ? 50 : 10;
  const keyHash = crypto.createHash("sha256").update(`registration\n${address}`).digest("hex");
  const [state] = await db.insert(authLoginAttempts)
    .values({ keyHash, attempts: 1, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: authLoginAttempts.keyHash,
      set: {
        attempts: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.attempts} when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then 1 else ${authLoginAttempts.attempts} + 1 end`,
        blockedUntil: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.blockedUntil} when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then null when ${authLoginAttempts.attempts} + 1 > ${limit} then now() + interval '1 hour' else null end`,
        updatedAt: sql`case when ${authLoginAttempts.blockedUntil} > now() then ${authLoginAttempts.updatedAt} else now() end`,
      },
    })
    .returning({ blockedUntil: authLoginAttempts.blockedUntil });
  if (state.blockedUntil && state.blockedUntil.getTime() > Date.now()) {
    throw new ActionError("Muitos cadastros nesta conexão. Aguarde uma hora e tente novamente.");
  }
}

export const SESSION_COOKIE = "negocialar_session";
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

function signUserId(userId: string, expiresAt: number, sessionVersion?: number) {
  const payload = sessionVersion === undefined ? `${userId}.${expiresAt}` : `${userId}.${sessionVersion}.${expiresAt}`;
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export async function setBrokerSession(userId: string) {
  const cookieStore = await cookies();
  const [user] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ActionError("Conta não encontrada.");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  cookieStore.set(SESSION_COOKIE, `${userId}.${user.sessionVersion}.${expiresAt}.${signUserId(userId, expiresAt, user.sessionVersion)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 200) {
    throw new ActionError("A senha precisa ter entre 12 e 200 caracteres.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  })).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  // Same work for unknown accounts to reduce account enumeration by timing.
  const encoded = stored || `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
  const [scheme, salt, expectedHex] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function requireCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) throw new ActionError("Faça login para continuar.");
  const [user] = await db.select({ id: users.id, role: users.role, plan: users.plan, verificationStatus: users.verificationStatus, subscriptionStatus: users.subscriptionStatus, nextBillingDate: users.nextBillingDate }).from(users).where(eq(users.id, id)).limit(1);
  if (!user || user.verificationStatus === "suspenso") throw new ActionError("A conta não está autorizada.");
  return user;
}

export function requireActiveBroker(actor: Awaited<ReturnType<typeof requireCurrentUser>>) {
  if (actor.verificationStatus !== "aprovado") throw new ActionError("Seu cadastro ainda aguarda verificação.");
  if (!hasSubscriptionAccess(actor.subscriptionStatus, actor.nextBillingDate)) throw new ActionError("Ative sua assinatura para usar esta função.");
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const parts = value.split(".");
  const isCurrentCookie = parts.length === 4;
  if (!isCurrentCookie && parts.length !== 3) return null;
  const userId = parts[0];
  const sessionVersion = isCurrentCookie ? Number(parts[1]) : 0;
  const expiresAtText = isCurrentCookie ? parts[2] : parts[1];
  const signature = isCurrentCookie ? parts[3] : parts[2];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || !/^[0-9a-f]{64}$/.test(signature) || !Number.isSafeInteger(sessionVersion) || sessionVersion < 0 || !expiresAtText || !signature) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = isCurrentCookie ? signUserId(userId, expiresAt, sessionVersion) : signUserId(userId, expiresAt);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  const [user] = await db.select({ sessionVersion: users.sessionVersion, verificationStatus: users.verificationStatus }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.sessionVersion !== sessionVersion || user.verificationStatus === "suspenso") return null;
  return userId;
}
