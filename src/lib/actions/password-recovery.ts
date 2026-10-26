"use server";

import { db, users, passwordResetTokens, authLoginAttempts } from "../db";
import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { after } from "next/server";
import crypto from "node:crypto";
import { hashPassword, requestAddress, SESSION_COOKIE } from "../auth";
import { createResetToken, recoveryConfig, resetTokenHash, sendPasswordRecovery, RESET_ERROR, RESET_MESSAGE, RecoveryError } from "../password-recovery";

async function reserveRecovery(email: string) {
  const address = await requestAddress();
  const buckets = [{ key: `recovery-address:${address}`, limit: address === "unknown" ? 30 : 10 },
    { key: `recovery-account:${email}`, limit: 3 }];
  let allowed = true;
  for (const bucket of buckets) {
    const keyHash = crypto.createHash("sha256").update(bucket.key).digest("hex");
    const [counter] = await db.insert(authLoginAttempts).values({ keyHash, attempts: 1, updatedAt: new Date() })
      .onConflictDoUpdate({ target: authLoginAttempts.keyHash, set: {
        attempts: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then 1 else ${authLoginAttempts.attempts} + 1 end`,
        updatedAt: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then now() else ${authLoginAttempts.updatedAt} end`,
      } }).returning({ attempts: authLoginAttempts.attempts });
    if (counter.attempts > bucket.limit) allowed = false;
  }
  return allowed;
}

export async function requestPasswordReset(email: string) {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new RecoveryError("Informe um e-mail válido.");
  const config = recoveryConfig();
  const cleanEmail = email.trim().toLowerCase();
  if (!await reserveRecovery(cleanEmail)) return { success: true, message: RESET_MESSAGE };
  const [user] = await db.select({ id: users.id, email: users.email, sessionVersion: users.sessionVersion, verificationStatus: users.verificationStatus })
    .from(users).where(eq(users.email, cleanEmail)).limit(1);
  // Tempo UNIFORME (achado #4): responde JÁ, igual para conta inexistente/suspensa e válida. Para a
  // conta válida, o token e o e-mail (que podem levar até ~10s) saem FORA da resposta, no `after` do
  // Next — a Vercel conclui esse trabalho depois do response. Assim a LATÊNCIA não denuncia se a
  // conta existe. O custo síncrono que resta (limite + uma busca por e-mail) é igual nos dois casos.
  if (user && user.verificationStatus !== "suspenso") {
    const resolvedUser = user;
    after(async () => {
      const reset = createResetToken();
      try {
        await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, resolvedUser.id), lt(passwordResetTokens.expiresAt, new Date())));
        await db.insert(passwordResetTokens).values({ tokenHash: reset.tokenHash, userId: resolvedUser.id, sessionVersion: resolvedUser.sessionVersion, expiresAt: reset.expiresAt });
        await sendPasswordRecovery(resolvedUser.email, reset.token, config);
      } catch {
        // Desfaz o token se a entrega falhar. Sem endereço, link, corpo do provedor ou token no log.
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, reset.tokenHash)).catch(() => {});
        console.error("Falha ao entregar recuperação de senha.");
      }
    });
  }
  return { success: true, message: RESET_MESSAGE };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = resetTokenHash(token);
  if (typeof password !== "string") throw new RecoveryError("Informe uma senha válida.");
  if (password.length < 12 || password.length > 200) throw new RecoveryError("A senha precisa ter entre 12 e 200 caracteres.");
  const address = await requestAddress();
  const keyHash = crypto.createHash("sha256").update(`reset-address:${address}`).digest("hex");
  const [counter] = await db.insert(authLoginAttempts).values({ keyHash, attempts: 1, updatedAt: new Date() })
    .onConflictDoUpdate({ target: authLoginAttempts.keyHash, set: {
      attempts: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then 1 else ${authLoginAttempts.attempts} + 1 end`,
      updatedAt: sql`case when ${authLoginAttempts.updatedAt} < now() - interval '1 hour' then now() else ${authLoginAttempts.updatedAt} end`,
    } }).returning({ attempts: authLoginAttempts.attempts });
  if (counter.attempts > (address === "unknown" ? 100 : 20)) throw new RecoveryError("Muitas tentativas. Aguarde uma hora e tente novamente.");
  const [candidate] = await db.select({ tokenHash: passwordResetTokens.tokenHash }).from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.consumedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
  if (!candidate) throw new RecoveryError(RESET_ERROR);
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [reset] = await tx.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.consumedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
    if (!reset) throw new RecoveryError(RESET_ERROR);
    const [user] = await tx.select().from(users).where(eq(users.id, reset.userId)).for("update").limit(1);
    if (!user || user.verificationStatus === "suspenso" || user.sessionVersion !== reset.sessionVersion) throw new RecoveryError(RESET_ERROR);
    const [consumed] = await tx.update(passwordResetTokens).set({ consumedAt: new Date() })
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.consumedAt), gt(passwordResetTokens.expiresAt, new Date())))
      .returning({ tokenHash: passwordResetTokens.tokenHash });
    if (!consumed) throw new RecoveryError(RESET_ERROR);
    await tx.update(users).set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    // Account-level login counters cannot keep a recovered account locked out.
    await tx.delete(authLoginAttempts).where(inArray(authLoginAttempts.keyHash, [`login-account:${user.email}`, `login-pair:${user.email}:${address}`].map(key => crypto.createHash("sha256").update(key).digest("hex"))));
  });
  (await cookies()).delete(SESSION_COOKIE);
  return { success: true };
}

// Expected errors are returned explicitly; Next.js hides thrown messages in production.
export async function requestPasswordResetForm(email: string) {
  try { const result = await requestPasswordReset(email); return { success: true as const, message: result.message }; }
  catch (error) {
    if (!(error instanceof RecoveryError)) console.error("Falha interna ao solicitar recuperação de senha.");
    return { success: false as const, error: error instanceof RecoveryError ? error.message : "Não foi possível solicitar a recuperação. Tente novamente mais tarde." };
  }
}
export async function resetPasswordForm(token: string, password: string) {
  try { await resetPassword(token, password); return { success: true as const }; }
  catch (error) {
    if (!(error instanceof RecoveryError)) console.error("Falha interna ao redefinir senha.");
    return { success: false as const, error: error instanceof RecoveryError ? error.message : "Não foi possível alterar sua senha. Tente novamente mais tarde." };
  }
}
