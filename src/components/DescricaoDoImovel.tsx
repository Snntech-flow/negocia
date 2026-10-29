"use client";

import { useState } from "react";

// A descrição do imóvel no cartão da Vitrine (28/10/2026, Sidney: "a descrição tem '...' e tem mais coisas escritas, só
// que clica e não abre o que tem escrito"). Fechada mostra 2 linhas; "Ler mais" abre o texto inteiro, com as quebras de
// linha que o corretor escreveu. O botão só aparece quando o texto não cabe nas 2 linhas.
export const DESCRICAO_CURTA = 120;

export const descricaoLonga = (texto: string) => texto.length > DESCRICAO_CURTA || texto.includes("\n");

export default function DescricaoDoImovel({ texto, className = "" }: { texto: string | null | undefined; className?: string }) {
  const [aberta, setAberta] = useState(false);
  if (!texto?.trim()) return null;
  const longa = descricaoLonga(texto);
  return <div className={className}>
    <p className={`text-xs text-slate-400 leading-relaxed whitespace-pre-line ${aberta ? "" : "line-clamp-2"}`}>{texto}</p>
    {longa && <button type="button" aria-expanded={aberta} onClick={() => setAberta((v) => !v)}
      className="mt-1 text-xs font-semibold text-orange-700 hover:underline">{aberta ? "Ler menos" : "Ler mais"}</button>}
  </div>;
}
