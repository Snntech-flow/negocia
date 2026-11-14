// Rota /meus-imoveis: só a carteira do corretor (editar, mudar a situação, arquivar). O cadastro fica em /cadastrar
// (14/11/2026, pedido das corretoras: "para os desatentos… tem que descer para cadastrar o imóvel").
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";
import MeusImoveisRouteClient from "@/components/app-shell/MeusImoveisRouteClient";

export const dynamic = "force-dynamic";

export default async function MeusImoveisPage() {
  const data = await getMarketplaceData({ section: "cadastrar" });
  if (!data.currentUser) redirect("/");
  return (
    <>
      <ScreenGuidance screen="meus-imoveis" />
      <MeusImoveisRouteClient />
    </>
  );
}
