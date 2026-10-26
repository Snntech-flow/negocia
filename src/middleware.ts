import { NextResponse, type NextRequest } from "next/server";

// CSP com NONCE por requisição (reforço da auditoria — camada extra contra XSS).
// ─────────────────────────────────────────────────────────────────────────────
// Está em REPORT-ONLY: NÃO bloqueia nada, só reporta violações no console do navegador.
// Serve para validar o app LOGADO (abrir o console e procurar avisos de CSP) antes de ligar.
//
//   ►► PARA LIGAR O ENFORCE: troque abaixo o header
//      "Content-Security-Policy-Report-Only"  →  "Content-Security-Policy"
//      (o enforced básico do next.config.js — frame-ancestors, object-src, base-uri, form-action,
//       upgrade — continua valendo e é coberto por este policy, então pode ser removido de lá depois.)
//
// Por que nonce e não 'unsafe-inline': com o nonce, um XSS que injeta <script> inline é BLOQUEADO
// (não tem o nonce do request). O script de boot de tema (layout.tsx) e os scripts do framework
// recebem o nonce. O beacon do Cloudflare é script externo e entra pela allowlist do host.
// Sem 'strict-dynamic' de propósito: 'self' cobre os chunks do Next e o host do Cloudflare funciona.
// APIs externas (resend, gemini, ibge, viacep, bcb) são chamadas do SERVIDOR — fora do alcance da CSP.

export function middleware(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self' https://cloudflareinsights.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Next lê a CSP da REQUEST e injeta o nonce nos próprios scripts do framework; o layout lê o nonce
  // de `x-nonce` para o script de tema.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", csp); // ◄ trocar para "Content-Security-Policy" ao ligar
  return response;
}

export const config = {
  // Todas as páginas, menos estáticos do Next e o health (cron). Os assets têm hash/own caching.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
