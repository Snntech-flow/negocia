import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Negocia Lar — Plataforma MLS B2B de Parcerias Imobiliárias Blindadas",
  description:
    "A maior rede de co-corretagem e parcerias seguras do Brasil. Blindagem jurídica DVP 180 dias contra atravessamento, radar com inteligência artificial e fichas white-label. Um produto SNNtech.",
  keywords: [
    "co-corretagem",
    "parceria imobiliaria",
    "MLS Brasil",
    "corretor de imoveis",
    "CRECI",
    "blindagem juridica",
    "SNNtech",
  ],
  authors: [{ name: "SNNtech", url: "https://snntech.com.br" }],
  icons: {
    icon: "/logo-negocialar.png",
    apple: "/logo-negocialar.png",
  },
  openGraph: {
    title: "Negocia Lar — Parcerias Imobiliárias Blindadas (MLS B2B)",
    description:
      "Faça parcerias 50/50 com total blindagem jurídica. Validação de CRECI por IA, Radar de Compradores e Fichas White-Label sem expor o captador. Um produto SNNtech.",
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
