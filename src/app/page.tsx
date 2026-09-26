import { getMarketplaceData } from "@/lib/actions";
import NegociaLarApp from "@/components/NegociaLarApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    properties,
    radarList,
    users,
    transactions,
    currentUser,
    notifications,
    dvpList,
  } = await getMarketplaceData();

  return (
    <NegociaLarApp
      initialProperties={properties}
      initialRadar={radarList}
      initialUsers={users}
      initialTransactions={transactions}
      initialCurrentUser={currentUser}
      initialNotifications={notifications}
      initialDvpList={dvpList}
    />
  );
}
