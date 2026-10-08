"use client";
import { useEffect, useState } from "react";
import { getMySubscription, requestSubscriptionRenewal } from "@/lib/actions";
type Subscription = Awaited<ReturnType<typeof getMySubscription>>;
export default function SubscriptionPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Subscription | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [link, setLink] = useState("");
  useEffect(() => {
    let active = true;
    getMySubscription().then((value) => { if (active) { setData(value); setLink(`${window.location.origin}/?ref=${encodeURIComponent(value.user.id)}`); } }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Não foi possível consultar a assinatura."); });
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const expiry = data?.user.expiresAt ? new Date(data.user.expiresAt) : null;
  const days = expiry ? Math.max(0, Math.ceil((expiry.getTime() - clock) / 86400000)) : null;
  const pending = data?.payments.find((payment) => payment.status === "pendente" && payment.paymentMethod === "pix" && payment.type.startsWith("mensalidade_"));
  const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  async function renew() {
    setBusy(true); setMessage("");
    try { await requestSubscriptionRenewal(); setData(await getMySubscription()); setMessage("Solicitação criada. Pagamento via Pix. Confira o valor e o beneficiário antes de pagar."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível solicitar a renovação."); }
    finally { setBusy(false); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setMessage("Copiado!"); } catch { setMessage("Não foi possível copiar. Selecione e copie o texto exibido."); } }
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="subscription-title">
    <section className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
      <div className="flex items-center justify-between"><h2 id="subscription-title" className="text-lg font-bold text-white">Minha assinatura</h2><button onClick={onClose} aria-label="Fechar assinatura">✕</button></div>
      {!data && !message && <p>Consultando sua assinatura…</p>}
      {data && <>
        <div className="rounded-xl bg-slate-800 p-4 text-sm"><p className="font-bold">Plano {data.user.plan} anúncios · {data.user.billingCycle === "annual" ? "Anual" : "Mensal"}</p><p className="mt-2">{data.user.status === "teste" ? "Período gratuito" : data.user.status === "ativo" ? "Assinatura" : "Renovação pendente"}{days !== null ? ` · ${days} dias restantes` : ""}</p>{expiry && <p className="mt-1 text-xs text-slate-400">Acesso até {expiry.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. {days === 0 ? "Renove para continuar usando a rede." : "Não há débito automático."}</p>}</div>
        <button disabled={busy || !!pending} onClick={() => void renew()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "Aguarde…" : pending ? "Pix aguardando confirmação" : "Solicitar renovação via Pix"}</button>
        {pending && <div className="space-y-2 rounded-xl border border-amber-500/40 p-4 text-sm"><p className="font-bold">Valor: {money(pending.amount)}</p><p>Pagamento via Pix. Confira o beneficiário no banco e informe o valor acima.</p><code className="block break-all text-xs">b993844f-33d9-4515-a0b4-b3b26b886cf3</code><button className="text-amber-300" onClick={() => void copy("b993844f-33d9-4515-a0b4-b3b26b886cf3")}>Copiar chave Pix</button></div>}
        <div className="space-y-2 border-t border-slate-700 pt-4 text-sm"><h3 className="font-bold text-white">Indique um corretor e ganhe 30 dias grátis</h3><p className="text-xs text-slate-400">Compartilhe o link ou seu código. O bônus é concedido uma única vez por indicado, após a confirmação do primeiro pagamento. Apenas o cadastro gratuito não gera bônus.</p><input readOnly aria-label="Link de indicação" value={link} className="w-full rounded-lg bg-slate-950 p-2 text-xs" /><button onClick={() => void copy(link)} className="text-amber-300">Copiar link</button><p className="break-all text-xs">Código: {data.user.id}</p></div>
        <div className="space-y-2 border-t border-slate-700 pt-4 text-xs"><h3 className="font-bold">Histórico de pagamentos</h3>{data.payments.length ? data.payments.map((payment) => <div key={payment.id} className="rounded-lg bg-slate-800 p-3"><p>{payment.description}</p><p className="mt-1">{money(payment.amount)} · {payment.status === "pago" ? "Confirmado" : payment.status === "pendente" ? "Aguardando confirmação" : payment.status}</p></div>) : <p>Você ainda não tem pagamentos.</p>}</div>
      </>}
      {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    </section>
  </div>;
}
