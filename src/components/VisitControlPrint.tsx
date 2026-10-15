"use client";
// Controle de visita a imóvel: o corretor escolhe o percentual da comissão e imprime a declaração já preenchida para o
// cliente assinar no papel (src/lib/visit-control.ts). Imprime por um iframe escondido — sem janela nova, que o bloqueador
// de pop-up barra — e monta a folha por textContent (nada do cadastro vira HTML).
import { useState } from "react";
import { Printer } from "lucide-react";
import { getVisitControl } from "@/lib/actions/visit-control";
import { unwrap } from "@/lib/action-result";
import { PERCENTUAL_PADRAO, percentualDigitado, percentualValido, textoDoControle, type ControleDeVisita } from "@/lib/visit-control";

const CHAVE = "negocialar-controle-percentual";
function lerPercentual() {
  try { const n = Number(localStorage.getItem(CHAVE)); return percentualValido(n) ? n : PERCENTUAL_PADRAO; } catch { return PERCENTUAL_PADRAO; }
}
function guardarPercentual(n: number) {
  try { localStorage.setItem(CHAVE, String(n)); } catch { /* sem armazenamento: vale só agora */ }
}

function imprimir(c: ControleDeVisita) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); throw new Error("Não foi possível preparar a impressão neste navegador."); }
  doc.title = c.titulo;
  const style = doc.createElement("style");
  style.textContent = "@page{margin:18mm}body{font:12.5px/1.55 Arial,Helvetica,sans-serif;color:#000;margin:0}"
    + "h1{font-size:15px;text-align:center;margin:0 0 18px}p{margin:0 0 10px;text-align:justify}"
    + "table{width:100%;border-collapse:collapse;margin:16px 0 20px;table-layout:fixed}th:nth-child(1){width:50%}th:nth-child(2){width:32%}th{font-size:11px;text-align:left;border-bottom:1px solid #000;padding:4px}"
    + "td{border-bottom:1px solid #999;padding:6px 4px;height:16px;vertical-align:bottom}.campo{margin:9px 0;display:flex;gap:6px}"
    + ".campo span:last-child{flex:1;border-bottom:1px solid #000;min-height:15px}.ass{margin-top:34px;border-top:1px solid #000;width:62%;padding-top:3px}"
    + ".local{margin-top:28px}.rodape{margin-top:26px;font-size:9px;color:#555}";
  doc.head.appendChild(style);
  const el = (tag: string, texto = "", pai: HTMLElement = doc.body, classe?: string) => {
    const e = doc.createElement(tag);
    e.textContent = texto;
    if (classe) e.className = classe;
    pai.appendChild(e);
    return e;
  };
  el("h1", c.titulo);
  for (const p of c.declaracao) el("p", p);
  const tabela = el("table");
  const cab = el("tr", "", el("thead", "", tabela));
  for (const t of ["IMÓVEL", "ENDEREÇO", "VALOR"]) el("th", t, cab);
  const corpo = el("tbody", "", tabela);
  for (const i of c.imoveis) { const tr = el("tr", "", corpo); el("td", i.imovel, tr); el("td", i.endereco, tr); el("td", i.valor, tr); }
  for (const campo of c.declarante) { const d = el("div", "", doc.body, "campo"); el("span", `${campo.rotulo}:`, d); el("span", campo.valor, d); }
  el("div", "Assinatura do declarante", doc.body, "ass");
  el("div", `Assinatura do corretor — ${c.corretor}`, doc.body, "ass");
  el("div", "Testemunha 1 (nome e CPF)", doc.body, "ass");
  el("div", "Testemunha 2 (nome e CPF)", doc.body, "ass");
  el("p", c.localEData, doc.body, "local");
  el("p", "Controle de visita gerado na NegociaLar a partir do registro de visita do corretor.", doc.body, "rodape");
  win.focus();
  win.print();
  // Depois de imprimir (ou cancelar) o iframe sai; o tempo cobre navegador que não avisa o fim da impressão.
  win.addEventListener("afterprint", () => iframe.remove());
  window.setTimeout(() => iframe.remove(), 120_000);
}

export default function VisitControlPrint({ dvpId }: { dvpId: string }) {
  const [aberto, setAberto] = useState(false);
  // Texto digitado ("2,5"): aceita vírgula ou ponto, com uma casa decimal (14/10/2026).
  const [digitado, setDigitado] = useState(String(PERCENTUAL_PADRAO));
  const percentual = percentualDigitado(digitado);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function gerar() {
    if (!percentualValido(percentual)) { setMensagem("Informe a comissão de 1 a 20%, com até uma casa decimal (ex.: 2,5 ou 3)."); return; }
    setOcupado(true); setMensagem("");
    try {
      const dados = unwrap(await getVisitControl(dvpId));
      guardarPercentual(percentual);
      imprimir(textoDoControle(dados, percentual));
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Não foi possível gerar o controle de visita.");
    } finally { setOcupado(false); }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => { setDigitado(String(lerPercentual()).replace(".", ",")); setAberto(true); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
        <Printer className="h-3.5 w-3.5" />Controle de visita para o cliente assinar
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-slate-700 p-3">
      <p className="text-[11px] text-slate-400">Sai preenchido com você, seu CRECI, o imóvel (bairro, cidade e código — o endereço protegido não sai), o nome do cliente e a data da visita. O cliente completa CPF, endereços e assina no papel.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-slate-300">Comissão se comprar por fora (%)
          <input type="text" inputMode="decimal" value={digitado} onChange={(e) => { setDigitado(e.target.value); setMensagem(""); }} placeholder="Ex.: 2,5"
            className="mt-1 block w-24 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-sm text-white" />
        </label>
        <button type="button" disabled={ocupado} onClick={() => void gerar()} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
          {ocupado ? "Preparando…" : "Imprimir / salvar PDF"}
        </button>
        <button type="button" onClick={() => { setAberto(false); setMensagem(""); }} className="px-2 py-2 text-[11px] text-slate-400">Fechar</button>
      </div>
      {mensagem && <p role="status" className="text-[11px] text-amber-300">{mensagem}</p>}
    </div>
  );
}
