import { ActionError } from "./action-result";
import crypto from "node:crypto";

export class RecoveryError extends ActionError {}
export const RESET_MESSAGE = "Se houver uma conta elegível com esse e-mail, você receberá um link para criar uma nova senha. Confira também o spam.";
export const RESET_ERROR = "Link inválido ou expirado. Solicite uma nova recuperação de senha.";
export function resetTokenHash(token: string) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new RecoveryError(RESET_ERROR);
  return crypto.createHash("sha256").update(token).digest("hex");
}
export function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: resetTokenHash(token), expiresAt: new Date(Date.now() + 30 * 60_000) };
}
export function recoveryConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEGOCIAR_LAR_EMAIL_FROM;
  const configuredUrl = process.env.NEGOCIAR_LAR_APP_URL;
  if (!apiKey || !from || !configuredUrl) throw new RecoveryError("A recuperação de senha está temporariamente indisponível. Entre em contato com o suporte.");
  let url: URL;
  try { url = new URL(configuredUrl); } catch { throw new RecoveryError("A recuperação de senha está temporariamente indisponível. Entre em contato com o suporte."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:"))) {
    throw new RecoveryError("A recuperação de senha está temporariamente indisponível. Entre em contato com o suporte.");
  }
  return { apiKey, from, origin: url.origin };
}
export async function sendPasswordRecovery(email: string, token: string, config: ReturnType<typeof recoveryConfig>) {
  resetTokenHash(token);
  // Fragment keeps the secret out of HTTP request paths and referrer headers.
  const link = `${config.origin}/recuperar-senha#${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [email], subject: "Crie uma nova senha — NegociaLar",
      text: `Você solicitou uma nova senha no NegociaLar. Abra o link abaixo em até 30 minutos:\n${link}\n\nSe não foi você, ignore este e-mail. Sua senha continua a mesma.` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Falha no serviço de e-mail.");
}
