// Guia da tela (banner no topo de cada rota), extraído do NegociaLarApp. Texto por tela, mesma aparência do monólito.
import { Info } from "lucide-react";

export const SCREEN_GUIDANCE: Record<string, { title: string; description: string }> = {
  vitrine: { title: "Vitrine de imóveis compartilhados (MLS)", description: "MLS é uma rede em que corretores compartilham imóveis e oportunidades. Consulte as condições com o captador; o endereço completo e os dados do proprietário ficam restritos a ele. Para mudar fotos, valor ou condição de parceria de um imóvel SEU, use o botão “Editar em Meus imóveis” no cartão dele (ou o menu Imóveis › Meus imóveis)." },
  crm: { title: "CRM interno do corretor", description: "Organize clientes e parceiros, acompanhe cada oportunidade por etapa, registre contatos e programe retornos. Os leads ficam privados na sua carteira." },
  radar: { title: "Radar de Compradores", description: "Compare as preferências de compradores cadastrados com os imóveis disponíveis. Confira os critérios do match antes de falar com o corretor responsável." },
  termo: { title: "Termo de Parceria", description: "O termo de cada parceria sai com a divisão da comissão confirmada pelos dois corretores. Leia, aceite e acompanhe o aceite do outro; assinado, imprima ou salve em PDF." },
  dvp: { title: "Registro de visita · DVP", description: "Salve os dados da visita para consulta e acompanhamento. O rascunho não é assinado por ninguém, não confirma um acordo e não garante comissão." },
  cadastrar: { title: "Meus imóveis", description: "Para mudar fotos, valor ou condição de parceria, clique em “Editar” no imóvel, na lista abaixo. Aqui você também arquiva e cadastra imóveis. Os dados completos de endereço e do proprietário ficam visíveis apenas para o corretor captador." },
  admin: { title: "Corretores e pagamentos", description: "Aprove CRECIs e confirme ou estorne pagamentos via Pix. O pagamento é conferido manualmente no extrato do banco." },
};

export default function ScreenGuidance({ screen }: { screen: keyof typeof SCREEN_GUIDANCE }) {
  const guia = SCREEN_GUIDANCE[screen];
  if (!guia) return null;
  const isDvp = screen === "dvp";
  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${isDvp ? "border-amber-500/40 bg-amber-950/25" : "border-sky-200 bg-sky-50"}`}>
      <Info className={`mt-0.5 h-4 w-4 shrink-0 ${isDvp ? "text-amber-300" : "text-sky-700"}`} />
      <div>
        <h2 className={`text-xs font-bold ${screen === "vitrine" ? "mls-guidance-title" : isDvp ? "text-amber-200" : "text-sky-900"}`}>{guia.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{guia.description}</p>
      </div>
    </div>
  );
}
