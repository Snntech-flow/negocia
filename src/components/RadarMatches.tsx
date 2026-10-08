"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Radar, Share2 } from "lucide-react";
import { findRadarMatches, type RadarProperty, type RadarProfile } from "@/lib/radar-matching";

export default function RadarMatches({ properties, profiles, currentUserId, onOpenProperty, onShareProperty }: {
  properties: RadarProperty[]; profiles: RadarProfile[]; currentUserId: string | null;
  onOpenProperty: (id: string) => void; onShareProperty: (id: string) => void;
}) {
  const matches = useMemo(() => findRadarMatches(properties, profiles), [properties, profiles]);
  const [visible, setVisible] = useState(8);
  const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <section className="space-y-4 rounded-2xl border border-amber-500/40 bg-slate-900 p-5">
    <h3 className="flex items-center gap-2 font-bold text-white"><Radar className="h-5 w-5 text-amber-400" />Correspondências reais ({matches.length})</h3>
    <p className="text-xs text-slate-400">Comparamos os critérios cadastrados. Confirme a disponibilidade com o captador; a correspondência não indica aprovação de crédito.</p>
    {!matches.length && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-300">Nenhum imóvel de outro corretor atende a todos os critérios dos perfis disponíveis. Cadastre uma procura ou revise suas preferências.</p>}
    <div className="grid gap-4 md:grid-cols-2">{matches.slice(0, visible).map(({ profile, property, criteria }) => <article key={`${profile.id}:${property.id}`} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
      <p className="text-xs text-amber-300">{profile.broker.id === currentUserId ? "Sua procura" : `Procura de ${profile.broker.name}`} · {profile.clientInternalName}</p>
      <h4 className="font-bold text-white">{property.title}</h4>
      <p className="text-xs text-slate-300">{property.neighborhood}, {property.city} · {money(property.salePrice)} · até {money(profile.maxBudget)}</p>
      <div className="flex flex-wrap gap-2">{criteria.map(criterion => <span key={criterion.label} className="flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-1 text-[11px] text-emerald-300"><CheckCircle2 className="h-3 w-3" />{criterion.label}</span>)}</div>
      <p className="text-xs text-slate-400">Captador: {property.broker.name}</p>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onOpenProperty(property.id)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">Ver imóvel</button><button type="button" onClick={() => onShareProperty(property.id)} className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs text-white"><Share2 className="h-3 w-3" />Gerar ficha</button></div>
    </article>)}</div>
    {visible < matches.length && <button type="button" onClick={() => setVisible(count => count + 8)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-white">Mostrar mais correspondências</button>}
  </section>;
}
