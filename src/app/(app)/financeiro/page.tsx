// Rota /financeiro (Receitas e despesas): BrokerFinance. Sem guia de tela (o monólito também não tinha).
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import FinanceiroRouteClient from "@/components/app-shell/FinanceiroRouteClient";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const data = await getMarketplaceData({ section: "financeiro" });
  const user = data.currentUser;
  if (!user) redirect("/");
  return <FinanceiroRouteClient blockedReason={blockedReasonFor(user)} />;
}
