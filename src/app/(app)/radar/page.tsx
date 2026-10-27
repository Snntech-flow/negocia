// Rota /radar (Radar de Compradores).
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";
import RadarRouteClient from "@/components/app-shell/RadarRouteClient";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const data = await getMarketplaceData({ section: "radar" });
  const user = data.currentUser;
  if (!user) redirect("/");
  const broker = { id: user.id, name: user.name || "", creci: user.creci || "", whatsapp: user.whatsapp || "", avatar: user.avatarUrl || "" };
  return (
    <>
      <ScreenGuidance screen="radar" />
      <RadarRouteClient
        broker={broker}
        properties={data.properties}
        initialRadar={data.radarList}
        currentUserId={user.id}
        brokerState={user.state || "SP"}
        blockedReason={blockedReasonFor(user)}
      />
    </>
  );
}
