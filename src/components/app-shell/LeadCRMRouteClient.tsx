"use client";

// Wrapper client do CRM (Minha carteira e Funil de atendimento são o mesmo LeadCRM, com initialView diferente).
// Dá os callbacks de navegação por rota que o monólito dava por setActiveTab.
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import LeadCRM from "@/components/LeadCRM";

type LeadCRMProps = ComponentProps<typeof LeadCRM>;

export default function LeadCRMRouteClient({ initialView, initialLeads, initialActivities, properties, currentUserId, currentUserState, blockedReason }: {
  initialView: "overview" | "pipeline";
  initialLeads: LeadCRMProps["initialLeads"];
  initialActivities: LeadCRMProps["initialActivities"];
  properties: LeadCRMProps["properties"];
  currentUserId: string | null;
  currentUserState: string | null;
  blockedReason: string | null;
}) {
  const router = useRouter();
  return (
    <LeadCRM
      initialView={initialView}
      initialLeads={initialLeads}
      initialActivities={initialActivities}
      properties={properties}
      currentUserId={currentUserId}
      currentUserState={currentUserState}
      blockedReason={blockedReason}
      onCreateProperty={() => router.push("/cadastrar")}
      onOpenProperty={(propertyId) => router.push(`/vitrine?imovel=${propertyId}`)}
    />
  );
}
