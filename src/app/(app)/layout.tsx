// AppShell (Fase 1): a chrome compartilhada das rotas logadas. Carrega o contexto (usuário + notificações +
// total da vitrine para o contador) e envolve cada rota sob (app)/ com o header, as abas e os modais.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { carregarMeusMatches } from "@/lib/queries/matches";
import AppShellClient from "@/components/app-shell/AppShellClient";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getMarketplaceData({ section: "vitrine" });
  if (!data.currentUser) redirect("/");
  // Botão "Match" (28/10/2026): quantos matches o corretor ainda não viu. Se a conta falhar, o botão só não fica vermelho.
  const novosMatches = await carregarMeusMatches(data.currentUser, { comFotos: false })
    .then(({ matches }) => matches.filter((match) => match.novo).length)
    .catch((error) => { console.warn("Match: não foi possível contar os novos:", error instanceof Error ? error.constructor.name : typeof error); return 0; });
  return (
    <AppShellClient currentUser={data.currentUser} initialNotifications={data.notifications} propertyTotal={data.propertyTotal} novosMatches={novosMatches}>
      {children}
    </AppShellClient>
  );
}
