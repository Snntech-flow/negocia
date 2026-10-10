"use client";

import { useState } from "react";
import { Ban, Check, CheckCircle2, CreditCard, DollarSign, Gift, MessageSquarePlus, RotateCcw, Search, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { confirmPixSubscriptionPayment, exemptUserFromBilling, refundPixSubscriptionPayment, updatePilotFeedbackStatus, updateUserStatus } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { hasSubscriptionAccess } from "@/lib/subscription";
import { planName } from "@/lib/plans";
import type { WorkspaceFeedback, WorkspaceTransaction, WorkspaceUser } from "@/lib/workspace-types";
import Avatar from "./Avatar";

const money = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const when = (value: Date | string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
const TRANSACTION_LABELS: Record<string, string> = { pago: "Confirmado", pendente: "Pendente", estornado: "Estornado" };
const VERIFICATION_LABELS: Record<string, string> = { aprovado: "Aprovado", pendente: "Aguardando CRECI", suspenso: "Suspenso" };

export default function AdminPanel({ users, transactions, feedback, currentUserId, onUsersChange, onTransactionsChange, onFeedbackChange, onMessage }: {
  users: WorkspaceUser[]; transactions: WorkspaceTransaction[]; feedback: WorkspaceFeedback[]; currentUserId: string;
  onUsersChange: (update: (users: WorkspaceUser[]) => WorkspaceUser[]) => void;
  onTransactionsChange: (update: (items: WorkspaceTransaction[]) => WorkspaceTransaction[]) => void;
  onFeedbackChange: (update: (items: WorkspaceFeedback[]) => WorkspaceFeedback[]) => void;
  onMessage: (text: string) => void;
}) {
  const [search, setSearch] = useState("");
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
    if (status === "suspenso" && !window.confirm(`Suspender ${user.name}? A pessoa perde o acesso na hora.`)) return;
    const result = await run(`user:${user.id}`, async () => unwrap(await updateUserStatus(user.id, status)), status === "aprovado" ? `CRECI de ${user.name} aprovado.` : `${user.name} foi suspenso.`);
    if (result) onUsersChange((items) => items.map((item) => item.id === user.id ? { ...item, verificationStatus: status, isVerified: status === "aprovado", verificationReviewedBy: result.reviewedBy, verificationReviewedAt: new Date(result.reviewedAt) } : item));
  }
  async function exempt(user: WorkspaceUser) {
    if (!window.confirm(`Isentar ${user.name} de cobrança? A conta fica ativa, sem vencimento e sem mensalidade.`)) return;
    const result = await run(`user:${user.id}`, async () => unwrap(await exemptUserFromBilling(user.id)), `${user.name} agora não tem cobrança.`);
    if (result) onUsersChange((items) => items.map((item) => item.id === user.id ? { ...item, subscriptionStatus: "ativo", nextBillingDate: null, monthlyFee: "0.00", billingExemptBy: result.exemptBy, billingExemptAt: new Date(result.exemptAt) } : item));
  }
  async function confirmPix(item: WorkspaceTransaction) {
    if (!window.confirm(`Você conferiu no extrato do banco o recebimento de ${money(item.amount)} de ${item.userName}?`)) return;
    const result = await run(`tx:${item.id}`, async () => unwrap(await confirmPixSubscriptionPayment(item.id)), "Pix confirmado. A aprovação do CRECI continua separada.");
    if (result) {
      onTransactionsChange((items) => items.map((row) => row.id === item.id ? { ...row, status: "pago", confirmedAt: result.payment.confirmedAt, confirmedBy: currentUserId } : row));
      onUsersChange((items) => items.map((user) => user.id === item.userId ? { ...user, subscriptionStatus: "ativo" } : user));
    }
  }
  async function refund(item: WorkspaceTransaction) {
    const reason = window.prompt(`Estornar ${money(item.amount)} de ${item.userName}? Informe o motivo (fica no histórico e é enviado ao corretor):`, "");
    if (reason === null) return;
    const result = await run(`tx:${item.id}`, async () => unwrap(await refundPixSubscriptionPayment(item.id, reason)), "Pagamento estornado e acesso ajustado.");
    if (result) {
      onTransactionsChange((items) => items.map((row) => row.id === item.id ? { ...row, status: "estornado", refundedAt: new Date(), refundReason: reason.trim() } : row));
      onUsersChange((items) => items.map((user) => user.id === item.userId ? { ...user, subscriptionStatus: result.payment.subscriptionStatus, nextBillingDate: result.payment.nextBillingDate } : user));
    }
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
      <p className="text-sm text-slate-400">Aprove CRECIs, confirme ou estorne Pix e acompanhe o feedback do piloto. O pagamento é conferido manualmente no banco.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Recorrência mensal (assinaturas ativas)</span><TrendingUp className="w-4 h-4 text-amber-400" /></div><div className="text-2xl font-black text-white mt-2">{money(active.reduce((total, user) => total + Number(user.monthlyFee || 0), 0))}</div><div className="text-[11px] text-slate-400 mt-1">{active.length} {active.length === 1 ? "assinatura ativa" : "assinaturas ativas"}</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Receita confirmada</span><DollarSign className="w-4 h-4 text-emerald-400" /></div><div className="text-2xl font-black text-emerald-400 mt-2">{money(confirmedRevenue)}</div><div className="text-[11px] text-slate-400 mt-1">Pix confirmados, sem estornos</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Corretores cadastrados</span><Users className="w-4 h-4 text-sky-400" /></div><div className="text-2xl font-black text-white mt-2">{users.length}</div><div className="text-[11px] text-slate-400 mt-1">{users.filter((u) => u.verificationStatus === "aprovado").length} aprovados · {users.filter((u) => u.verificationStatus === "pendente").length} aguardando · {users.filter((u) => u.verificationStatus === "suspenso").length} suspensos</div></div>
      <div className={card}><div className="flex items-center justify-between text-xs text-slate-400"><span>Pix aguardando confirmação</span><CreditCard className="w-4 h-4 text-purple-400" /></div><div className="text-2xl font-black text-white mt-2">{pendingPix}</div><div className="text-[11px] text-slate-400 mt-1">Confira no extrato antes de confirmar</div></div>
    </div>

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
              <td className="py-3.5 px-4"><div className="flex items-center gap-3"><Avatar name={user.name} url={user.avatarUrl} size={36} /><div><div className="font-bold text-white flex items-center gap-1.5">{user.name}{user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="CRECI aprovado" />}</div><div className="text-[11px] text-slate-400">{user.email}</div></div></div></td>
              <td className="py-3.5 px-4"><div className="font-semibold">CRECI {user.creci}</div><div className="text-[11px] text-slate-400">{user.city}/{user.state}</div></td>
              <td className="py-3.5 px-4"><div className="font-semibold text-white">{planName(user.plan)}</div>{user.billingExemptAt
                ? <><div className="text-[11px] font-semibold text-emerald-400">Sem cobrança</div><div className="text-[10px] text-slate-500">por {nameOf(user.billingExemptBy)} em {when(user.billingExemptAt)}</div></>
                : <div className="text-[11px] text-slate-400">{money(user.monthlyFee)}/mês · {user.subscriptionStatus === "teste" ? "período grátis" : user.subscriptionStatus}</div>}</td>
              <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${user.verificationStatus === "aprovado" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : user.verificationStatus === "suspenso" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{VERIFICATION_LABELS[user.verificationStatus] || user.verificationStatus}</span>
                {user.verificationReviewedAt && <div className="mt-1 text-[10px] text-slate-500">por {nameOf(user.verificationReviewedBy)} em {when(user.verificationReviewedAt)}</div>}</td>
              <td className="py-3.5 px-4 text-right"><div className="flex items-center justify-end gap-2">
                {user.id !== currentUserId && user.verificationStatus !== "aprovado" && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void moderate(user, "aprovado")} className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Aprovar</button>}
                {!user.billingExemptAt && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void exempt(user)} className="border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Gift className="w-3.5 h-3.5" /> Isentar de cobrança</button>}
                {user.id !== currentUserId && user.verificationStatus !== "suspenso" && <button type="button" disabled={busy === `user:${user.id}`} onClick={() => void moderate(user, "suspenso")} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Suspender</button>}
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
                {item.status === "pendente" && item.paymentMethod === "pix" && item.type.startsWith("mensalidade_") && !exemptIds.has(item.userId) && <button type="button" disabled={busy === `tx:${item.id}`} onClick={() => void confirmPix(item)} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar recebimento</button>}
                {item.status === "pago" && (item.confirmedAt || exemptIds.has(item.userId)) && <button type="button" disabled={busy === `tx:${item.id}`} onClick={() => void refund(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"><RotateCcw className="w-3 h-3" />Estornar</button>}
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
      {feedback.length === 0 ? <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-400">Nenhum feedback recebido ainda.</p> : <div className="space-y-3">{feedback.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-white">{item.userName} · CRECI {item.userCreci}</p><p className="mt-1 text-[10px] text-slate-500">{item.screen} · {item.category === "erro" ? "Erro" : item.category === "ideia" ? "Ideia" : "Dúvida"} · {when(item.createdAt)}</p></div><select aria-label="Status do feedback" value={item.status} disabled={busy === `fb:${item.id}`} onChange={(event) => void feedbackStatus(item, event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-white"><option value="novo">Novo</option><option value="em_analise">Em análise</option><option value="concluido">Concluído</option></select></div><p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.message}</p></article>)}</div>}
    </section>
  </div>;
}
