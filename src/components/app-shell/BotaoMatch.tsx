"use client";

// Botão "Match" do cabeçalho (28/10/2026). Laranja com o número quando há match que o corretor ainda não viu (contado no
// servidor, no layout). Ao abrir: carrega a lista, mostra "você já tem N matches" e marca os novos como vistos — o
// laranja apaga, e os que chegaram agora seguem com o selo NOVO até fechar o painel.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyMatches, markMatchesSeen } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { BotaoDoMatch, PainelDoMatch, type EstadoDoMatch } from "./MatchVisual";

export default function BotaoMatch({ novosIniciais }: { novosIniciais: number }) {
  const router = useRouter();
  const [novos, setNovos] = useState(novosIniciais);
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoDoMatch>({ tipo: "carregando" });

  // Clique fora ou Esc fecham o painel.
  useEffect(() => {
    if (!aberto) return;
    const fora = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest("[data-botao-match]")) setAberto(false); };
    const tecla = (event: KeyboardEvent) => { if (event.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); window.removeEventListener("keydown", tecla); };
  }, [aberto]);

  async function alternar() {
    if (aberto) { setAberto(false); return; }
    setAberto(true);
    setEstado({ tipo: "carregando" });
    try {
      const dados = unwrap(await getMyMatches());
      setEstado({ tipo: "pronto", ...dados });
      const chavesNovas = dados.matches.filter((match) => match.novo).map((match) => match.chave);
      // Se marcar como visto falhar, a lista continua na tela e o laranja fica para a próxima vez.
      if (!chavesNovas.length || (await markMatchesSeen(chavesNovas)).ok) setNovos(0);
    } catch (error) {
      setEstado({ tipo: "erro", mensagem: error instanceof Error ? error.message : "Não foi possível carregar os matches." });
    }
  }

  return <div className="relative" data-botao-match="">
    <BotaoDoMatch novos={novos} aberto={aberto} onClick={() => void alternar()} />
    {aberto && <PainelDoMatch estado={estado} onIr={(url) => { setAberto(false); router.push(url); }} />}
  </div>;
}
