"use client";

import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { getRevenueSplits, saveRevenueSplit } from "@/lib/actions/revenue-split";
import { unwrap, type ActionData } from "@/lib/action-result";
import { askConfirm } from "@/lib/dialogs";
import { brasiliaToday } from "@/lib/finance";
import type { Faixa } from "@/lib/admin-receita";
import { problemaNasPartes, repassesPorAno, repassesPorMes, versaoDoMes, type TipoDaParte } from "@/lib/repasses";
import { monthShort } from "./FinanceCharts";
import BotaoFechar from "./BotaoFechar";

type Versao = ActionData<Awaited<ReturnType<typeof getRevenueSplits>>>[number];
type Linha = { name: string; kind: TipoDaParte; percent: string };

const MODELO: Linha[] = [{ name: "Sócio 1", kind: "socio", percent: "" }, { name: "Sócio 2", kind: "socio", percent: "" }, { name: "Sócio 3", kind: "socio", percent: "" }, { name: "Empresa", kind: "empresa", percent: "" }];
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (valor: string | number) => `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const somaDigitada = (linhas: readonly Linha[]) => linhas.reduce((total, linha) => total + Math.round(Number(linha.percent.replace(",", ".") || 0) * 100), 0) / 100;

// Repasses dos sócios (pedido do Sidney, 15/10/2026): % de cada sócio e da empresa sobre o faturamento das assinaturas.
// Cada mudança vale a partir de um mês; os meses anteriores ficam com o % da época (o banco garante). Só o administrador
// muda; quem tem a visualização da Administração só vê.
export default function RepassesDosSocios({ faixasMensais, modo, somenteLeitura, onMessage, versoesIniciais = null }: {
  faixasMensais: Faixa[]; modo: "mes" | "ano"; somenteLeitura: boolean; onMessage: (texto: string) => void;
  /** Regras já carregadas (renderização no servidor e testes); a tela busca de novo ao abrir. */
  versoesIniciais?: Versao[] | null;
}) {
  const mesAtual = brasiliaToday().slice(0, 7);
  const [versoes, setVersoes] = useState<Versao[] | null>(versoesIniciais);
  const [erro, setErro] = useState("");
  const [base, setBase] = useState<"pago" | "aReceber">("pago");
  const [editando, setEditando] = useState(false);
  const [mes, setMes] = useState(mesAtual);
  const [linhas, setLinhas] = useState<Linha[]>(MODELO);
  const [salvando, setSalvando] = useState(false);

  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let ativo = true;
    getRevenueSplits().then((resposta) => { if (ativo) { setVersoes(unwrap(resposta)); setErro(""); } })
      .catch((problema) => { if (ativo) setErro(problema instanceof Error ? problema.message : "Não foi possível carregar os repasses."); });
    return () => { ativo = false; };
  }, [recarga]);

  const vigente = versoes ? versaoDoMes(versoes, mesAtual) : null;
  const linhasDaTabela = versoes ? (modo === "mes" ? repassesPorMes(faixasMensais, versoes) : repassesPorAno(faixasMensais, versoes)) : [];
  const colunas = linhasDaTabela[0]?.partes ?? [];
  const problema = problemaNasPartes(linhas);
  // Mês passado só antes da primeira regra (o banco recusa o resto).
  const mesMinimo = versoes && versoes.length ? mesAtual : undefined;

  function abrirEdicao() {
    const atual = vigente ?? null;
    setLinhas(atual ? atual.shares.map((parte) => ({ name: parte.name, kind: parte.kind, percent: String(Number(parte.percent)).replace(".", ",") })) : MODELO);
    setMes(mesAtual);
    setEditando(true);
  }
  async function salvar() {
    if (problema || salvando) return;
    const resumo = linhas.map((linha) => `${linha.name.trim()} ${pct(linha.percent.replace(",", "."))}`).join(" · ");
    if (!(await askConfirm({ title: `Repasse a partir de ${monthShort(mes)}?`, message: `${resumo}. Os meses anteriores continuam com o % que valia na época.`, confirmLabel: "Gravar a regra" }))) return;
    setSalvando(true);
    try {
      unwrap(await saveRevenueSplit(mes, linhas.map((linha) => ({ name: linha.name, kind: linha.kind, percent: linha.percent }))));
      onMessage(`Repasse gravado a partir de ${monthShort(mes)}.`);
      setEditando(false);
      setRecarga((n) => n + 1);
    } catch (falha) { onMessage(falha instanceof Error ? falha.message : "Não foi possível gravar o repasse."); }
    finally { setSalvando(false); }
  }

  return <section className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4 p-6" aria-labelledby="repasses-titulo">
    <div className="flex flex-col gap-3 border-b border-slate-800 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="repasses-titulo" className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" />Repasses aos sócios</h3>
          <p className="text-xs text-slate-400">O % de cada sócio e da empresa sobre o faturamento das assinaturas. Cada mudança vale a partir do mês escolhido; os meses anteriores continuam com o % da época.</p></div>
        {!somenteLeitura && versoes && !editando && <button type="button" onClick={abrirEdicao} className="rounded-lg bg-[#083858] px-3 py-2 text-xs font-bold text-[#ffffff]">{vigente ? "Mudar os %" : "Definir os %"}</button>}
      </div>
      {vigente ? <p className="text-sm text-slate-300"><strong>Em vigor desde {monthShort(vigente.validFromMonth)}:</strong> {vigente.shares.map((parte) => `${parte.name} ${pct(parte.percent)}`).join(" · ")}</p>
        : versoes && <p className="text-sm text-slate-400">Nenhuma regra de repasse em vigor{versoes.length ? " neste mês" : " ainda"}.</p>}
    </div>

    {erro && <p role="alert" className="text-xs text-red-700">{erro}</p>}
    {!versoes && !erro && <p className="text-xs text-slate-400">Carregando os repasses…</p>}

    {editando && <div className="space-y-3 rounded-xl border border-slate-700 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-semibold text-slate-300">Vale a partir de<input type="month" value={mes} min={mesMinimo} onChange={(event) => event.target.value && setMes(event.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" /></label>
        <BotaoFechar onClick={() => setEditando(false)} rotulo="Fechar sem gravar" />
      </div>
      <div className="space-y-2">
        {linhas.map((linha, i) => <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
          <input aria-label={`Nome da linha ${i + 1}`} value={linha.name} maxLength={80} onChange={(event) => setLinhas(linhas.map((item, j) => j === i ? { ...item, name: event.target.value } : item))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" />
          <select aria-label={`Tipo da linha ${i + 1}`} value={linha.kind} onChange={(event) => setLinhas(linhas.map((item, j) => j === i ? { ...item, kind: event.target.value as TipoDaParte } : item))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"><option value="socio">Sócio</option><option value="empresa">Empresa</option></select>
          <label className="flex items-center gap-1 text-xs text-slate-300"><input aria-label={`% da linha ${i + 1}`} inputMode="decimal" value={linha.percent} placeholder="0" onChange={(event) => setLinhas(linhas.map((item, j) => j === i ? { ...item, percent: event.target.value } : item))} className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-xs text-white" />%</label>
          <button type="button" aria-label={`Tirar a linha ${i + 1}`} disabled={linhas.length <= 1} onClick={() => setLinhas(linhas.filter((_, j) => j !== i))} className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 disabled:opacity-30">Tirar</button>
        </div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={linhas.length >= 10} onClick={() => setLinhas([...linhas, { name: `Sócio ${linhas.length + 1}`, kind: "socio", percent: "" }])} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"><Plus className="h-3.5 w-3.5" />Adicionar participante</button>
        <p className={`text-xs font-semibold ${somaDigitada(linhas) === 100 ? "text-emerald-400" : "text-amber-400"}`}>Soma: {pct(somaDigitada(linhas))} {somaDigitada(linhas) === 100 ? "✓" : "(precisa dar 100%)"}</p>
      </div>
      {problema && <p className="text-xs text-slate-400">{problema}</p>}
      <button type="button" disabled={!!problema || salvando} onClick={() => void salvar()} className="rounded-lg bg-[#083858] px-4 py-2 text-xs font-bold text-[#ffffff] disabled:opacity-40">{salvando ? "Gravando…" : `Gravar a regra a partir de ${monthShort(mes)}`}</button>
    </div>}

    {versoes && colunas.length > 0 && <>
      <div role="group" aria-label="Base do repasse" className="flex w-fit rounded-lg border border-slate-700 p-0.5 text-xs font-semibold">
        {(["pago", "aReceber"] as const).map((opcao) => <button key={opcao} type="button" aria-pressed={base === opcao} onClick={() => setBase(opcao)} className={`rounded-md px-3 py-1.5 ${base === opcao ? "bg-[#083858] text-[#ffffff]" : "text-slate-300"}`}>{opcao === "pago" ? "Do faturado" : "Do a receber"}</button>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800"><tr>
            <th className="py-3 px-4">{modo === "mes" ? "Mês" : "Ano"}</th><th className="py-3 px-4 text-right">{base === "pago" ? "Faturado" : "A receber"}</th>
            {colunas.map((parte) => <th key={parte.name} className="py-3 px-4 text-right">{parte.name}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 [font-variant-numeric:tabular-nums]">
            {linhasDaTabela.map((linha) => {
              return <tr key={linha.chave}>
                <td className="py-2.5 px-4 font-semibold">{modo === "mes" ? monthShort(linha.chave) : linha.chave}{linha.semRegra && <span className="ml-1.5 text-[10px] font-normal text-slate-500">sem regra de repasse</span>}</td>
                <td className="py-2.5 px-4 text-right">{reais(linha.total[base])}</td>
                {linha.partes.map((parte) => <td key={parte.name} className="py-2.5 px-4 text-right">{linha.semRegra ? "—" : reais(parte[base])}</td>)}
              </tr>;
            })}
          </tbody>
          <tfoot className="border-t border-slate-700 font-bold text-white [font-variant-numeric:tabular-nums]"><tr>
            <td className="py-2.5 px-4">Total</td>
            <td className="py-2.5 px-4 text-right">{reais(linhasDaTabela.reduce((soma, linha) => soma + linha.total[base], 0))}</td>
            {colunas.map((parte, j) => <td key={parte.name} className="py-2.5 px-4 text-right">{reais(linhasDaTabela.reduce((soma, linha) => soma + linha.partes[j][base], 0))}</td>)}
          </tr></tfoot>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">Os centavos que não dividem certinho vão para quem tem a maior fração — a soma dos repasses fecha com o total.</p>
    </>}

    {versoes && versoes.length > 0 && <details className="text-xs text-slate-300">
      <summary className="cursor-pointer font-semibold">Histórico das regras ({versoes.length})</summary>
      <ul className="mt-2 space-y-1.5">{[...versoes].reverse().map((versao) => <li key={versao.id}>
        <strong>A partir de {monthShort(versao.validFromMonth)}:</strong> {versao.shares.map((parte) => `${parte.name} ${pct(parte.percent)}`).join(" · ")}
        <span className="text-slate-500"> — gravada por {versao.createdByName ?? "administração"} em {new Date(versao.createdAt).toLocaleDateString("pt-BR")}</span>
      </li>)}</ul>
    </details>}
  </section>;
}
