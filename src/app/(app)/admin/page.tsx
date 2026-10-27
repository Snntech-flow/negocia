// Fase 1 — 1º corte de rota (PROVA do padrão): /admin como Server Component que carrega SÓ a seção
// admin e renderiza o AdminPanel que já existe. Não toca no monólito (NegociaLarApp) nem na navegação
// dele — a aba Admin continua funcionando por lá também nesta fase. O shell compartilhado com abas
// (AppShell) é o próximo passo, dedicado e verificado logado.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import AdminRouteClient from "./AdminRouteClient";

export const dynamic = "force-dynamic";

export default async function AdminRoutePage() {
  // getMarketplaceData já escopa por seção e por quem pede: admin traz usuários/transações/feedback.
  const data = await getMarketplaceData({ section: "admin" });
  if (!data.currentUser) redirect("/");
  const podeVer = data.currentUser.role === "admin" || data.currentUser.adminViewAccess === true;
  if (!podeVer) redirect("/");

  return (
    <AdminRouteClient
      users={data.users}
      transactions={data.transactions}
      feedback={data.pilotFeedback}
      currentUserId={data.currentUser.id}
      somenteLeitura={data.currentUser.role !== "admin"}
    />
  );
}
