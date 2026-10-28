"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";
import BotaoFechar from "./BotaoFechar";
import { requestSubscriptionRenewal } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { isPlanId, planCharge, type BillingCycle } from "@/lib/plans";
import { billingPopupSlot, type BillingNotice } from "@/lib/subscription";

// Pop-up da cobrança (como no ModernaDental): o mesmo aviso do sino, na frente da tela, porque o sino sozinho
// não é visto. Aviso 1× por dia; vencido de manhã e à tarde. A "vez" fechada fica no navegador (conveniência).
const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const storageKey = (userId: string) => `negocialar-aviso-cobranca:${userId}`;

export default function BillingPopup({ userId, notice, pendingPix, now, plan, priceTable, hasPaid, billingCycle, onRegistered, onOpenSubscription, onMessage }: {
  userId: string; notice: BillingNotice; pendingPix: boolean; now: Date; plan: string; priceTable?: string; hasPaid: boolean; billingCycle: string;
  onRegistered: () => void; onOpenSubscription: () => void; onMessage: (text: string) => void;
}) {
  const slot = billingPopupSlot(notice, pendingPix, now);
  const [closedSlot, setClosedSlot] = useState<string | null | undefined>(undefined);
  const [cycle, setCycle] = useState<BillingCycle>(billingCycle === "annual" ? "annual" : "monthly");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(storageKey(userId)); } catch { /* sem armazenamento: mostra nesta visita */ }
      setClosedSlot(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, [userId]);

  const open = !!slot && closedSlot !== undefined && closedSlot !== slot;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") remindLater(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!open || !slot) return null;

  function remindLater() {
    try { window.localStorage.setItem(storageKey(userId), slot!); } catch { /* vale só nesta visita */ }
    setClosedSlot(slot);
  }
  // "Pagar via Pix" e "Já paguei" registram a cobrança: a equipe vê o Pix para conferir no extrato.
  async function register(openPanel: boolean) {
    setBusy(true);
    try {
      unwrap(await requestSubscriptionRenewal(hasPaid ? undefined : cycle));
      onRegistered();
      remindLater();
      if (openPanel) onOpenSubscription();
      else onMessage("Avisamos a equipe: o Pix é conferido no extrato e o acesso é liberado em seguida.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Não foi possível registrar agora.");
    } finally { setBusy(false); }
  }

  const expired = notice.tone === "vencido";
  const choose = !hasPaid && isPlanId(plan);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="billing-popup-title">
    <section className={`w-full max-w-md space-y-4 rounded-2xl border-2 bg-slate-900 p-6 shadow-2xl ${expired ? "border-red-500/60" : "border-amber-500/60"}`}>
      <div className="flex items-start gap-3">
        <BotaoFechar onClick={remindLater} rotulo="Fechar e lembrar depois" className="order-last ml-auto" />
        <span className={`rounded-xl p-2 ${expired ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{expired ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <CreditCard className="h-5 w-5" aria-hidden="true" />}</span>
        <div>
          <h2 id="billing-popup-title" className="text-lg font-bold text-white">{notice.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{notice.message}</p>
        </div>
      </div>
      {choose && isPlanId(plan) && <fieldset className="space-y-2 text-sm">
        <legend className="text-xs font-bold text-slate-300">Como você quer pagar? Depois do primeiro pagamento, a cobrança segue o mesmo ciclo.</legend>
        {(["monthly", "annual"] as const).map((option) => <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${cycle === option ? "border-amber-500" : "border-slate-700"}`}>
          <input type="radio" name="billing-popup-cycle" value={option} checked={cycle === option} onChange={() => setCycle(option)} />
          <span className="text-slate-200">{option === "annual" ? `Anual: ${money(planCharge(plan, "annual", priceTable))} (paga 11 meses e usa 12)` : `Mensal: ${money(planCharge(plan, "monthly", priceTable))} por mês`}</span>
        </label>)}
      </fieldset>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" disabled={busy} onClick={() => void register(true)} className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "Aguarde…" : "Pagar via Pix"}</button>
        <button type="button" disabled={busy} onClick={() => void register(false)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Já paguei</button>
        <button type="button" disabled={busy} onClick={remindLater} className="rounded-lg px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 sm:mr-auto">Lembrar depois</button>
      </div>
    </section>
  </div>;
}
