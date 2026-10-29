"use client";
// Termo de Parceria de cada parceria: o corretor lê o texto gerado com os dados da parceria, aceita, acompanha o aceite do
// outro e imprime / salva em PDF. O servidor confere o texto aceito (impressão sha-256) e grava data, hora e IP.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Printer, Scale } from "lucide-react";
import { acceptPartnershipTerm, listMyPartnershipTerms, type TermoDaParceria } from "@/lib/actions/partnership-terms";
import { unwrap } from "@/lib/action-result";
import { blocosDoTermo, type SituacaoDaParte, type SituacaoDoTermo } from "@/lib/partnership-term";

const quando = (data: Date) => new Date(data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

function situacaoDaLista(item: TermoDaParceria): { texto: string; cor: string } {
  if (item.termo?.assinado) return { texto: "Termo assinado", cor: "border-emerald-500/40 text-emerald-300" };
  if (item.termo && item.podeAceitar) {
    const minha = item.souCaptador ? item.termo.captador : item.termo.parceiro;
    return { texto: minha.situacao === "texto_anterior" ? "O texto mudou — aceite de novo" : "Falta o seu aceite", cor: "border-amber-500/50 text-amber-300" };
  }
  if (item.termo) return { texto: "Aguardando o outro corretor", cor: "border-sky-500/40 text-sky-300" };
  if (item.status === "recusado") return { texto: "Parceria recusada", cor: "border-slate-600 text-slate-400" };
  return { texto: "Divisão a confirmar", cor: "border-slate-600 text-slate-400" };
}

function textoDaParte(s: SituacaoDaParte) {
  if (s.situacao === "aceito" && s.aceitoEm) return `Aceito em ${quando(s.aceitoEm)} (horário de Brasília)${s.ip ? ` · IP ${s.ip}` : ""}`;
  if (s.situacao === "texto_anterior") return "Aceitou um texto anterior; precisa aceitar este.";
  return "Aguardando aceite.";
}

// Janela própria para imprimir: só o termo, em preto e branco. O texto entra por textContent (nada vira HTML).
function imprimir(item: TermoDaParceria, termo: SituacaoDoTermo): boolean {
  const page = window.open("", "_blank");
  if (!page) return false;
  const doc = page.document;
  doc.title = `Termo de Parceria ${item.codigo}`;
  const style = doc.createElement("style");
  style.textContent = "body{font:14px/1.6 Georgia,serif;color:#000;margin:48px;max-width:760px}h1{font-size:15px;text-align:center;letter-spacing:.04em}"
    + ".id{text-align:center;font-size:11px;color:#444}h2{font-size:13px;margin:18px 0 4px}p{margin:6px 0;white-space:pre-line}"
    + ".rascunho{border:2px solid #000;padding:8px;text-align:center;font-weight:bold}.registro{border-top:1px solid #000;margin-top:28px;padding-top:8px;font-size:12px}"
    + ".hash{font-family:monospace;font-size:10px;word-break:break-all}";
  doc.head.appendChild(style);
  const add = (tag: string, texto: string, className?: string) => {
    const el = doc.createElement(tag);
    el.textContent = texto;
    if (className) el.className = className;
    doc.body.appendChild(el);
  };
  if (!termo.assinado) add("p", "RASCUNHO — este termo ainda não foi aceito pelos dois corretores.", "rascunho");
  blocosDoTermo(termo.texto).forEach((bloco, i) => {
    if (i === 0) add("h1", bloco.texto);
    else if (i === 1) add("p", bloco.texto, "id");
    else { if (bloco.titulo) add("h2", bloco.titulo); add("p", bloco.texto); }
  });
  add("h2", "Registro dos aceites na NegociaLar");
  add("p", `CAPTADOR — ${item.captador}: ${textoDaParte(termo.captador)}`, "registro");
  add("p", `PARCEIRO — ${item.parceiro}: ${textoDaParte(termo.parceiro)}`);
  add("p", `Impressão sha-256 do texto: ${termo.impressao}`, "hash");
  page.focus();
  page.print();
  return true;
}

export default function PartnershipTerms() {
  const [itens, setItens] = useState<TermoDaParceria[] | null>(null);
  const [erro, setErro] = useState("");
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [li, setLi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    try {
      const lista = unwrap(await listMyPartnershipTerms());
      setItens(lista);
      setErro("");
      setEscolhida((atual) => (atual && lista.some((i) => i.id === atual) ? atual : lista.find((i) => i.podeAceitar)?.id ?? lista[0]?.id ?? null));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar os termos.");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const item = itens?.find((i) => i.id === escolhida) ?? null;
  const termo = item?.termo ?? null;

  async function aceitar() {
    if (!item || !termo) return;
    setOcupado(true); setMensagem("");
    try {
      const resultado = unwrap(await acceptPartnershipTerm(item.id, termo.impressao));
      setMensagem(resultado.assinado ? "Aceite registrado. Os dois corretores aceitaram: o termo está assinado." : resultado.jaAceito ? "Seu aceite já estava registrado." : "Aceite registrado. Falta o aceite do outro corretor.");
      setLi(false);
      await carregar();
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Não foi possível registrar o aceite.");
      await carregar();
    } finally { setOcupado(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale className="w-5 h-5 text-amber-500" />Termo de Parceria</h2>
        <p className="text-sm text-slate-400">
          Cada parceria com a divisão da comissão confirmada pelos dois corretores tem o seu termo, com cláusula de não atravessamento.
          Cada um lê e aceita aqui; com os dois aceites o termo fica assinado (assinatura eletrônica simples) e pode ser impresso ou salvo em PDF.
        </p>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-300">{erro}</p>}
      {!itens && !erro && <p className="text-sm text-slate-400">Carregando os termos…</p>}
      {itens && itens.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-white">Você ainda não tem parcerias.</p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400">A parceria nasce quando um corretor registra a visita a um imóvel de outro (Documentos › Registro de Visita). Depois que os dois confirmam a divisão da comissão, o termo aparece aqui.</p>
        </div>
      )}

      {itens && itens.length > 0 && (
        <ul className="space-y-2" aria-label="Parcerias">
          {itens.map((i) => {
            const s = situacaoDaLista(i);
            const atual = i.id === escolhida;
            return (
              <li key={i.id}>
                <button type="button" aria-current={atual ? "true" : undefined} onClick={() => { setEscolhida(i.id); setLi(false); setMensagem(""); }}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-left ${atual ? "border-amber-500 ring-2 ring-amber-500/40" : "border-slate-800 hover:border-slate-600"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{i.imovel}</span>
                    <span className="block text-[11px] text-slate-400">Parceria {i.codigo} · {i.souCaptador ? `você capta; parceiro: ${i.parceiro}` : `captador: ${i.captador}; você é o parceiro`}</span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${s.cor}`}>{s.texto}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* "Divisão a confirmar" é a situação, não um botão (28/10/2026, Sidney: "estou clicando e nada acontece"): a ação mora
          aqui embaixo — leva ao acompanhamento DESTA parceria no Registro de Visita, onde a divisão é confirmada. */}
      {item && !termo && (
        <div className="space-y-3 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-300">
            {item.status === "recusado"
              ? "Esta parceria foi recusada; não há termo."
              : item.divisao === "nao_registrada"
                ? "Esta parceria não tem divisão da comissão registrada. Revise a divisão em Documentos › Registro de Visita, no acompanhamento da parceria; com os dois de acordo, o termo aparece aqui."
                : "O termo sai quando os dois corretores confirmam a divisão da comissão (Documentos › Registro de Visita, no acompanhamento da parceria)."}
          </p>
          {item.status !== "recusado" && <Link href={`/dvp#parceria-${item.id}`} className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Ver e confirmar a divisão da comissão</Link>}
        </div>
      )}

      {item && termo && (
        <>
          <article className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            {!termo.assinado && <p className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-2 text-center text-[11px] font-bold text-amber-300">Rascunho até os dois corretores aceitarem.</p>}
            {blocosDoTermo(termo.texto).map((bloco, i) => i === 0
              ? <h3 key={i} className="text-center text-sm font-bold uppercase tracking-wide text-white">{bloco.texto}</h3>
              : i === 1
                ? <p key={i} className="text-center text-[11px] text-slate-400">{bloco.texto}</p>
                : <section key={i}>{bloco.titulo && <h4 className="text-sm font-bold text-white">{bloco.titulo}</h4>}<p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{bloco.texto}</p></section>)}
            <section className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Registro dos aceites</h4>
              {([["CAPTADOR", item.captador, termo.captador], ["PARCEIRO", item.parceiro, termo.parceiro]] as const).map(([papel, nome, s]) => (
                <p key={papel} className="flex items-start gap-2 text-xs text-slate-300">
                  {s.situacao === "aceito" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                  <span><strong>{papel}</strong> — {nome}: {textoDaParte(s)}</span>
                </p>
              ))}
              <p className="break-all font-mono text-[10px] text-slate-500">Impressão sha-256 do texto: {termo.impressao}</p>
            </section>
          </article>

          <div className="flex flex-wrap items-start gap-3">
            {item.podeAceitar && (
              <div className="flex-1 space-y-2 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4">
                <label className="flex items-start gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="mt-1" checked={li} onChange={(e) => setLi(e.target.checked)} />
                  <span>Li o termo inteiro e aceito as cláusulas acima.</span>
                </label>
                <p className="text-[11px] text-slate-400">Ao aceitar, a NegociaLar registra a data, a hora, o endereço IP e a impressão deste texto (cláusula 7).</p>
                <button type="button" disabled={!li || ocupado} onClick={() => void aceitar()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
                  {ocupado ? "Registrando…" : "Aceitar o termo"}
                </button>
              </div>
            )}
            <button type="button" onClick={() => { if (!imprimir(item, termo)) setMensagem("Permita a abertura da janela para imprimir."); }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300">
              <Printer className="h-4 w-4" />Imprimir / salvar PDF
            </button>
          </div>
        </>
      )}
      {mensagem && <p role="status" className="text-sm text-amber-300">{mensagem}</p>}
    </div>
  );
}
