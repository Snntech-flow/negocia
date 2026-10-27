"use client";

import BrokerFinance from "@/components/BrokerFinance";
import { useRouteToast } from "./useRouteToast";

export default function FinanceiroRouteClient({ blockedReason }: { blockedReason: string | null }) {
  const { showToast, toastNode } = useRouteToast();
  return (
    <div className="max-w-5xl mx-auto">
      <BrokerFinance blockedReason={blockedReason} onMessage={showToast} />
      {toastNode}
    </div>
  );
}
