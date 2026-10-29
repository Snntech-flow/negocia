"use client";

// Corrigir a cidade e a UF do CRECI de uma conta, na Administração (28/10/2026, Sidney: "onde é São Paulo, Bahia?"). Abre na
// própria linha: UF, cidade com a lista de municípios da UF (IBGE) e Salvar. O servidor só aceita do administrador e confere
// a cidade na lista oficial (updateUserLocation).
import { useEffect, useState } from "react";
import { updateUserLocation } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { BRAZILIAN_STATES } from "@/lib/brazil-states";
import { loadStateCities } from "@/lib/cities";

export default function CorrigirCidadeUf({ user, onSalvo, onMessage }: {
  user: { id: string; name: string; city: string; state: string };
  onSalvo: (local: { city: string; state: string }) => void;
  onMessage: (text: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [uf, setUf] = useState(user.state);
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    void loadStateCities(uf).then((lista) => { if (!cancelado) setCidades(lista); });
    return () => { cancelado = true; };
  }, [aberto, uf]);

  async function salvar() {
    setOcupado(true); setErro("");
    try {
      const local = unwrap(await updateUserLocation(user.id, uf, cidade));
      onSalvo({ city: local.city, state: local.state });
      onMessage(`Cidade de ${user.name} corrigida para ${local.city}/${local.state}.`);
      setAberto(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível corrigir a cidade.");
    } finally { setOcupado(false); }
  }

  if (!aberto) {
    return <button type="button" onClick={() => { setUf(user.state); setCidade(""); setErro(""); setAberto(true); }}
      className="mt-1 block text-[11px] font-semibold text-sky-300 underline hover:no-underline">Corrigir cidade/UF</button>;
  }
  return <div className="mt-2 space-y-1.5 rounded-lg border border-slate-700 p-2">
    <div className="flex gap-1.5">
      <select aria-label={`UF do CRECI de ${user.name}`} value={uf} onChange={(event) => { setUf(event.target.value); setCidade(""); }}
        className="rounded-lg border border-slate-700 px-1.5 py-1 text-[11px]">
        {BRAZILIAN_STATES.map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
      </select>
      <input aria-label={`Cidade de ${user.name}`} list={`cidades-${user.id}`} value={cidade} maxLength={120} autoComplete="off"
        onChange={(event) => { setCidade(event.target.value); setErro(""); }} placeholder={`Cidade de ${uf}`}
        className="w-32 rounded-lg border border-slate-700 px-2 py-1 text-[11px]" />
      <datalist id={`cidades-${user.id}`}>{cidades.map((nome) => <option key={nome} value={nome} />)}</datalist>
    </div>
    {erro && <p role="alert" className="text-[11px] text-red-400">{erro}</p>}
    <div className="flex gap-2">
      <button type="button" disabled={ocupado || !cidade.trim()} onClick={() => void salvar()}
        className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 disabled:opacity-50">{ocupado ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={() => setAberto(false)} className="px-1.5 text-[11px] text-slate-400">Cancelar</button>
    </div>
  </div>;
}
