// Rota /cadastrar: o cadastro de imóvel. A carteira fica em /meus-imoveis; o endereço antigo de edição
// (/cadastrar?imovel=<id>) leva para lá.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import { photoLimit } from "@/lib/plans";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";
import CadastrarRouteClient from "@/components/app-shell/CadastrarRouteClient";

export const dynamic = "force-dynamic";

export default async function CadastrarPage({ searchParams }: { searchParams: Promise<{ imovel?: string | string[] }> }) {
  const { imovel } = await searchParams;
  if (typeof imovel === "string" && /^[0-9a-f-]{36}$/i.test(imovel)) redirect(`/meus-imoveis?imovel=${imovel}`);
  const data = await getMarketplaceData({ section: "cadastrar" });
  const user = data.currentUser;
  if (!user) redirect("/");
  return (
    <>
      <ScreenGuidance screen="cadastrar" />
      <CadastrarRouteClient
        broker={{ name: user.name, city: user.city ?? "", state: user.state ?? "" }}
        blockedReason={blockedReasonFor(user)}
        photoLimit={photoLimit(user.plan)}
      />
    </>
  );
}
