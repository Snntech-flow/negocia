import crypto from "crypto";
import { sessionSecret } from "./session-secret";

// Link público da ficha do imóvel (white-label) para o corretor mandar ao cliente. O token é assinado (HMAC do
// mesmo segredo da sessão, com separação de domínio) e carrega o imóvel + o corretor que compartilha — assim a
// página pública mostra o contato certo. Stateless: não há tabela; a página sempre reflete o estado atual do imóvel.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN = "listing-share:v1";

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(`${DOMAIN}:${payload}`).digest("base64url");
}

export function signListingShare(propertyId: string, brokerId: string): string {
  const payload = `${propertyId}.${brokerId}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyListingShare(token: string): { propertyId: string; brokerId: string } | null {
  if (typeof token !== "string" || token.length < 10 || token.length > 400) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  let payload: string;
  try { payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8"); } catch { return null; }
  const [propertyId, brokerId, extra] = payload.split(".");
  if (extra !== undefined || !UUID.test(propertyId || "") || !UUID.test(brokerId || "")) return null;
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  return { propertyId, brokerId };
}
