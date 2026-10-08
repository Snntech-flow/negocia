"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getOwnProperties, updateOwnPropertyForm, updateOwnPropertyStatusForm } from "@/lib/actions/property-inventory";
import { PROPERTY_STATUSES, type PropertyInput, type PropertyStatus } from "@/lib/property-input";

type OwnedProperty = Awaited<ReturnType<typeof getOwnProperties>>["items"][number];
type Field = { key: keyof PropertyInput; label: string; kind?: "number" | "count" | "list" | "text" | "boolean"; required?: boolean; options?: string[] };
const groups: { title: string; fields: Field[] }[] = [
  { title: "Dados do imóvel", fields: [
    { key: "title", label: "Título", required: true },
    { key: "propertyType", label: "Tipo de imóvel", required: true },
    { key: "purpose", label: "Finalidade", options: ["venda", "aluguel", "temporada"] },
    { key: "condition", label: "Condição", options: ["novo", "usado", "em_construcao", "na_planta"] },
    { key: "salePrice", label: "Valor (R$)", kind: "number", required: true },
    { key: "condoFee", label: "Condomínio (R$)", kind: "number" },
    { key: "iptu", label: "IPTU (R$)", kind: "number" },
    { key: "iptuPeriod", label: "Período do IPTU", options: ["anual", "mensal"] },
    { key: "description", label: "Descrição", kind: "text", required: true },
  ] },
  { title: "Endereço e proprietário — dados protegidos", fields: [
    { key: "city", label: "Cidade", required: true }, { key: "state", label: "UF" },
    { key: "neighborhood", label: "Bairro", required: true }, { key: "cep", label: "CEP" },
    { key: "street", label: "Rua" }, { key: "streetNumber", label: "Número" },
    { key: "block", label: "Bloco" }, { key: "floor", label: "Andar" }, { key: "condoName", label: "Nome do condomínio" },
    { key: "confidentialAddress", label: "Endereço completo protegido", required: true },
    { key: "ownerName", label: "Proprietário", required: true }, { key: "ownerPhone", label: "Telefone do proprietário", required: true },
    { key: "hideStreet", label: "Ocultar rua na apresentação ao cliente", kind: "boolean" },
  ] },
  { title: "Áreas e características", fields: [
    { key: "areaM2", label: "Área principal (m²)", kind: "number", required: true },
    { key: "usefulAreaM2", label: "Área útil (m²)", kind: "number" }, { key: "totalAreaM2", label: "Área total (m²)", kind: "number" },
    { key: "bedrooms", label: "Quartos", kind: "count", required: true }, { key: "suites", label: "Suítes", kind: "count", required: true },
    { key: "bathrooms", label: "Banheiros", kind: "count", required: true }, { key: "parkingSpots", label: "Vagas", kind: "count", required: true },
    { key: "hotelRoomsCount", label: "Quartos de hotel/pousada", kind: "count" }, { key: "propertyAge", label: "Idade do imóvel (anos)", kind: "count" },
    { key: "garageType", label: "Garagem", options: ["coberta", "descoberta"] },
    { key: "solarPosition", label: "Posição solar", options: ["nascente", "norte_sul", "poente"] },
    { key: "viewType", label: "Vista", options: ["frente", "fundos", "lagoa", "av_principal"] },
    { key: "privateAmenities", label: "Itens privativos (um por linha)", kind: "list" },
    { key: "condoAmenities", label: "Itens do condomínio (um por linha)", kind: "list" },
  ] },
  { title: "Negócio e parceria", fields: [
    { key: "acceptsPartnership", label: "Disponível para parceria", kind: "boolean" },
    { key: "splitPercentage", label: "Divisão da comissão (%)", kind: "number", required: true },
    { key: "acceptsTrade", label: "Aceita permuta", kind: "boolean" }, { key: "tradeDetails", label: "Detalhes da permuta", kind: "text" },
    { key: "acceptsFinancing", label: "Aceita financiamento", kind: "boolean" },
    { key: "documentationStatus", label: "Documentação", options: ["escriturado", "promessa_compra_venda", "inventario"] },
  ] },
  { title: "Fotos e mídias", fields: [
    { key: "coverPhoto", label: "URL HTTPS da capa" }, { key: "videoUrl", label: "URL HTTPS do vídeo" },
    { key: "photos", label: "Fotos: uma URL HTTPS por linha (até 40)", kind: "list" },
    { key: "floorPlanPhotos", label: "Plantas: uma URL HTTPS por linha (até 10)", kind: "list" },
  ] },
];
const labels: Record<PropertyStatus, string> = { disponivel: "Disponível", em_negociacao: "Em negociação", vendido: "Vendido", arquivado: "Arquivado" };
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900";

