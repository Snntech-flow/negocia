// Rota /vitrine: carrega a vitrine (imóveis da rede) no servidor e entrega ao cliente, que cuida de filtros,
// paginação e da ficha para o cliente. A chrome (header/abas/modais) vem do (app)/layout.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import VitrineRouteClient from "@/components/app-shell/VitrineRouteClient";

export const dynamic = "force-dynamic";

export default async function VitrinePage() {
  const data = await getMarketplaceData({ section: "vitrine" });
  const user = data.currentUser;
  if (!user) redirect("/");
  const broker = { name: user.name ?? "", creci: user.creci ?? "", whatsapp: user.whatsapp ?? "", avatar: user.avatarUrl ?? "" };
  return (
    <VitrineRouteClient
      initialProperties={data.properties}
      initialPropertyTotal={data.propertyTotal}
      broker={broker}
      currentUserId={user.id}
      blockedReason={blockedReasonFor(user)}
    />
  );
}
