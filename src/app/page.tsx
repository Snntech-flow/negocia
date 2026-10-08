import { getMarketplaceData } from "@/lib/actions";
import NegociaLarApp from "@/components/NegociaLarApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    properties,
    propertyTotal,
    radarList,
    users,
    transactions,
    currentUser,
    notifications,
    dvpList,
    partnerships,
    partnershipActivities,
    leads,
    leadActivities,
    pilotFeedback,
  } = await getMarketplaceData({ section: "vitrine" });

  return (
    <NegociaLarApp
      initialProperties={properties}
      initialPropertyTotal={propertyTotal}
      initialRadar={radarList}
      initialUsers={users}
      initialTransactions={transactions}
      initialCurrentUser={currentUser}
      initialNotifications={notifications}
      initialDvpList={dvpList}
      initialPartnerships={partnerships}
      initialPartnershipActivities={partnershipActivities}
      initialLeads={leads}
      initialLeadActivities={leadActivities}
      initialFeedback={pilotFeedback}
    />
  );
}
