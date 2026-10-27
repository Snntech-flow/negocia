// Segredo HMAC da sessão, isolado aqui (sem next/headers nem db) para poder ser usado também fora de uma
// requisição — ex.: assinar o token do link público da ficha (listing-share) e testá-lo sem a plataforma Next.
export function sessionSecret(): string {
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
