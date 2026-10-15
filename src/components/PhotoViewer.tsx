"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useVoltarFecha } from "@/lib/use-voltar-fecha";

// Fotos do imóvel em tela cheia, a partir da Vitrine (pedido da corretora piloto, 14/10/2026: "quando clicamos em fotos,
// não conseguimos abrir… assim o corretor sabe se é interessante ou não"). Setas, teclado (← → Esc) e deslizar no celular.
// Cores fixas: o tema da área logada reescreve text-white e bg-slate-900.

/** Próxima posição dando a volta: da última foto para a primeira e vice-versa. */
export const fotoVizinha = (indice: number, total: number, passo: 1 | -1) => (total > 0 ? (indice + passo + total) % total : 0);

export function GaleriaDeFotos({ fotos, indice, titulo, onIndice, onFechar }: {
  fotos: string[]; indice: number; titulo: string; onIndice: (indice: number) => void; onFechar: () => void;
}) {
  const inicioDoToque = useRef<number | null>(null);
  const ir = (passo: 1 | -1) => onIndice(fotoVizinha(indice, fotos.length, passo));
  const seta = "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/15 text-[#ffffff] hover:bg-[#ffffff]/25";
  return <div role="dialog" aria-modal="true" aria-label={`Fotos: ${titulo}`} className="fixed inset-0 z-[100] flex flex-col bg-[#000000]/95 text-[#ffffff]"
    onClick={(event) => { if (event.target === event.currentTarget) onFechar(); }}>
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="min-w-0 truncate text-sm font-semibold">{titulo}</p>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums">{indice + 1} / {fotos.length}</span>
        <button type="button" aria-label="Fechar fotos" onClick={onFechar} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff]/15 hover:bg-[#ffffff]/25"><X className="h-5 w-5" /></button>
      </div>
    </div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4"
      onTouchStart={(event) => { inicioDoToque.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const inicio = inicioDoToque.current; inicioDoToque.current = null;
        const fim = event.changedTouches[0]?.clientX;
        if (inicio !== null && fim !== undefined && Math.abs(fim - inicio) > 40) ir(fim < inicio ? 1 : -1);
      }}>
      <img src={fotos[indice]} alt={`${titulo} — foto ${indice + 1} de ${fotos.length}`} className="max-h-full max-w-full select-none object-contain" draggable={false} />
      {fotos.length > 1 && <>
        <button type="button" aria-label="Foto anterior" onClick={() => ir(-1)} className={`${seta} left-3`}><ChevronLeft className="h-6 w-6" /></button>
        <button type="button" aria-label="Próxima foto" onClick={() => ir(1)} className={`${seta} right-3`}><ChevronRight className="h-6 w-6" /></button>
      </>}
    </div>
  </div>;
}

export default function PhotoViewer(props: { fotos: string[]; indice: number; titulo: string; onIndice: (indice: number) => void; onFechar: () => void }) {
  const { fotos, indice, onIndice, onFechar } = props;
  // Esc e a seta de voltar do navegador fecham a galeria (15/10/2026) — voltar não sai mais do aplicativo.
  const fechar = useVoltarFecha(onFechar);
  useEffect(() => {
    const tecla = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onIndice(fotoVizinha(indice, fotos.length, 1));
      else if (event.key === "ArrowLeft") onIndice(fotoVizinha(indice, fotos.length, -1));
    };
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = rolagem; };
  }, [fotos.length, indice, onIndice]);
  return createPortal(<GaleriaDeFotos {...props} onFechar={fechar} />, document.body);
}
