import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Negocia Lar — Rede de Parcerias Imobiliárias (MLS)",
  description: "Plataforma B2B para co-corretagem, compartilhamento de carteira seguro e radar de compradores.",
  icons: {
    icon: "/logo-negocialar.png",
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
