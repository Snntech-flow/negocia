import { X } from "lucide-react";

// X de fechar visível em qualquer tema: cores fixas. O tema da área logada pinta de branco o fundo das janelas e
// deixava o "✕" cinza-claro sobre branco — a corretora não achava como sair da ficha (15/10/2026).
export default function BotaoFechar({ onClick, rotulo = "Fechar", className = "" }: { onClick: () => void; rotulo?: string; className?: string }) {
  return <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo}
    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#d0d0d5] bg-[#ffffff] px-2.5 text-xs font-bold text-[#131315] hover:bg-[#f3f3f5] ${className}`}>
    <X className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Fechar</span>
  </button>;
}
