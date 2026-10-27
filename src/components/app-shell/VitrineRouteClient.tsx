"use client";

// Rota /vitrine sob o AppShell: segura os filtros/paginação e refaz a busca (getMarketplaceData section:vitrine),
// como o monólito fazia. A ficha para o cliente (WhiteLabelSheet) abre aqui; a navegação entre telas é por rota.
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import PropertyMarketplace from "@/components/PropertyMarketplace";
import WhiteLabelSheet from "@/components/WhiteLabelSheet";
import { getMarketplaceData } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { PROPERTY_PAGE_SIZE } from "@/lib/marketplace-query";
import { PROPERTY_TYPES } from "@/lib/property-options";
import type { Property } from "@/lib/property-types";
import type { SharingBroker } from "@/lib/white-label";

const GUIDANCE = "MLS é uma rede em que corretores compartilham imóveis e oportunidades. Consulte as condições com o captador; o endereço completo e os dados do proprietário ficam restritos a ele. Para mudar fotos, valor ou condição de parceria de um imóvel SEU, use o botão “Editar em Meus imóveis” no cartão dele (ou o menu Imóveis › Meus imóveis).";

export default function VitrineRouteClient({ initialProperties, initialPropertyTotal, broker, currentUserId, blockedReason }: {
  initialProperties: Property[];
  initialPropertyTotal: number;
  broker: SharingBroker;
  currentUserId: string | null;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imovelParam = searchParams.get("imovel");

  const [properties, setProperties] = useState(initialProperties);
  const [propertyTotal, setPropertyTotal] = useState(initialPropertyTotal);
  const [propertyPage, setPropertyPage] = useState(1);
  const [purpose, setPurpose] = useState("todos");
  const [type, setType] = useState("todos");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(true);
  const [selectedForWhiteLabel, setSelectedForWhiteLabel] = useState<Property | null>(null);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);

  const setPropertyFilterPurpose = (value: string) => { setPurpose(value); setPropertyPage(1); };
  const setPropertyFilterType = (value: string) => { setType(value); setPropertyPage(1); };
  const setPropertyFilterSearch = (value: string) => { setSearch(value); setPropertyPage(1); };

  const requestKey = JSON.stringify([propertyPage, purpose, type, search]);
  const firstLoad = useRef(true);
  useEffect(() => {
    // A carga inicial veio do servidor; só refaz a busca quando filtros/página mudam.
    if (firstLoad.current) { firstLoad.current = false; return; }
    let cancelled = false;
    setLoaded(false);
    const timer = window.setTimeout(async () => {
      try {
        const data = unwrap(await getMarketplaceData({ section: "vitrine", page: propertyPage, purpose, propertyType: type, search }));
        if (cancelled) return;
        const lastPage = Math.max(1, Math.ceil(data.propertyTotal / PROPERTY_PAGE_SIZE));
        if (propertyPage > lastPage) { setPropertyPage(lastPage); return; }
        setProperties(data.properties);
        setPropertyTotal(data.propertyTotal);
        setLoaded(true);
      } catch { if (!cancelled) setLoaded(true); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Veio de uma notificação (?imovel=…): abre a ficha se o imóvel está na lista; senão, rola até ele quando aparecer.
  useEffect(() => {
    if (!imovelParam) return;
    const prop = properties.find((p) => p.id === imovelParam);
    if (prop) setSelectedForWhiteLabel(prop);
    else setPendingPropertyId(imovelParam);
  }, [imovelParam, properties]);
  useEffect(() => {
    if (!loaded || !pendingPropertyId) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector(`[data-property-id="${pendingPropertyId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingPropertyId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [loaded, pendingPropertyId]);

  return (
    <>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <div>
          <h2 className="mls-guidance-title text-xs font-bold">Vitrine de imóveis compartilhados (MLS)</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{GUIDANCE}</p>
        </div>
      </div>

      <PropertyMarketplace properties={properties} propertyTotal={propertyTotal} propertyPage={propertyPage} loading={!loaded}
        currentUserId={currentUserId} propertyTypes={PROPERTY_TYPES} propertyFilterPurpose={purpose} propertyFilterType={type} propertyFilterSearch={search}
        setPropertyFilterPurpose={setPropertyFilterPurpose} setPropertyFilterType={setPropertyFilterType} setPropertyFilterSearch={setPropertyFilterSearch}
        setPropertyPage={setPropertyPage} onCreate={() => router.push("/cadastrar")} blockedReason={blockedReason}
        onShare={setSelectedForWhiteLabel}
        onSchedule={(property) => router.push(`/dvp?imovel=${property.id}`)}
        onEdit={(property) => router.push(`/cadastrar?imovel=${property.id}`)} />

      {selectedForWhiteLabel && <WhiteLabelSheet key={selectedForWhiteLabel.id} property={selectedForWhiteLabel} broker={broker} onClose={() => setSelectedForWhiteLabel(null)} />}
    </>
  );
}
