"use client";

// Rota /radar (Radar de Compradores): cadastro de procura + matches + lista de procuras na rede.
// onShareProperty abre a ficha aqui mesmo (como o monólito); onOpenProperty navega para a vitrine.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Users } from "lucide-react";
import BuyerProfileForm from "@/components/BuyerProfileForm";
import RadarMatches from "@/components/RadarMatches";
import WhiteLabelSheet from "@/components/WhiteLabelSheet";
import type { Property } from "@/lib/property-types";
import type { SharingBroker } from "@/lib/white-label";

interface BuyerProfile {
  id: string; clientInternalName: string; propertyType: string; city: string; neighborhoods: string[];
  maxBudget: string; minBedrooms: number; minParkingSpots: number; notes: string | null;
  broker: { id: string; name: string; creci: string; whatsapp: string };
}

const formatBRL = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RadarRouteClient({ broker, properties, initialRadar, currentUserId, brokerState, blockedReason }: {
  broker: { id: string; name: string; creci: string; whatsapp: string; avatar: string };
  properties: Property[];
  initialRadar: BuyerProfile[];
  currentUserId: string | null;
  brokerState: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [radarList, setRadarList] = useState<BuyerProfile[]>(initialRadar);
  const [selectedForWhiteLabel, setSelectedForWhiteLabel] = useState<Property | null>(null);
  const sharingBroker: SharingBroker = { name: broker.name, creci: broker.creci, whatsapp: broker.whatsapp, avatar: broker.avatar };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Radar className="w-5 h-5 text-orange-700" />Radar de compradores</h2>
        <p className="text-sm text-slate-400">Cadastre o que seu cliente procura. O Radar compara os critérios com os imóveis de venda oferecidos para parceria e avisa no sino quando algum atende a todos.</p>
      </div>

      <BuyerProfileForm brokerState={brokerState} blockedReason={blockedReason}
        onCreated={(profile) => setRadarList((prev) => [{
          id: profile.id, clientInternalName: profile.clientInternalName, propertyType: profile.propertyType, city: profile.city,
          neighborhoods: (profile.neighborhoods as string[]) || [], maxBudget: profile.maxBudget, minBedrooms: profile.minBedrooms,
          minParkingSpots: profile.minParkingSpots, notes: profile.notes,
          broker: { id: broker.id, name: broker.name, creci: broker.creci, whatsapp: broker.whatsapp },
        }, ...prev])} />

      <RadarMatches properties={properties} profiles={radarList} currentUserId={currentUserId}
        onOpenProperty={(propertyId) => router.push(`/vitrine?imovel=${propertyId}`)}
        onShareProperty={(propertyId) => { const p = properties.find((item) => item.id === propertyId); if (p) setSelectedForWhiteLabel(p); }} />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Procuras na rede ({radarList.length})</h3>
          </div>
          <span className="text-xs text-slate-400">Suas procuras e as de corretores aprovados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {radarList.map((bp) => (
            <div key={bp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{bp.clientInternalName}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">No Radar</span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div><strong className="text-slate-300">Tipo:</strong> {bp.propertyType} • {bp.city}</div>
                <div><strong className="text-slate-300">Orçamento:</strong> <span className="text-amber-400 font-mono font-bold">{formatBRL(bp.maxBudget)}</span></div>
                <div><strong className="text-slate-300">Mínimo:</strong> {bp.minBedrooms} {bp.minBedrooms === 1 ? "quarto" : "quartos"}, {bp.minParkingSpots} {bp.minParkingSpots === 1 ? "vaga" : "vagas"}</div>
                {bp.notes && <div className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">&ldquo;{bp.notes}&rdquo;</div>}
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Corretor: <span className="text-white font-medium">{bp.broker.name}</span></span>
                <span className="font-mono text-amber-400">CRECI {bp.broker.creci}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedForWhiteLabel && <WhiteLabelSheet key={selectedForWhiteLabel.id} property={selectedForWhiteLabel} broker={sharingBroker} onClose={() => setSelectedForWhiteLabel(null)} />}
    </div>
  );
}
