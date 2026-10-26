/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Fotos de imóveis chegam por ação do servidor (até 3 MB cada, já reduzidas na tela).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
          // Camada extra contra XSS (auditoria): restringe de ONDE scripts/estilos/imagens/conexões
          // podem vir. Em REPORT-ONLY primeiro — não bloqueia nada, só reporta violações no console —
          // até confirmar que não pega nada legítimo no app logado; depois vira enforce (idealmente
          // com nonce no lugar do 'unsafe-inline' dos scripts). As APIs externas (resend, gemini,
          // ibge, viacep, bcb) são chamadas do SERVIDOR, fora do alcance da CSP.
          { key: "Content-Security-Policy-Report-Only", value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
            "font-src 'self' data:",
            "connect-src 'self' https://cloudflareinsights.com",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join("; ") },
        ],
      },
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
