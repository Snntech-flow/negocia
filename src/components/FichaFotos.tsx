"use client";

import { useState } from "react";
import PhotoViewer from "./PhotoViewer";

// As fotos da FICHA PÚBLICA do imóvel (/ficha/<token>), 28/10/2026 — Sidney: "no link da imagem também clica e não vai".
// Antes a capa e as miniaturas eram imagens soltas: nada abria, e só iam 8 fotos (e a 1ª sumia quando a capa era outra).
// Agora todas as fotos (capa na frente) abrem a mesma galeria em tela cheia da Vitrine: setas, teclado, deslizar e Esc.
export default function FichaFotos({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [indice, setIndice] = useState<number | null>(null);
  if (fotos.length === 0) return null;
  const [capa, ...resto] = fotos;
  return <>
    <button type="button" onClick={() => setIndice(0)} aria-label={`Ver as fotos de ${titulo}`} className="relative block w-full">
      <img src={capa} alt={titulo} className="h-56 w-full object-cover" />
      {fotos.length > 1 && <span className="absolute bottom-3 right-3 rounded-lg bg-[#000000]/70 px-2.5 py-1 text-xs font-semibold text-[#ffffff]">{fotos.length} fotos</span>}
    </button>
    {resto.length > 0 && <div className="grid grid-cols-4 gap-2 p-3">
      {resto.map((url, i) => <button key={url} type="button" onClick={() => setIndice(i + 1)} aria-label={`Ver a foto ${i + 2} de ${fotos.length}`}>
        <img src={url} alt={`${titulo} — foto ${i + 2}`} className="h-20 w-full rounded-lg object-cover" />
      </button>)}
    </div>}
    {indice !== null && <PhotoViewer fotos={fotos} indice={indice} titulo={titulo} onIndice={setIndice} onFechar={() => setIndice(null)} />}
  </>;
}
