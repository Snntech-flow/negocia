"use client";

import { useState } from "react";
import { Ban, Check, CheckCircle2, CreditCard, DollarSign, ExternalLink, Gift, MessageSquarePlus, RotateCcw, Search, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { confirmPixSubscriptionPayment, exemptUserFromBilling, refundPixSubscriptionPayment, setAdminViewAccess, updatePilotFeedbackStatus, updateUserStatus } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { askConfirm, askText } from "@/lib/dialogs";
import { creciConsultaUrl, creciDigits } from "@/lib/creci-consulta";
import { hasSubscriptionAccess } from "@/lib/subscription";
import { planName } from "@/lib/plans";
import type { WorkspaceFeedback, WorkspaceTransaction, WorkspaceUser } from "@/lib/workspace-types";
import Avatar from "./Avatar";
import { MonthlyChart, monthShort, type MonthRow } from "./FinanceCharts";
import RepassesDosSocios from "./RepassesDosSocios";
import { addMonthsKeepingDay, brasiliaToday } from "@/lib/finance";
import { descricaoDoVencimento, diaDeBrasilia, faturamentoPorAno, faturamentoPorMes } from "@/lib/admin-receita";

const money = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const when = (value: Date | string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
const TRANSACTION_LABELS: Record<string, string> = { pago: "Confirmado", pendente: "Pendente", estornado: "Estornado" };
const VERIFICATION_LABELS: Record<string, string> = { aprovado: "Aprovado", pendente: "Aguardando CRECI", suspenso: "Suspenso" };

// somenteLeitura (15/10/2026): visualização da Administração — vê tudo, sem nenhum botão de ação (o servidor também
// recusa: as ações exigem role = 'admin').
export default function AdminPanel({ users, transactions, feedback, currentUserId, somenteLeitura = false, onUsersChange, onTransactionsChange, onFeedbackChange, onMessage }: {
  users: WorkspaceUser[]; transactions: WorkspaceTransaction[]; feedback: WorkspaceFeedback[]; currentUserId: string; somenteLeitura?: boolean;
  onUsersChange: (update: (users: WorkspaceUser[]) => WorkspaceUser[]) => void;
  onTransactionsChange: (update: (items: WorkspaceTransaction[]) => WorkspaceTransaction[]) => void;
  onFeedbackChange: (update: (items: WorkspaceFeedback[]) => WorkspaceFeedback[]) => void;
  onMessage: (text: string) => void;
}) {
  const [search, setSearch] = useState("");
  // Faturamento da plataforma (15/10/2026): faturado (Pix confirmado) × a receber (mensalidades pelo vencimento).
  const hoje = brasiliaToday();
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = Number(mesAtual.slice(0, 4));
  const [modo, setModo] = useState<"mes" | "ano">("mes");
  const [deMes, setDeMes] = useState(addMonthsKeepingDay(`${mesAtual}-01`, -5).slice(0, 7));
  const [ateMes, setAteMes] = useState(addMonthsKeepingDay(`${mesAtual}-01`, 6).slice(0, 7));
  const [inicio, fim] = deMes <= ateMes ? [deMes, ateMes] : [ateMes, deMes];
  const primeiroAno = Math.min(anoAtual, ...transactions.map((item) => Number(diaDeBrasilia(item.confirmedAt ?? item.createdAt).slice(0, 4))));
  const faixas = modo === "mes" ? faturamentoPorMes(users, transactions, inicio, fim) : faturamentoPorAno(users, transactions, primeiroAno, anoAtual + 1);
  const linhas: MonthRow[] = faixas.map((faixa) => ({ month: faixa.chave, receita: faixa.pago, despesa: faixa.aReceber, receitaRealizada: 0, despesaRealizada: 0 }));
  const totalFaturado = faixas.reduce((total, faixa) => total + faixa.pago, 0);
  const totalAReceber = faixas.reduce((total, faixa) => total + faixa.aReceber, 0);
  const centavosEmReais = (cents: number) => money(cents / 100);
  // Repasses dos sócios usam os meses do período (por ano, os 12 meses de cada ano — o % pode mudar no meio do ano).
  const faixasDoRepasse = modo === "mes" ? faixas : faturamentoPorMes(users, transactions, `${primeiroAno}-01`, `${anoAtual + 1}-12`);
  const [busy, setBusy] = useState<string | null>(null);
  const nameOf = (id: string | null) => users.find((user) => user.id === id)?.name || "equipe";
  // Recorrência: só quem paga (conta sem cobrança e mensalidade zero não entram).
  const active = users.filter((user) => hasSubscriptionAccess(user.subscriptionStatus, user.nextBillingDate ? new Date(user.nextBillingDate) : null) && user.subscriptionStatus === "ativo" && !user.billingExemptAt && Number(user.monthlyFee) > 0);
  const exemptIds = new Set(users.filter((user) => user.billingExemptAt).map((user) => user.id));
  const confirmedRevenue = transactions.filter((item) => item.status === "pago").reduce((total, item) => total + Number(item.amount), 0);
  const pendingPix = transactions.filter((item) => item.status === "pendente" && item.paymentMethod === "pix").length;
  const query = search.toLocaleLowerCase("pt-BR");
  const filtered = users.filter((user) => [user.name, user.creci, user.city, user.email].some((value) => value.toLocaleLowerCase("pt-BR").includes(query)));

  async function run<T>(key: string, work: () => Promise<T>, success: string) {
    setBusy(key);
    try { const result = await work(); onMessage(success); return result; }
    catch (error) { onMessage(error instanceof Error ? error.message : "Não foi possível concluir."); return null; }
    finally { setBusy(null); }
  }

  async function moderate(user: WorkspaceUser, status: "aprovado" | "suspenso") {
    if (status === "suspenso" && !(await askConfirm({ title: `Suspender ${user.name}?`, message: "A pessoa perde o acesso na hora.", confirmLabel: "Suspender", danger: true }))) return;
    const result = await run(`user:${user.id}`, async () => unwrap(await updateUserStatus(user.id, status)), status === "aprovado" ? `CRECI de ${user.name} aprovado.` : `${user.name} foi suspenso.`);
    if (result) onUsersChange((items) => items.map((item) => item.id === user.id ? { ...item, verificationStatus: status, isVerified: status === "aprovado", verificationReviewedBy: result.reviewedBy, verificationReviewedAt: new Date(result.reviewedAt) } : item));
  }
  async function exempt(user: WorkspaceUser) {
    if (!(await askConfirm({ title: `Isentar ${user.name} de cobrança?`, message: "A conta fica ativa, sem vencimento e sem mensalidade. Esta tela não volta a cobrar depois.", confirmLabel: "Isentar" }))) return;
    const result = await run(`user:${user.id}`, async () => unwrap(await exemptUserFromBilling(user.id)), `${user.name} agora não tem cobrança.`);
    if (result) onUsersChange((items) => items.map((item) => item.id === user.id ? { ...item, subscriptionStatus: "ativo", nextBillingDate: null, monthlyFee: "0.00", billingExemptBy: result.exemptBy, billingExemptAt: new Date(result.exemptAt) } : item));
  }
  async function confirmPix(item: WorkspaceTransaction) {
    if (!(await askConfirm({ title: "Confirmar o recebimento?", message: `Você conferiu no extrato do banco o recebimento de ${money(item.amount)} de ${item.userName}?`, confirmLabel: "Conferi no extrato" }))) return;
    const result = await run(`tx:${item.id}`, async () => unwrap(await confirmPixSubscriptionPayment(item.id)), "Pix confirmado. A aprovação do CRECI continua separada.");
    if (result) {
      onTransactionsChange((items) => items.map((row) => row.id === item.id ? { ...row, status: "pago", confirmedAt: result.payment.confirmedAt, confirmedBy: currentUserId } : row));
      onUsersChange((items) => items.map((user) => user.id === item.userId ? { ...user, subscriptionStatus: "ativo" } : user));
    }
  }
  async function refund(item: WorkspaceTransaction) {
    const reason = await askText({ title: `Estornar ${money(item.amount)} de ${item.userName}?`, message: "O motivo fica no histórico e é enviado ao corretor.", label: "Motivo do estorno", minLength: 5, maxLength: 300, multiline: true, confirmLabel: "Estornar", danger: true });
    if (reason === null) return;
    const result = await run(`tx:${item.id}`, async () => unwrap(await refundPixSubscriptionPayment(item.id, reason)), "Pagamento estornado e acesso ajustado.");
    if (result) {
      onTransactionsChange((items) => items.map((row) => row.id === item.id ? { ...row, status: "estornado", refundedAt: new Date(), refundReason: reason.trim() } : row));
      onUsersChange((items) => items.map((user) => user.id === item.userId ? { ...user, subscriptionStatus: result.payment.subscriptionStatus, nextBillingDate: result.payment.nextBillingDate } : user));
    }
  }
  // Conferência do CRECI: abre a busca do conselho do estado e copia o número (as buscas pedem só os dígitos).
  async function copyCreci(user: WorkspaceUser) {
    const digits = creciDigits(user.creci);
    if (!digits) { onMessage(`Busque ${user.name} pelo nome ou CPF no site do CRECI-${user.state}.`); return; }
    try {
      await navigator.clipboard.writeText(digits);
      onMessage(`Número ${digits} copiado: cole na busca do CRECI-${user.state} e confira se aparece ${user.name}.`);
    } catch {
      onMessage(`Busque o número ${digits} no site do CRECI-${user.state} e confira se aparece ${user.name}.`);
    }
  }
  async function viewAccess(user: WorkspaceUser, ativo: boolean) {
    if (ativo && !(await askConfirm({ title: `Liberar a visualização da Administração para ${user.name}?`, message: "A pessoa passa a ver os corretores, os pagamentos e o feedback do piloto (com e-mail e WhatsApp). Não consegue aprovar, suspender, isentar nem estornar.", confirmLabel: "Liberar visualização" }))) return;
    const result = await run(`user:${user.id}`, async () => unwrap(await setAdminViewAccess(user.id, ativo)), ativo ? `${user.name} agora vê a Administração (só visualização).` : `${user.name} não vê mais a Administração.`);
    if (result) onUsersChange((items) => items.map((item) => item.id === user.id ? { ...item, adminViewAccess: result.adminViewAccess, adminViewAccessBy: result.adminViewAccessBy, adminViewAccessAt: result.adminViewAccessAt } : item));
  }
  async function feedbackStatus(item: WorkspaceFeedback, status: string) {
    const result = await run(`fb:${item.id}`, async () => unwrap(await updatePilotFeedbackStatus(item.id, status)), "Feedback atualizado.");
    if (result) onFeedbackChange((items) => items.map((row) => row.id === item.id ? { ...row, status: result.feedback.status } : row));
  }

  const card = "bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg";
  return <div className="space-y-8">
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1"><ShieldCheck className="w-4 h-4" /> Administração</div>
      <h1 className="text-2xl font-bold text-white">Corretores e pagamentos</h1>
      <p className="text-sm text-slate-400">{somenteLeitura ? "Corretores, pagamentos e feedback do piloto." : "Aprove CRECIs, confirme ou estorne Pix e acompanhe o feedback do piloto. O pagamento é conferido manualmente no banco."}</p>
    </div>
    {somenteLeitura && <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"><strong>Modo visualização.</strong> Você vê os corretores, os pagamentos e o feedback do piloto; aprovar, suspender, isentar, confirmar e estornar ficam com a administração.</p>}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Recorrência mensal (assinaturas ativas)</span><TrendingUp className="w-4 h-4 text-amber-400" /></div><div className="text-2xl font-black text-white mt-2">{money(active.reduce((total, user) => total + Number(user.monthlyFee || 0), 0))}</div><div className="text-[11px] text-slate-400 mt-1">{active.length} {active.length === 1 ? "assinatura ativa" : "assinaturas ativas"}</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Receita confirmada</span><DollarSign className="w-4 h-4 text-emerald-400" /></div><div className="text-2xl font-black text-emerald-400 mt-2">{money(confirmedRevenue)}</div><div className="text-[11px] text-slate-400 mt-1">Pix confirmados, sem estornos</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Corretores cadastrados</span><Users className="w-4 h-4 text-sky-400" /></div><div className="text-2xl font-black text-white mt-2">{users.length}</div><div className="text-[11px] text-slate-400 mt-1">{users.filter((u) => u.verificationStatus === "aprovado").length} aprovados · {users.filter((u) => u.verificationStatus === "pendente").length} aguardando · {users.filter((u) => u.verificationStatus === "suspenso").length} suspensos</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Pix aguardando confirmação</span><CreditCard className="w-4 h-4 text-purple-400" /></div><div className="text-2xl font-black text-white mt-2">{pendingPix}</div><div className="text-[11px] text-slate-400 mt-1">Confira no extrato antes de confirmar</div></div>
    </div>

    <section className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4 p-6" aria-labelledby="faturamento-titulo">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4">
        <div><h3 id="faturamento-titulo" className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-500" />Faturamento da plataforma</h3>
          <p className="text-xs text-slate-400">Faturado: Pix confirmado, na data da confirmação. A receber: mensalidades pelo vencimento de cada corretor (mensal ou anual), inclusive as vencidas e não pagas; isentos e suspensos ficam fora.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <div role="group" aria-label="Agrupar por" className="flex rounded-lg border border-slate-700 p-0.5 text-xs font-semibold">
            {(["mes", "ano"] as const).map((opcao) => <button key={opcao} type="button" aria-pressed={modo === opcao} onClick={() => setModo(opcao)} className={`rounded-md px-3 py-1.5 ${modo === opcao ? "bg-[#083858] text-[#ffffff]" : "text-slate-300"}`}>{opcao === "mes" ? "Por mês" : "Por ano"}</button>)}
          </div>
          {modo === "mes" && <>
            <label className="text-[11px] text-slate-400">De<input type="month" value={deMes} onChange={(event) => event.target.value && setDeMes(event.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" /></label>
            <label className="text-[11px] text-slate-400">Até<input type="month" value={ateMes} onChange={(event) => event.target.value && setAteMes(event.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" /></label>
          </>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 p-4"><p className="text-xs text-slate-400">Faturado {modo === "mes" ? `de ${monthShort(inicio)} a ${monthShort(fim)}` : `de ${primeiroAno} a ${anoAtual + 1}`}</p><p className="mt-1 text-2xl font-black text-emerald-400">{centavosEmReais(totalFaturado)}</p></div>
        <div className="rounded-xl border border-slate-800 p-4"><p className="text-xs text-slate-400">A receber {modo === "mes" ? `de ${monthShort(inicio)} a ${monthShort(fim)}` : `de ${primeiroAno} a ${anoAtual + 1}`}</p><p className="mt-1 text-2xl font-black text-white">{centavosEmReais(totalAReceber)}</p></div>
      </div>
      <MonthlyChart rows={linhas} from={modo === "mes" ? inicio : String(primeiroAno)} to={modo === "mes" ? fim : String(anoAtual + 1)}
        xLabel={modo === "mes" ? monthShort : (chave) => chave}
        labels={{ titulo: modo === "mes" ? "Faturado × a receber por mês" : "Faturado × a receber por ano", periodo: modo === "mes" ? "Mês" : "Ano", a: "Faturado", b: "A receber",
          diferenca: null, realizadoA: null, realizadoB: null, vazio: "Nada faturado nem a receber de {de} a {ate}." }} />
    </section>

    <RepassesDosSocios faixasMensais={faixasDoRepasse} modo={modo} somenteLeitura={somenteLeitura} onMessage={onMessage} />

    <section className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" />Corretores</h3><p className="text-xs text-slate-400">Confira o CRECI no conselho antes de aprovar.</p></div>
        <label className="relative w-full sm:w-64"><span className="sr-only">Buscar corretor</span><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, CRECI, cidade ou e-mail" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white" /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800"><tr><th className="py-3 px-4">Corretor</th><th className="py-3 px-4">CRECI e cidade</th><th className="py-3 px-4">Plano</th><th className="py-3 px-4">Situação</th><th className="py-3 px-4 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filtered.map((user) => <tr key={user.id}>
              <td className="py-3.5 px-4"><div className="flex items-center gap-3"><Avatar name={user.name} url={user.avatarUrl} size={36} /><div><div className="font-bold text-white flex items-center gap-1.5">{user.name}{user.adminViewAccess && <span className="rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900">vê a Administração</span>}{user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="CRECI aprovado" />}</div><div className="text-[11px] text-slate-400">{user.email}</div></div></div></td>
              <td className="py-3.5 px-4"><div className="font-semibold">CRECI {user.creci}</div><div className="text-[11px] text-slate-400">{user.city}/{user.state}</div>
                {creciConsultaUrl(user.state) && <a href={creciConsultaUrl(user.state)!} target="_blank" rel="noopener noreferrer" onClick={() => void copyCreci(user)} title={`Abre a busca do CRECI-${user.state} e copia o número`} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:underline"><ExternalLink className="h-3 w-3" aria-hidden="true" />Conferir no CRECI-{user.state}</a>}</td>
              <td className="py-3.5 px-4"><div className="font-semibold text-white">{planName(user.plan)}</div>{user.billingExemptAt
                ? <><div className="text-[11px] font-semibold text-emerald-400">Sem cobrança</div><div className="text-[10px] text-slate-500">por {nameOf(user.billingExemptBy)} em {when(user.billingExemptAt)}</div></>
                : <div className="text-[11px] text-slate-400">{money(user.monthlyFee)}/mês · {user.subscriptionStatus === "teste" ? "período grátis" : user.subscriptionStatus}</div>}
                {(() => { const vencimento = descricaoDoVencimento(user, hoje); return vencimento && <div className={`text-[11px] ${vencimento.vencido ? "font-semibold text-red-400" : "text-slate-400"}`}>{vencimento.texto}</div>; })()}</td>
              <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${user.verificationStatus === "aprovado" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : user.verificationStatus === "suspenso" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{VERIFICATION_LABELS[user.verificationStatus] || user.verificationStatus}</span>
                {user.verificationReviewedAt && <div className="mt-1 text-[10px] text-slate-500">por {nameOf(user.verificationReviewedBy)} em {when(user.verificationReviewedAt)}</div>}</td>
              <td className="py-3.5 px-4 text-right"><div className="flex items-center justify-end gap-2">
                {somenteLeitura ? <span className="text-[11px] text-slate-500">Só visualização</span> : <>
                {user.id !== currentUserId && user.verificationStatus !== "aprovado" && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void moderate(user, "aprovado")} className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Aprovar</button>}
                {!user.billingExemptAt && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void exempt(user)} className="border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Gift className="w-3.5 h-3.5" /> Isentar de cobrança</button>}
                {user.id !== currentUserId && user.verificationStatus !== "suspenso" && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void moderate(user, "suspenso")} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Suspender</button>}
                {user.id !== currentUserId && user.role !== "admin" && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void viewAccess(user, !user.adminViewAccess)} title="Visualização da Administração: vê os corretores, os pagamentos e o feedback, sem poder aprovar, suspender, isentar nem estornar" className="border border-slate-600 text-slate-300 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold">{user.adminViewAccess ? "Tirar visualização da Administração" : "Liberar visualização da Administração"}</button>}
              </>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {!filtered.length && <p className="py-6 text-center text-xs text-slate-400">Nenhum corretor encontrado.</p>}
      </div>
    </section>

    <section className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
      <div className="pb-4 border-b border-slate-800"><h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400" />Pagamentos via Pix</h3><p className="text-xs text-slate-400">Confirme só depois de ver o valor no extrato. O estorno desfaz o período e o bônus de indicação daquele pagamento.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800"><tr><th className="py-3 px-4">Cobrança</th><th className="py-3 px-4">Corretor</th><th className="py-3 px-4">Valor</th><th className="py-3 px-4">Situação</th></tr></thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {transactions.map((item) => <tr key={item.id}>
              <td className="py-3.5 px-4 font-medium text-white">{item.description}<div className="text-[10px] text-slate-500 font-normal">{when(item.createdAt)}</div></td>
              <td className="py-3.5 px-4"><div className="font-semibold text-slate-200">{item.userName}</div><div className="text-[11px] text-slate-400">CRECI {item.userCreci}</div></td>
              <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">{money(item.amount)}</td>
              <td className="py-3.5 px-4"><div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${item.status === "pago" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : item.status === "estornado" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{TRANSACTION_LABELS[item.status] || item.status}</span>
                {!somenteLeitura && item.status === "pendente" && item.paymentMethod === "pix" && item.type.startsWith("mensalidade_") && !exemptIds.has(item.userId) && <button type="button" disabled={busy === `tx:${item.id}`} onClick={() => void confirmPix(item)} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar recebimento</button>}
                {!somenteLeitura && item.status === "pago" && (item.confirmedAt || exemptIds.has(item.userId)) && <button type="button" disabled={busy === `tx:${item.id}`} onClick={() => void refund(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"><RotateCcw className="w-3 h-3" />Estornar</button>}
              </div>
                {item.confirmedAt && <div className="mt-1 text-[10px] text-slate-500">Confirmado por {nameOf(item.confirmedBy)} em {when(item.confirmedAt)}</div>}
                {item.refundedAt && <div className="text-[10px] text-slate-500">Estornado em {when(item.refundedAt)}{item.refundReason ? ` · ${item.refundReason}` : ""}</div>}
              </td>
            </tr>)}
          </tbody>
        </table>
        {!transactions.length && <p className="py-6 text-center text-xs text-slate-400">Nenhum pagamento registrado.</p>}
      </div>
    </section>

    <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><h3 className="text-lg font-bold text-white">Feedback do piloto ({feedback.length})</h3><p className="text-xs text-slate-400">Dúvidas, erros e sugestões enviados pelos corretores.</p></div><MessageSquarePlus className="h-5 w-5 text-amber-400" /></div>
      {feedback.length === 0 ? <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-400">Nenhum feedback recebido ainda.</p> : <div className="space-y-3">{feedback.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-white">{item.userName} · CRECI {item.userCreci}</p><p className="mt-1 text-[10px] text-slate-500">{item.screen} · {item.category === "erro" ? "Erro" : item.category === "ideia" ? "Ideia" : "Dúvida"} · {when(item.createdAt)}</p></div><select aria-label="Status do feedback" value={item.status} disabled={somenteLeitura || busy === `fb:${item.id}`} onChange={(event) => void feedbackStatus(item, event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-white"><option value="novo">Novo</option><option value="em_analise">Em análise</option><option value="concluido">Concluído</option></select></div><p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.message}</p></article>)}</div>}
    </section>
  </div>;
}
