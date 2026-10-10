"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";
import { createFinanceEntry, deleteFinanceEntry, getFinancePeriod, setFinanceEntryPaid, updateFinanceEntry } from "@/lib/actions/finance";
import { unwrap, type ActionData } from "@/lib/action-result";
import {
  addMonthsKeepingDay, categoryTotals, chartStart, FINANCE_CATEGORIES, FINANCE_PRESETS, financeCategoryLabel, financeStatus, MAX_REPEAT_MONTHS,
  monthsBetween, percentChange, presetPeriod, shiftMonth, summarizeFinance, toCents, type FinanceKind, type FinancePreset, type FinanceStatus,
} from "@/lib/finance";
import { brl, CategoryBars, MonthlyChart, monthShort, type MonthRow } from "./FinanceCharts";

type PeriodData = ActionData<Awaited<ReturnType<typeof getFinancePeriod>>>;
type Entry = PeriodData["entries"][number];
type FormState = { kind: FinanceKind; description: string; category: string; amount: string; dueDate: string; paid: boolean; paidAt: string; leadId: string; notes: string; repeatMonths: number };
type Period = { from: string; to: string; preset: FinancePreset | "personalizado" };

const dateBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const monthLong = (month: string) => {
  const label = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const periodLabel = (from: string, to: string) => from === to ? monthLong(from) : `${monthShort(from)} a ${monthShort(to)}`;
const STATUS: Record<FinanceStatus, { label: string; className: string }> = {
  recebido: { label: "Recebido", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  pago: { label: "Pago", className: "bg-slate-100 text-slate-700 border-slate-300" },
  a_receber: { label: "A receber", className: "bg-sky-50 text-sky-800 border-sky-200" },
  a_pagar: { label: "A pagar", className: "bg-amber-50 text-amber-800 border-amber-200" },
  vencido: { label: "Vencido", className: "bg-red-50 text-red-800 border-red-200" },
};
const input = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";

function emptyForm(kind: FinanceKind, date: string): FormState {
  return { kind, description: "", category: FINANCE_CATEGORIES[kind][0].id, amount: "", dueDate: date, paid: false, paidAt: date, leadId: "", notes: "", repeatMonths: 1 };
}

// Variação contra o período anterior; a cor diz se a mudança é boa (receita e saldo sobem = bom; despesa sobe = ruim).
function Delta({ current, previous, upIsGood }: { current: number; previous: number; upIsGood: boolean }) {
  const change = percentChange(current, previous);
  if (change === null) return <p className="mt-1 text-[11px] text-slate-400">Sem valor no período anterior</p>;
  const good = change === 0 ? null : (change > 0) === upIsGood;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${good === null ? "text-slate-400" : good ? "text-emerald-700" : "text-red-700"}`}>
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />{change > 0 ? "+" : ""}{change}% <span className="font-normal text-slate-400">vs período anterior</span>
  </p>;
}

export default function BrokerFinance({ blockedReason, onMessage }: { blockedReason: string | null; onMessage: (text: string) => void }) {
  const [period, setPeriod] = useState<Period | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | FinanceKind>("todos");
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setError(""); setLoading(true);
      try {
        const result = unwrap(await getFinancePeriod(period ? { from: period.from, to: period.to } : {}));
        if (!cancelled) { setData(result); if (!period) setPeriod({ from: result.from, to: result.to, preset: "mes" }); }
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : "Não foi possível carregar o financeiro."); }
      finally { if (!cancelled) setLoading(false); }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [period, reloadKey]);

  const today = data?.today ?? "";
  const from = period?.from ?? data?.from ?? "";
  const to = period?.to ?? data?.to ?? "";
  const summary = data ? summarizeFinance(data.entries, today) : null;
  const previousTotal = (kind: FinanceKind) => toCents(data?.previous.totals.find((row) => row.kind === kind)?.total ?? "0");
  const visible = (data?.entries ?? []).filter((entry) => filter === "todos" || entry.kind === filter);
  const overdue = (kind: FinanceKind) => data?.overdue.find((row) => row.kind === kind);
  const rows: MonthRow[] = data ? monthsBetween(chartStart(data.from, data.to), data.to).map((month) => {
    const pick = (kind: string) => data.monthly.find((row) => row.month === month && row.kind === kind);
    return { month, receita: toCents(pick("receita")?.total ?? "0"), despesa: toCents(pick("despesa")?.total ?? "0"),
      receitaRealizada: toCents(pick("receita")?.realized ?? "0"), despesaRealizada: toCents(pick("despesa")?.realized ?? "0") };
  }) : [];
  const multiMonth = from !== to;
  const length = from && to ? monthsBetween(from, to).length : 1;

  function choosePreset(preset: FinancePreset) { if (today) setPeriod({ ...presetPeriod(preset, today), preset }); }
  function shift(direction: -1 | 1) { if (from && to) setPeriod({ from: shiftMonth(from, direction * length), to: shiftMonth(to, direction * length), preset: "personalizado" }); }
  function setCustom(field: "from" | "to", value: string) {
    if (!/^\d{4}-\d{2}$/.test(value) || !period) return;
    const next = { ...period, [field]: value, preset: "personalizado" as const };
    if (next.from > next.to) { if (field === "from") next.to = next.from; else next.from = next.to; }
    setPeriod(next);
  }

  async function run(key: string, work: () => Promise<unknown>, success: string) {
    setBusy(key);
    try { await work(); onMessage(success); setReloadKey((value) => value + 1); return true; }
    catch (failure) { onMessage(failure instanceof Error ? failure.message : "Não foi possível concluir."); return false; }
    finally { setBusy(null); }
  }
  function startNew(kind: FinanceKind) {
    setEditingId(null);
    // Nasce dentro do período na tela: hoje, se hoje estiver nele; senão, o dia 1 do último mês.
    setForm(emptyForm(kind, today.slice(0, 7) >= from && today.slice(0, 7) <= to ? today : `${to}-01`));
  }
  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({ kind: entry.kind as FinanceKind, description: entry.description, category: entry.category, amount: entry.amount, dueDate: entry.dueDate,
      paid: !!entry.paidAt, paidAt: entry.paidAt ?? today, leadId: entry.leadId ?? "", notes: entry.notes ?? "", repeatMonths: 1 });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const payload = { kind: form.kind, description: form.description, category: form.category, amount: form.amount, dueDate: form.dueDate,
      paidAt: form.paid ? form.paidAt : null, leadId: form.leadId || null, notes: form.notes || null, repeatMonths: form.repeatMonths };
    const ok = await run("form", async () => unwrap(editingId ? await updateFinanceEntry(editingId, payload) : await createFinanceEntry(payload)),
      editingId ? "Lançamento atualizado." : form.repeatMonths > 1 ? `${form.repeatMonths} lançamentos criados, um por mês.` : "Lançamento criado.");
    if (ok) { setForm(null); setEditingId(null); }
  }
  async function togglePaid(entry: Entry) {
    const paidAt = entry.paidAt ? null : today;
    await run(`paid:${entry.id}`, async () => unwrap(await setFinanceEntryPaid(entry.id, paidAt)),
      paidAt ? (entry.kind === "receita" ? "Marcado como recebido hoje." : "Marcado como pago hoje.") : "Lançamento reaberto.");
  }
  async function remove(entry: Entry) {
    if (!window.confirm(`Excluir "${entry.description}"? Não dá para desfazer.`)) return;
    await run(`del:${entry.id}`, async () => unwrap(await deleteFinanceEntry(entry.id)), "Lançamento excluído.");
  }

  const card = "bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm";
  const receitas = summary ? summary.received + summary.receivable : 0;
  const despesas = summary ? summary.paid + summary.payable : 0;
  return <div className="space-y-6">
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400"><Wallet className="h-4 w-4" aria-hidden="true" /> Financeiro</div>
      <h1 className="text-2xl font-bold text-white">Receitas e despesas</h1>
      <p className="text-sm text-slate-400">Controle o que entra e o que sai. Só você vê os seus lançamentos.</p>
    </div>

    {/* Filtro do período: uma linha acima de tudo; números, gráficos e lista seguem o mesmo período. */}
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período">
      {FINANCE_PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={period?.preset === preset.id} disabled={!today} onClick={() => choosePreset(preset.id)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${period?.preset === preset.id ? "bg-amber-500 text-slate-950" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{preset.label}</button>)}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <label className="flex items-center gap-1">De<input type="month" value={from} onChange={(event) => setCustom("from", event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" /></label>
        <label className="flex items-center gap-1">até<input type="month" value={to} onChange={(event) => setCustom("to", event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" /></label>
      </span>
      <span className="flex items-center gap-1">
        <button type="button" aria-label="Período anterior" disabled={!from} onClick={() => shift(-1)} className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-32 text-center text-sm font-bold text-white">{from ? periodLabel(from, to) : "…"}</span>
        <button type="button" aria-label="Próximo período" disabled={!from} onClick={() => shift(1)} className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
      </span>
    </div>

    {blockedReason && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{blockedReason} Seus lançamentos continuam visíveis.</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

    {/* Ao trocar o período, o que já estava na tela fica esmaecido até chegar o novo (sem piscar). */}
    <div className={`space-y-6 transition-opacity ${loading && data ? "opacity-50" : ""}`}>
      {summary && data && <div className="grid gap-3 sm:grid-cols-3">
        <div className={card}><p className="text-xs text-slate-400">Receitas</p><p className="mt-1 text-xl font-black text-white">{brl(receitas)}</p>
          <p className="text-[11px] text-slate-400">Recebido {brl(summary.received)} · a receber {brl(summary.receivable)}</p>
          <Delta current={receitas} previous={previousTotal("receita")} upIsGood /></div>
        <div className={card}><p className="text-xs text-slate-400">Despesas</p><p className="mt-1 text-xl font-black text-white">{brl(despesas)}</p>
          <p className="text-[11px] text-slate-400">Pago {brl(summary.paid)} · a pagar {brl(summary.payable)}</p>
          <Delta current={despesas} previous={previousTotal("despesa")} upIsGood={false} /></div>
        <div className={card}><p className="text-xs text-slate-400">Receitas − despesas</p><p className={`mt-1 text-xl font-black ${summary.forecast < 0 ? "text-red-700" : "text-white"}`}>{brl(summary.forecast)}</p>
          <p className="text-[11px] text-slate-400">Já realizado (recebido − pago) {brl(summary.balance)}</p>
          <Delta current={summary.forecast} previous={previousTotal("receita") - previousTotal("despesa")} upIsGood /></div>
      </div>}

      {(overdue("receita") || overdue("despesa")) && <div role="status" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Em aberto com data vencida (todos os meses):{overdue("receita") ? ` ${overdue("receita")!.count} a receber (${brl(toCents(overdue("receita")!.total))})` : ""}{overdue("receita") && overdue("despesa") ? " e" : ""}{overdue("despesa") ? ` ${overdue("despesa")!.count} a pagar (${brl(toCents(overdue("despesa")!.total))})` : ""}.</p>
      </div>}

      {data && <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} lg:col-span-3`}><MonthlyChart rows={rows} from={data.from} to={data.to} /></div>
        <div className={`${card} lg:col-span-3 grid gap-6 sm:grid-cols-2`}>
          <CategoryBars title="Receitas por categoria" items={categoryTotals(data.entries, "receita")} color="var(--fin-receita)" empty="Sem receitas no período." />
          <CategoryBars title="Despesas por categoria" items={categoryTotals(data.entries, "despesa")} color="var(--fin-despesa)" empty="Sem despesas no período." />
        </div>
      </div>}

      {!form && <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!data || !!blockedReason} onClick={() => startNew("receita")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Nova receita</button>
        <button type="button" disabled={!data || !!blockedReason} onClick={() => startNew("despesa")} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Nova despesa</button>
      </div>}

      {form && <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">{editingId ? "Editar lançamento" : form.kind === "receita" ? "Nova receita" : "Nova despesa"}</h2>
          <div className="flex rounded-lg border border-slate-700 p-0.5 text-xs font-bold" role="radiogroup" aria-label="Tipo">
            {(["receita", "despesa"] as const).map((kind) => <button key={kind} type="button" role="radio" aria-checked={form.kind === kind} onClick={() => setForm({ ...form, kind, category: FINANCE_CATEGORIES[kind][0].id })} className={`rounded-md px-3 py-1.5 ${form.kind === kind ? (kind === "receita" ? "bg-emerald-700 text-white" : "bg-red-600 text-white") : "text-slate-400"}`}>{kind === "receita" ? "Receita" : "Despesa"}</button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Descrição *<input required minLength={2} maxLength={160} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={form.kind === "receita" ? "Ex.: comissão da venda do apartamento" : "Ex.: anúncio no portal"} className={input} /></label>
          <label className="text-xs font-semibold text-slate-300">Categoria *<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={input}>{FINANCE_CATEGORIES[form.kind].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-300">Valor (R$) *<input required inputMode="decimal" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={input} /></label>
          <label className="text-xs font-semibold text-slate-300">{form.kind === "receita" ? "Data prevista para receber *" : "Vencimento *"}<input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className={input} /></label>
          <label className="text-xs font-semibold text-slate-300">Cliente (opcional)<select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })} className={input}><option value="">Sem cliente</option>{data?.clients.map((client) => <option key={client.id} value={client.id}>{client.fullName}</option>)}</select></label>
          {!editingId && <label className="text-xs font-semibold text-slate-300">Repetir todo mês<select value={form.repeatMonths} onChange={(event) => setForm({ ...form, repeatMonths: Number(event.target.value) })} className={input}>{Array.from({ length: MAX_REPEAT_MONTHS }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count === 1 ? "Não repetir" : `${count} meses`}</option>)}</select></label>}
          <div className="text-xs font-semibold text-slate-300">
            <label className="mt-5 flex items-center gap-2"><input type="checkbox" checked={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.checked })} />{form.kind === "receita" ? "Já recebi" : "Já paguei"}</label>
            {form.paid && <input type="date" required aria-label={form.kind === "receita" ? "Data em que recebeu" : "Data em que pagou"} value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} className={input} />}
          </div>
          <label className="text-xs font-semibold text-slate-300 sm:col-span-2 lg:col-span-4">Observações<textarea maxLength={1000} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={input} /></label>
        </div>
        {form.repeatMonths > 1 && <p className="text-xs text-slate-400">Cria {form.repeatMonths} lançamentos, um por mês, no mesmo dia ({dateBR(form.dueDate)} até {dateBR(addMonthsKeepingDay(form.dueDate, form.repeatMonths - 1))}). Só o primeiro pode nascer pago.</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy === "form"} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy === "form" ? "Salvando…" : "Salvar"}</button>
          <button type="button" onClick={() => { setForm(null); setEditingId(null); }} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
        </div>
      </form>}

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">Lançamentos · {from ? periodLabel(from, to) : "…"}</h2>
          <div className="flex gap-1 text-xs font-semibold">
            {(["todos", "receita", "despesa"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 ${filter === value ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}>{value === "todos" ? "Todos" : value === "receita" ? "Receitas" : "Despesas"}</button>)}
          </div>
        </div>
        {!data && !error && <p className="py-6 text-center text-sm text-slate-400">Carregando…</p>}
        {data && !visible.length && <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">Nenhum lançamento no período. Use “Nova receita” ou “Nova despesa”.</p>}
        <ul className="divide-y divide-slate-800">
          {visible.map((entry, index) => {
            const status = STATUS[financeStatus(entry, today)];
            const income = entry.kind === "receita";
            const newMonth = multiMonth && (index === 0 || visible[index - 1].dueDate.slice(0, 7) !== entry.dueDate.slice(0, 7));
            return <li key={entry.id}>
              {newMonth && <p className="pt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{monthLong(entry.dueDate.slice(0, 7))}</p>}
              <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{entry.description}</p>
                  <p className="text-xs text-slate-400">{dateBR(entry.dueDate)} · {financeCategoryLabel(entry.kind, entry.category)}{entry.leadName ? ` · ${entry.leadName}` : ""}{entry.paidAt ? ` · ${income ? "recebido" : "pago"} em ${dateBR(entry.paidAt)}` : ""}</p>
                  {entry.notes && <p className="mt-1 text-xs text-slate-400">{entry.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.className}`}>{status.label}</span>
                  <span className={`min-w-28 text-right font-bold ${income ? "text-emerald-700" : "text-red-700"}`}>{income ? "+" : "−"} {brl(toCents(entry.amount))}</span>
                  <button type="button" disabled={!!blockedReason || busy === `paid:${entry.id}`} onClick={() => void togglePaid(entry)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50">{entry.paidAt ? <><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reabrir</> : <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{income ? "Recebi" : "Paguei"}</>}</button>
                  <button type="button" aria-label={`Editar ${entry.description}`} title="Editar" disabled={!!blockedReason} onClick={() => startEdit(entry)} className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Excluir ${entry.description}`} title="Excluir" disabled={!!blockedReason || busy === `del:${entry.id}`} onClick={() => void remove(entry)} className="rounded-lg border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </li>;
          })}
        </ul>
        {/* Total do que está na lista (segue o filtro Todos/Receitas/Despesas). */}
        {visible.length > 0 && (() => {
          const income = visible.filter((entry) => entry.kind === "receita").reduce((total, entry) => total + toCents(entry.amount), 0);
          const expense = visible.filter((entry) => entry.kind === "despesa").reduce((total, entry) => total + toCents(entry.amount), 0);
          const result = income - expense;
          return <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t border-slate-700 pt-3 text-sm">
            <span className="text-slate-400">Receitas <strong className="text-emerald-700">{brl(income)}</strong></span>
            <span className="text-slate-400">− Despesas <strong className="text-red-700">{brl(expense)}</strong></span>
            <span className="text-slate-400">= Total <strong className={`text-base ${result < 0 ? "text-red-700" : "text-white"}`}>{brl(result)}</strong></span>
          </div>;
        })()}
      </section>
    </div>
  </div>;
}