export default function PropertyInventory({ reloadKey, onChanged }: { reloadKey: number; onChanged: () => void }) {
  const [items, setItems] = useState<OwnedProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [refresh, setRefresh] = useState(0);
  const requestKey = JSON.stringify([page, search, status, refresh, reloadKey]);
  const [loadedRequest, setLoadedRequest] = useState("");
  const loading = loadedRequest !== requestKey;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<OwnedProperty | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setError("");
      try {
        const result = await getOwnProperties({ page, search, status });
        if (cancelled) return;
        const last = Math.max(1, Math.ceil(result.total / 24));
        if (page > last) { setPage(last); return; }
        setItems(result.items); setTotal(result.total);
      } catch (error) { if (!cancelled) setError(error instanceof Error ? error.message : "Não foi possível carregar a carteira."); }
      finally { if (!cancelled) setLoadedRequest(requestKey); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [page, search, status, refresh, reloadKey, requestKey]);
  function changed() { setRefresh(value => value + 1); onChanged(); }
  async function changeStatus(property: OwnedProperty, value: PropertyStatus) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { const result = await updateOwnPropertyStatusForm(property.id, new Date(property.updatedAt).toISOString(), value); if (!result.success) { setError(result.error); return; } setMessage(`Imóvel marcado como ${labels[value].toLowerCase()}.`); changed(); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível alterar o status."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const data = new FormData(event.currentTarget);
    const input: Record<string, unknown> = {};
    for (const group of groups) for (const field of group.fields) {
      const raw = String(data.get(field.key) ?? "").trim();
      input[field.key] = field.kind === "boolean" ? data.has(field.key) : field.kind === "list" ? raw.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
        : field.kind === "count" ? (raw ? Number(raw) : undefined) : (raw || undefined);
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await updateOwnPropertyForm(editing.id, new Date(editing.updatedAt).toISOString(), input as unknown as PropertyInput);
      if (!result.success) { setError(result.error); return; }
      setEditing(null); setMessage("Imóvel atualizado."); changed();
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar o imóvel."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h3 className="text-xl font-bold text-slate-900">Sua carteira</h3><p className="mt-1 text-sm text-slate-600">Edite sua carteira ou arquive anúncios. O arquivamento retira o imóvel da rede e preserva seu histórico.</p></div>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => { setEditing(null); setRefresh(value => value + 1); }} className="font-bold underline">Recarregar carteira</button></div>}
    {editing ? <form key={`${editing.id}:${editing.updatedAt}`} onSubmit={save} className="space-y-5">
      <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">Editar: {editing.title}</h3><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-sm font-semibold text-slate-600">Cancelar edição</button></div>
      <fieldset disabled={busy} className="space-y-5">
        {groups.map(group => <div key={group.title} className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="font-bold text-slate-800">{group.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2">{group.fields.map(field => {
            const value = editing[field.key];
            const id = `edit-${field.key}`;
            if (field.kind === "boolean") return <label key={field.key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name={field.key} defaultChecked={Boolean(value)} />{field.label}</label>;
            return <label key={field.key} htmlFor={id} className={`block text-sm font-semibold text-slate-700 ${["text", "list"].includes(field.kind || "") ? "sm:col-span-2" : ""}`}>{field.label}
              {field.options ? <select id={id} name={field.key} defaultValue={String(value ?? "")} className={inputClass}><option value="">Não informado</option>{value && !field.options.includes(String(value)) && <option value={String(value)}>{String(value)}</option>}{field.options.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select>
                : ["text", "list"].includes(field.kind || "") ? <textarea id={id} name={field.key} required={field.required} rows={3} defaultValue={Array.isArray(value) ? value.join("\n") : String(value ?? "")} className={inputClass} />
                : <input id={id} name={field.key} required={field.required} type={["number", "count"].includes(field.kind || "") ? "number" : "text"} min={field.kind === "number" && field.required && field.key !== "splitPercentage" ? "0.01" : "0"} step={field.kind === "count" ? "1" : "0.01"} defaultValue={String(value ?? "")} className={inputClass} />}
            </label>;
          })}</div>
        </div>)}
        <button className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Salvando…" : "Salvar alterações"}</button>
      </fieldset>
    </form> : <>
      <div className="flex flex-wrap gap-3"><input aria-label="Buscar na minha carteira" value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar título, cidade ou bairro" className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5 text-sm" />
        <select aria-label="Status dos meus imóveis" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 p-2.5 text-sm"><option value="todos">Todos os status</option>{PROPERTY_STATUSES.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></div>
      {loading ? <p role="status" className="text-sm text-slate-600">Carregando carteira…</p> : items.length ? <div className="space-y-3">{items.map(property => <article key={property.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
        <div className="min-w-0"><h3 className="font-bold text-slate-900">{property.title}</h3><p className="text-sm text-slate-600">{property.neighborhood}, {property.city} · {Number(property.salePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><span className="text-xs font-semibold text-slate-500">{labels[property.status as PropertyStatus] || property.status}</span></div>
        <div className="flex flex-wrap items-center gap-2"><button disabled={busy} type="button" onClick={() => { setEditing(property); setError(""); setMessage(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Editar</button>
          <select disabled={busy} aria-label={`Status: ${property.title}`} value={property.status} onChange={event => { void changeStatus(property, event.target.value as PropertyStatus); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{PROPERTY_STATUSES.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select>
          {property.status !== "arquivado" ? <button disabled={busy} type="button" onClick={() => { void changeStatus(property, "arquivado"); }} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">Arquivar</button> : <button disabled={busy} type="button" onClick={() => { void changeStatus(property, "disponivel"); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Restaurar anúncio</button>}
        </div>
      </article>)}</div> : <p className="py-4 text-sm text-slate-600">Nenhum imóvel encontrado na sua carteira.</p>}
      {total > 24 && <div className="flex items-center justify-between gap-3 text-sm"><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {page} de {Math.ceil(total / 24)} · {total} imóveis</span><button disabled={page >= Math.ceil(total / 24) || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button></div>}
    </>}
  </section>;
}
