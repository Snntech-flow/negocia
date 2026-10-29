// Botão "Match" do cabeçalho e o painel que ele abre — só a aparência (sem servidor), para a tela e os testes usarem a mesma
// peça. Sidney, 28/10/2026: "toda vez que tivesse um match ele ficava vermelho, e dentro dele os matches; quando entrasse
// aparecia 'você já tem 8 matches', pro corretor ver que funciona". Cores fixas: o tema do cabeçalho repinta as classes
// slate e amber. Com match novo o botão fica LARANJA do site (28/10/2026, Sidney: "tem como pôr o laranja ao invés do
// vermelho?"); sem novo, azul como os outros. O painel segue o laranja das notificações; o vermelho ficou só no selo NOVO.
import { HeartHandshake } from "lucide-react";
import { frasePrincipalDoMatch, type MeuMatch } from "@/lib/meus-matches";

export type EstadoDoMatch =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; podeVerARede: boolean; matches: MeuMatch[] };

export function BotaoDoMatch({ novos, aberto, onClick }: { novos: number; aberto: boolean; onClick: () => void }) {
  const destaque = novos > 0;
  return <button type="button" onClick={onClick} aria-expanded={aberto} data-match-novos={novos}
    aria-label={destaque ? `Match: ${novos} ${novos === 1 ? "novo" : "novos"}` : "Match"}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${destaque
      ? "border-[#d97706] bg-[#f59e0b] text-[#083858] hover:bg-[#fbbf24]"
      : "border-[#326480] bg-[#16486b] text-[#ffffff] hover:bg-[#205779]"}`}>
    <HeartHandshake className="h-4 w-4" aria-hidden="true" />Match
    {destaque && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#083858] px-1 text-[10px] font-black text-[#ffffff]">{novos}</span>}
  </button>;
}

const dinheiro = (valor: string) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function PainelDoMatch({ estado, onIr }: { estado: EstadoDoMatch; onIr: (url: string) => void }) {
  const total = estado.tipo === "pronto" ? estado.matches.length : 0;
  const link = "text-xs font-bold text-[#083858] underline hover:no-underline";
  return <div data-painel-match="" className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-[26rem] rounded-2xl border-2 border-[#d97706] bg-[#f59e0b] text-[#083858] shadow-2xl z-50 overflow-hidden">
    <div className="space-y-1 border-b-2 border-[#083858]/20 p-4">
      <p className="flex items-center gap-2 text-base font-extrabold text-[#083858]"><HeartHandshake className="h-5 w-5" aria-hidden="true" />
        {estado.tipo === "pronto" ? frasePrincipalDoMatch(total) : estado.tipo === "carregando" ? "Procurando seus matches…" : "Match"}</p>
      <p className="text-xs font-medium text-[#083858]">Imóveis da rede para os seus clientes e clientes de outros corretores para os seus imóveis, pelos critérios do Radar de Compradores.</p>
    </div>
    {estado.tipo === "erro" && <p role="alert" className="p-4 text-[13px] font-semibold text-[#7f1d1d]">{estado.mensagem}</p>}
    {estado.tipo === "pronto" && !estado.podeVerARede && <p className="p-4 text-[13px] font-medium text-[#083858]">O Match usa a rede de corretores: ele fica ativo com o CRECI aprovado e a assinatura em dia.</p>}
    {estado.tipo === "pronto" && estado.podeVerARede && total === 0 && <div className="space-y-3 p-4">
      <p className="text-[13px] font-medium text-[#083858]">Cadastre no Radar de Compradores o que o seu cliente procura e deixe seus imóveis abertos para parceria. Quando aparecer um match, este botão fica laranja.</p>
      <button type="button" onClick={() => onIr("/radar")} className="rounded-lg bg-[#083858] px-3 py-2 text-xs font-bold text-[#ffffff]">Cadastrar o que meu cliente procura</button>
    </div>}
    {estado.tipo === "pronto" && total > 0 && <ul className="max-h-96 overflow-y-auto divide-y divide-[#083858]/15">
      {estado.matches.map((match) => <li key={match.chave} data-match-novo={match.novo ? "" : undefined}
        className={`flex gap-3 p-3.5 ${match.novo ? "border-l-4 border-[#dc2626] bg-[#f59e0b]" : "bg-[#fcd34d]"}`}>
        {match.imovel.foto
          ? <img src={match.imovel.foto} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
          : <div className="h-16 w-20 shrink-0 rounded-lg bg-[#083858]/10" aria-hidden="true" />}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#083858]">
            {match.novo && <span className="rounded bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-black text-[#ffffff]">NOVO</span>}
            {match.lado === "meu_cliente" ? `Seu cliente: ${match.cliente}` : `${match.cliente} procura um imóvel como o seu`}
          </p>
          <p className="truncate text-sm font-bold text-[#083858]">{match.imovel.title}</p>
          <p className="text-xs font-medium text-[#083858]">{match.imovel.neighborhood}, {match.imovel.city} · {dinheiro(match.imovel.salePrice)}</p>
          <p className="text-[11px] font-medium text-[#083858]">{match.lado === "meu_cliente" ? `Captador: ${match.outroCorretor}` : `Corretor: ${match.outroCorretor}`}</p>
          <div className="flex flex-wrap gap-3 pt-0.5">
            {match.lado === "meu_cliente"
              ? <><button type="button" onClick={() => onIr(`/vitrine?imovel=${match.imovelId}`)} className={link}>Ver na Vitrine</button>
                <button type="button" onClick={() => onIr(`/vitrine?ficha=${match.imovelId}`)} className={link}>Ficha para o cliente</button></>
              : <button type="button" onClick={() => onIr("/radar")} className={link}>Ver no Radar</button>}
          </div>
        </div>
      </li>)}
    </ul>}
    {estado.tipo === "pronto" && total > 0 && <div className="border-t-2 border-[#083858]/20 p-3 text-center">
      <button type="button" onClick={() => onIr("/radar")} className={link}>Abrir o Radar de Compradores</button>
    </div>}
  </div>;
}
