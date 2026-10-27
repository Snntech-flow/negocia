// AppShell (Fase 1): a chrome compartilhada das rotas logadas. Carrega o contexto (usuário + notificações +
// total da vitrine para o contador) e envolve cada rota sob (app)/ com o header, as abas e os modais.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import AppShellClient from "@/components/app-shell/AppShellClient";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getMarketplaceData({ section: "vitrine" });
  if (!data.currentUser) redirect("/");
  return (
    <AppShellClient currentUser={data.currentUser} initialNotifications={data.notifications} propertyTotal={data.propertyTotal}>
      {children}
    </AppShellClient>
  );
}
