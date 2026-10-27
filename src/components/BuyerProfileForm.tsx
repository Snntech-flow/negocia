"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Radar } from "lucide-react";
import { createBuyerProfile } from "@/lib/actions";
import { unwrap, type ActionData } from "@/lib/action-result";
import { loadStateCities } from "@/lib/cities";
import { BRAZILIAN_STATES } from "@/lib/brazil-states";
import { PROPERTY_TYPES } from "@/lib/property-options";

export type CreatedProfile = ActionData<Awaited<ReturnType<typeof createBuyerProfile>>>["profile"];
const input = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";

// Procura de comprador com os critérios que o corretor informa; o Radar cruza com os imóveis de venda da rede.
export default function BuyerProfileForm({ brokerState, blockedReason, onCreated }: { brokerState: string; blockedReason: string | null; onCreated: (profile: CreatedProfile) => void }) {
  // UF da procura: escolhe de qual estado vêm as cidades (começa na do corretor). Antes era fixa na UF do corretor.
  const [uf, setUf] = useState(brokerState);
  const [cities, setCities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!uf) { setCities([]); return; }
    let cancelled = false;
    void loadStateCities(uf).then((list) => { if (!cancelled) setCities(list); });
    return () => { cancelled = true; };
  }, [uf]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blockedReason) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) || "").trim();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = unwrap(await createBuyerProfile({
        clientInternalName: text("clientInternalName"),
        propertyType: text("propertyType"),
        city: text("city"),
        neighborhoods: text("neighborhoods").split(",").map((value) => value.trim()).filter(Boolean),
        maxBudget: text("maxBudget"),
        minBedrooms: Number(text("minBedrooms") || 0),
        minParkingSpots: Number(text("minParkingSpots") || 0),
        notes: text("notes") || undefined,
      }));
      onCreated(result.profile);
      form.reset();
      setUf(brokerState);
      setMessage("Procura salva. Quando um imóvel de venda da rede atender aos critérios, você recebe um aviso no sino.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Não foi possível salvar a procura.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
    <div><h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider"><Radar className="w-4 h-4 text-amber-500" />Cadastrar procura de comprador</h3>
      <p className="mt-1 text-xs text-slate-400">Informe o que o cliente procura. O nome fica só com você; outros corretores veem os critérios como &ldquo;Cliente parceiro&rdquo;.</p></div>
    {blockedReason && <p role="note" className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{blockedReason}</p>}
    <fieldset disabled={busy || !!blockedReason} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Nome interno do cliente *<input name="clientInternalName" required maxLength={120} placeholder="Como você identifica o cliente" className={input} /></label>
      <label className="text-xs font-semibold text-slate-300">Tipo de imóvel *<select name="propertyType" required defaultValue="" className={input}><option value="" disabled>Escolha</option>{PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-300">Cidade *<div className="mt-1 flex gap-2"><select value={uf} onChange={(event) => setUf(event.target.value)} aria-label="Estado da cidade" className="w-20 shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white">{!uf && <option value="">UF</option>}{BRAZILIAN_STATES.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select><input name="city" required list="radar-city-options" autoComplete="off" maxLength={120} placeholder={!uf ? "Escolha a UF" : cities.length ? `Cidades de ${uf}` : "Digite a cidade"} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></div><datalist id="radar-city-options">{cities.map((city) => <option key={city} value={city} />)}</datalist></label>
      <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Bairros (separados por vírgula; vazio = qualquer)<input name="neighborhoods" maxLength={1000} placeholder="Ex: Centro, Jardim América" className={input} /></label>
      <label className="text-xs font-semibold text-slate-300">Orçamento máximo (R$) *<input name="maxBudget" required type="number" min="1" step="0.01" className={input} /></label>
      <label className="text-xs font-semibold text-slate-300">Quartos (mínimo)<input name="minBedrooms" type="number" min="0" max="100" defaultValue="0" className={input} /></label>
      <label className="text-xs font-semibold text-slate-300">Vagas (mínimo)<input name="minParkingSpots" type="number" min="0" max="100" defaultValue="0" className={input} /></label>
      <label className="text-xs font-semibold text-slate-300 sm:col-span-2 lg:col-span-3">Observações (só você vê)<input name="notes" maxLength={3000} className={input} /></label>
      <div className="flex items-end"><button className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{busy ? "Salvando…" : "Salvar procura"}</button></div>
    </fieldset>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
  </form>;
}
