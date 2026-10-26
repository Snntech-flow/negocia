import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://negocialar.com.br"),
  title: "Negocia Lar — Plataforma MLS B2B para Corretores",
  description:
    "Plataforma para cadastro e parceria de imóveis, registro de visitas e organização de clientes. Experimente por 30 dias grátis. Um produto SNNtech.",
  keywords: [
    "co-corretagem",
    "parceria imobiliaria",
    "MLS Brasil",
    "corretor de imoveis",
    "CRECI",
    "gestao de imoveis",
    "SNNtech",
  ],
  authors: [{ name: "SNNtech", url: "https://snntech.com.br" }],
  icons: {
    icon: "/logo-negocialar.png",
    apple: "/logo-negocialar.png",
  },
  openGraph: {
    title: "Negocia Lar — Rede de Parcerias Imobiliárias (MLS B2B)",
    description:
      "Organize imóveis, clientes e potenciais parcerias em uma plataforma para corretores. Um produto SNNtech.",
    url: "https://negocialar.com.br",
    siteName: "Negocia Lar - SNNtech",
    images: [
      {
        url: "/logo-negocialar.png",
        width: 800,
        height: 600,
        alt: "Negocia Lar - Um produto SNNtech",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce da CSP (middleware.ts) para o script de boot de tema — sem ele, o enforce bloquearia o inline.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // data-tema vem do script abaixo (antes da página aparecer); o servidor não sabe o tema escolhido.
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
