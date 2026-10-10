"use client";

import { useState } from "react";
import { CheckCircle2, Copy, FileText, Phone, Share2 } from "lucide-react";
import type { Property } from "@/lib/property-types";
import { formatArea, whiteLabelContact, whiteLabelHtml, whiteLabelText, type SharingBroker } from "@/lib/white-label";
import Avatar from "./Avatar";

export default function WhiteLabelSheet({ property, broker, onClose }: { property: Property; broker: SharingBroker; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contact = whiteLabelContact(property, broker);
  async function copy() {
    try { await navigator.clipboard.writeText(whiteLabelText(property, broker)); setCopied(true); setError(null); }
    catch { setError("Não foi possível copiar a ficha. Verifique a permissão da área de transferência."); }
  }
  function print() {
    const preview = window.open("", "_blank", "width=900,height=800");
    if (!preview) { setError("Permita a abertura da prévia para imprimir ou salvar como PDF."); return; }
    preview.opener = null;
    preview.document.open();
    preview.document.write(whiteLabelHtml(property, broker));
    preview.onload = () => { preview.focus(); preview.print(); };
    preview.document.close();
    setError(null);
  }
  const photo = property.coverPhoto || property.photos[0];
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="white-label-title">
    <div className="my-8 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-800 p-6"><div><p className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400"><Share2 className="h-4 w-4" />Ficha do imóvel</p><h3 id="white-label-title" className="mt-1 text-lg font-bold text-white">Compartilhar com seu cliente</h3></div><button type="button" aria-label="Fechar ficha" onClick={onClose} className="rounded-lg p-2 text-slate-300">✕</button></div>
      <div className="space-y-5 p-6">
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">A ficha usa seus dados de atendimento: {broker.name}, CRECI {broker.creci} e seu WhatsApp. O endereço completo e os dados do proprietário e do captador ficam fora da ficha.</p>
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"><header className="flex items-center gap-3 border-b border-slate-800 pb-3"><Avatar name={broker.name} url={broker.avatar} size={40} /><div><p className="text-sm font-bold text-white">{broker.name}</p><p className="text-xs text-slate-400">CRECI {broker.creci}</p></div></header>
          {photo && <img src={photo} alt={property.title} className="h-48 w-full rounded-xl object-cover" />}
          <p className="text-xs text-slate-400">{property.neighborhood}, {property.city}</p><h4 className="font-bold text-white">{property.title}</h4><p className="text-xl font-extrabold text-amber-400">{Number(property.salePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          <p className="text-xs text-slate-300">{property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"} · {property.bathrooms} {property.bathrooms === 1 ? "banheiro" : "banheiros"} · {property.parkingSpots} {property.parkingSpots === 1 ? "vaga" : "vagas"} · {formatArea(property.areaM2)} m²</p>
          {contact ? <a href={contact} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950"><Phone className="h-4 w-4" />{broker.whatsapp}</a> : <p className="text-xs text-slate-400">WhatsApp indisponível.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void copy()} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Ficha copiada" : "Copiar ficha"}</button><button type="button" onClick={print} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-white"><FileText className="h-4 w-4" />Imprimir / salvar PDF</button></div>
      </div>
    </div>
  </div>;
}
