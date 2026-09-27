import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://negocialar.com.br"),
  title: "Negocia Lar — Plataforma MLS B2B para Corretores",
  description:
    "Plataforma em desenvolvimento para cadastro e parceria de imóveis, registro de visitas e organização de clientes. Um produto SNNtech.",
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
      "Organize imóveis, clientes e potenciais parcerias em uma plataforma em desenvolvimento para corretores. Um produto SNNtech.",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
