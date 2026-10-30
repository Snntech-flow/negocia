"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { moverFoto } from "@/lib/photo-order";
import { enderecoParaExibir } from "@/lib/foto-previa";

// Grade de fotos com troca de posição: setas em cada foto (celular e teclado) e arrastar e soltar (computador).
// A ordem da grade é a ordem gravada; com `capa`, a primeira foto é a capa do anúncio.
// Cores fixas (#131315/#ffffff): o tema da área logada reescreve text-white e bg-slate-900.
export default function PhotoGrid({ fotos, onChange, nome = "Foto", capa = true }: { fotos: string[]; onChange: (fotos: string[]) => void; nome?: string; capa?: boolean }) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  if (!fotos.length) return null;
  const mover = (de: number, para: number) => onChange(moverFoto(fotos, de, para));
  const soltar = () => { setArrastando(null); setSobre(null); };
  const item = nome.toLowerCase();
  const seta = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#131315]/85 text-[#ffffff] disabled:opacity-30";
  return <div className="space-y-1 pt-1">
    {fotos.length > 1 && <p className="text-[11px] text-slate-500">Para mudar a ordem, use as setas{capa ? " ou “Tornar capa”" : ""} em cada {item} — no computador, também dá para arrastar.</p>}
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {fotos.map((url, index) => <li key={`${index}:${url}`} draggable
        onDragStart={(event) => { setArrastando(index); event.dataTransfer.effectAllowed = "move"; }}
        onDragOver={(event) => { if (arrastando === null) return; event.preventDefault(); setSobre(index); }}
        onDrop={(event) => { event.preventDefault(); if (arrastando !== null) mover(arrastando, index); soltar(); }}
        onDragEnd={soltar}
        className={`relative h-28 cursor-grab overflow-hidden rounded-xl border-2 bg-slate-100 ${sobre === index && arrastando !== index ? "border-amber-500" : "border-transparent"} ${arrastando === index ? "opacity-50" : ""}`}>
        <img src={enderecoParaExibir(url)} alt={`${nome} ${index + 1}`} draggable={false} className="h-full w-full object-cover" />
        <span className="absolute left-1 top-1 rounded-md bg-[#131315]/85 px-1.5 py-0.5 text-[10px] font-bold text-[#ffffff]">{capa && index === 0 ? "Capa" : `${index + 1}ª`}</span>
        <button type="button" aria-label={`Remover ${item} ${index + 1}`} onClick={() => onChange(fotos.filter((_, i) => i !== index))} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-[#ffffff]"><Trash2 className="h-4 w-4" /></button>
        {fotos.length > 1 && <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
          <button type="button" aria-label={`Mover ${item} ${index + 1} para trás`} disabled={index === 0} onClick={() => mover(index, index - 1)} className={seta}><ChevronLeft className="h-4 w-4" /></button>
          {/* Botão claro com verbo (29/10/2026, corretora: "aparece em todas a palavra Capa"): o rótulo "Capa" fica só na 1ª. */}
          {capa && index > 0 && <button type="button" aria-label={`Tornar a ${item} ${index + 1} a capa`} onClick={() => mover(index, 0)} className="min-w-0 rounded-lg bg-[#ffffff]/95 px-1.5 py-1 text-[11px] font-bold leading-tight text-[#131315] shadow">Tornar capa</button>}
          <button type="button" aria-label={`Mover ${item} ${index + 1} para frente`} disabled={index === fotos.length - 1} onClick={() => mover(index, index + 1)} className={seta}><ChevronRight className="h-4 w-4" /></button>
        </div>}
      </li>)}
    </ol>
  </div>;
}
