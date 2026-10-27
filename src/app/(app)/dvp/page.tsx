// Rota /dvp (Registro de Visita): formulário + registros + acompanhamento das parcerias.
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";
import DvpRouteClient from "@/components/app-shell/DvpRouteClient";

export const dynamic = "force-dynamic";

export default async function DvpPage({ searchParams }: { searchParams: Promise<{ imovel?: string }> }) {
  const { imovel } = await searchParams;
  const data = await getMarketplaceData({ section: "dvp" });
  const user = data.currentUser;
  if (!user) redirect("/");
  const prop = imovel ? data.properties.find((p) => p.id === imovel) : null;
  const activeProperty = prop
    ? { id: prop.id, title: prop.title, neighborhood: prop.neighborhood, city: prop.city, acceptsPartnership: prop.acceptsPartnership,
        partnershipModels: prop.partnershipModels, splitPercentage: prop.splitPercentage,
        broker: { id: prop.broker.id, name: prop.broker.name, creci: prop.broker.creci } }
    : null;
  return (
    <>
      <ScreenGuidance screen="dvp" />
      <DvpRouteClient
        currentBroker={{ id: user.id, name: user.name || "", creci: user.creci || "" }}
        currentUserId={user.id}
        blockedReason={blockedReasonFor(user)}
        activeProperty={activeProperty}
        initialDvpList={data.dvpList}
        initialPartnerships={data.partnerships}
        initialPartnershipActivities={data.partnershipActivities}
      />
    </>
  );
}
