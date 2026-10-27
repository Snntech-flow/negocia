// Rota /atendimento (Funil de atendimento): o mesmo LeadCRM, na visão "pipeline".
import { redirect } from "next/navigation";
import { getMarketplaceData } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";
import LeadCRMRouteClient from "@/components/app-shell/LeadCRMRouteClient";

export const dynamic = "force-dynamic";

export default async function AtendimentoPage() {
  const data = await getMarketplaceData({ section: "atendimento" });
  const user = data.currentUser;
  if (!user) redirect("/");
  const properties = data.properties.map((property) => ({ ...property, brokerId: property.broker.id }));
  return (
    <>
      <ScreenGuidance screen="atendimento" />
      <LeadCRMRouteClient initialView="pipeline" initialLeads={data.leads} initialActivities={data.leadActivities}
        properties={properties} currentUserId={user.id} currentUserState={user.state ?? null} blockedReason={blockedReasonFor(user)} />
    </>
  );
}
