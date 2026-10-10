"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getOwnProperties, updateOwnProperty, updateOwnPropertyStatus } from "@/lib/actions/property-inventory";
import { unwrap, type ActionData } from "@/lib/action-result";
import { BRAZILIAN_STATES } from "@/lib/brazil-states";
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUSES, type PropertyInput, type PropertyStatus } from "@/lib/property-input";
import { CONDITIONS, CONDO_AMENITIES_GROUPS, DOCUMENTATION_STATUSES, GARAGE_TYPES, IPTU_PERIODS, PRIVATE_AMENITIES_LIST, PURPOSES, SOLAR_POSITIONS, VIEW_TYPES } from "@/lib/property-options";
import PhotoUploader from "./PhotoUploader";

type OwnedProperty = ActionData<Awaited<ReturnType<typeof getOwnProperties>>>["items"][number];
type Option = { readonly id: string; readonly label: string };
type Field = {
  key: keyof PropertyInput; label: string; required?: boolean;
  kind?: "number" | "count" | "list" | "text" | "boolean" | "checklist" | "photos";
  // Sem "Não informado" quando o campo é obrigatório na vitrine (condição) ou já tem "Não definido".
  options?: readonly Option[]; allowEmpty?: boolean; choices?: string[]; max?: number;
};
const ufOptions = BRAZILIAN_STATES.map((uf) => ({ id: uf, label: uf }));
const condoItems = CONDO_AMENITIES_GROUPS.flatMap((group) => group.items);
const groups: { title: string; fields: Field[] }[] = [
  { title: "Dados do imóvel", fields: [
    { key: "title", label: "Título", required: true },
    { key: "propertyType", label: "Tipo de imóvel", required: true },
    { key: "purpose", label: "Finalidade", options: PURPOSES },
    { key: "condition", label: "Condição", options: CONDITIONS },
    { key: "salePrice", label: "Valor (R$)", kind: "number", required: true },
    { key: "condoFee", label: "Condomínio (R$)", kind: "number" },
    { key: "iptu", label: "IPTU (R$)", kind: "number" },
    { key: "iptuPeriod", label: "Período do IPTU", options: IPTU_PERIODS },
    { key: "description", label: "Descrição", kind: "text", required: true },
  ] },
  { title: "Endereço e proprietário — dados protegidos", fields: [
    { key: "city", label: "Cidade", required: true }, { key: "state", label: "UF", options: ufOptions, allowEmpty: true },
    { key: "neighborhood", label: "Bairro", required: true }, { key: "cep", label: "CEP" },
    { key: "street", label: "Rua" }, { key: "streetNumber", label: "Número" },
    { key: "block", label: "Bloco" }, { key: "floor", label: "Andar" }, { key: "condoName", label: "Nome do condomínio" },
    { key: "confidentialAddress", label: "Endereço completo protegido", required: true },
    { key: "ownerName", label: "Proprietário", required: true }, { key: "ownerPhone", label: "Telefone do proprietário", required: true },
  ] },
  { title: "Áreas e características", fields: [
    { key: "areaM2", label: "Área principal (m²)", kind: "number", required: true },
    { key: "usefulAreaM2", label: "Área útil (m²)", kind: "number" }, { key: "totalAreaM2", label: "Área total (m²)", kind: "number" },
    { key: "bedrooms", label: "Quartos", kind: "count", required: true }, { key: "suites", label: "Suítes", kind: "count", required: true },
    { key: "bathrooms", label: "Banheiros", kind: "count", required: true }, { key: "parkingSpots", label: "Vagas", kind: "count", required: true },
    { key: "hotelRoomsCount", label: "Quartos de hotel/pousada", kind: "count" }, { key: "propertyAge", label: "Idade do imóvel (anos)", kind: "count" },
    { key: "garageType", label: "Garagem", options: GARAGE_TYPES, allowEmpty: true },
    { key: "solarPosition", label: "Posição solar", options: SOLAR_POSITIONS },
    { key: "viewType", label: "Vista", options: VIEW_TYPES },
    { key: "privateAmenities", label: "Itens privativos", kind: "checklist", choices: PRIVATE_AMENITIES_LIST },
    { key: "condoAmenities", label: "Itens do condomínio", kind: "checklist", choices: condoItems },
  ] },
  { title: "Negócio e parceria", fields: [
    { key: "acceptsPartnership", label: "Disponível para parceria", kind: "boolean" },
    { key: "splitPercentage", label: "Divisão da comissão (%)", kind: "number", required: true },
    { key: "acceptsTrade", label: "Aceita permuta", kind: "boolean" }, { key: "tradeDetails", label: "Detalhes da permuta", kind: "text" },
    { key: "acceptsFinancing", label: "Aceita financiamento", kind: "boolean" },
    { key: "documentationStatus", label: "Documentação", options: DOCUMENTATION_STATUSES, allowEmpty: true },
  ] },
  { title: "Fotos e mídias", fields: [
    { key: "coverPhoto", label: "URL HTTPS da capa (se vazio, usa a primeira foto)" }, { key: "videoUrl", label: "URL HTTPS do vídeo" },
    { key: "photos", label: "Fotos (até 40)", kind: "photos", max: 40 },
    { key: "floorPlanPhotos", label: "Plantas (até 10)", kind: "photos", max: 10 },
  ] },
];
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900";

function PhotoListField({ field, initial }: { field: Field; initial: string[] }) {
  const [text, setText] = useState(initial.join("\n"));
  const urls = text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  return <div className="sm:col-span-2 space-y-2">
    <label htmlFor={`edit-${field.key}`} className="block text-sm font-semibold text-slate-700">{field.label} · {urls.length}/{field.max}
      <textarea id={`edit-${field.key}`} name={field.key} rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Uma URL HTTPS por linha" className={inputClass} />
    </label>
    <PhotoUploader remaining={(field.max || 40) - urls.length} label={field.key === "photos" ? "Enviar fotos do imóvel" : "Enviar fotos da planta"} onUploaded={(added) => setText((current) => [current.trim(), ...added].filter(Boolean).join("\n"))} />
  </div>;
}

export default function PropertyInventory({ reloadKey, onChanged }: { reloadKey: number; onChanged: () => void }) {
  const [items, setItems] = useState<OwnedProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [usage, setUsage] = useState<{ active: number; limit: number | null } | null>(null);
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
        const result = unwrap(await getOwnProperties({ page, search, status }));
        if (cancelled) return;
        const last = Math.max(1, Math.ceil(result.total / 24));
        if (page > last) { setPage(last); return; }
        setItems(result.items); setTotal(result.total); setUsage({ active: result.activeListings, limit: result.listingLimit });
      } catch (error) { if (!cancelled) setError(error instanceof Error ? error.message : "Não foi possível carregar a carteira."); }
      finally { if (!cancelled) setLoadedRequest(requestKey); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [page, search, status, refresh, reloadKey, requestKey]);
  function changed() { setRefresh(value => value + 1); onChanged(); }
  async function changeStatus(property: OwnedProperty, value: PropertyStatus) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { unwrap(await updateOwnPropertyStatus(property.id, new Date(property.updatedAt).toISOString(), value)); setMessage(`Imóvel marcado como ${PROPERTY_STATUS_LABELS[value].toLowerCase()}.`); changed(); }
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
      input[field.key] = field.kind === "boolean" ? data.has(field.key)
        : field.kind === "checklist" ? data.getAll(field.key).map(String)
        : field.kind === "list" || field.kind === "photos" ? raw.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
        : field.kind === "count" ? (raw ? Number(raw) : undefined) : (raw || undefined);
    }
    setBusy(true); setError(""); setMessage("");
    try {
      unwrap(await updateOwnProperty(editing.id, new Date(editing.updatedAt).toISOString(), input as unknown as PropertyInput));
      setEditing(null); setMessage("Imóvel atualizado."); changed();
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar o imóvel."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-xl font-bold text-slate-900">Sua carteira</h3><p className="mt-1 text-sm text-slate-600">Edite sua carteira ou arquive anúncios. O arquivamento retira o imóvel da rede e preserva seu histórico.</p></div>
      {usage && usage.limit !== null && <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${usage.active >= usage.limit ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}`}>{usage.active} de {usage.limit} anúncios ativos{usage.active >= usage.limit ? " · limite do plano" : ""}</p>}
    </div>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => { setEditing(null); setRefresh(value => value + 1); }} className="font-bold underline">Recarregar carteira</button></div>}
    {editing ? <form key={`${editing.id}:${editing.updatedAt}`} onSubmit={save} className="space-y-5">
      <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">Editar: {editing.title}</h3><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-sm font-semibold text-slate-600">Cancelar edição</button></div>
      <fieldset disabled={busy} className="space-y-5">
        {groups.map(group => <div key={group.title} className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="font-bold text-slate-800">{group.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2">{group.fields.map(field => {
            const value = editing[field.key as keyof OwnedProperty];
            const id = `edit-${field.key}`;
            if (field.kind === "boolean") return <label key={field.key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name={field.key} defaultChecked={Boolean(value)} />{field.label}</label>;
            if (field.kind === "photos") return <PhotoListField key={field.key} field={field} initial={Array.isArray(value) ? value.map(String) : []} />;
            if (field.kind === "checklist") {
              const selected = Array.isArray(value) ? value.map(String) : [];
              // Itens antigos fora da lista continuam marcados para não sumirem ao salvar.
              const choices = [...(field.choices || []), ...selected.filter((item) => !(field.choices || []).includes(item))];
              return <fieldset key={field.key} className="sm:col-span-2"><legend className="text-sm font-semibold text-slate-700">{field.label}</legend>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">{choices.map((item) => <label key={item} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name={field.key} value={item} defaultChecked={selected.includes(item)} />{item}</label>)}</div>
              </fieldset>;
            }
            return <label key={field.key} htmlFor={id} className={`block text-sm font-semibold text-slate-700 ${["text", "list"].includes(field.kind || "") ? "sm:col-span-2" : ""}`}>{field.label}
              {field.options ? <select id={id} name={field.key} defaultValue={String(value ?? "")} className={inputClass}>
                  {(field.allowEmpty || !value) && !field.options.some((option) => option.id === "nao_definido") && <option value="">Não informado</option>}
                  {value && !field.options.some((option) => option.id === String(value)) && <option value={String(value)}>{String(value)}</option>}
                  {field.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                : field.kind === "text" ? <textarea id={id} name={field.key} required={field.required} rows={3} defaultValue={String(value ?? "")} className={inputClass} />
                : <input id={id} name={field.key} required={field.required} type={["number", "count"].includes(field.kind || "") ? "number" : "text"} min={field.kind === "number" && field.required && field.key !== "splitPercentage" ? "0.01" : "0"} step={field.kind === "count" ? "1" : "0.01"} defaultValue={String(value ?? "")} className={inputClass} />}
            </label>;
          })}</div>
        </div>)}
        <button className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Salvando…" : "Salvar alterações"}</button>
      </fieldset>
    </form> : <>
      <div className="flex flex-wrap gap-3"><input aria-label="Buscar na minha carteira" value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar título, cidade ou bairro" className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5 text-sm" />
        <select aria-label="Status dos meus imóveis" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 p-2.5 text-sm"><option value="todos">Todos os status</option>{PROPERTY_STATUSES.map(value => <option key={value} value={value}>{PROPERTY_STATUS_LABELS[value]}</option>)}</select></div>
      {loading ? <p role="status" className="text-sm text-slate-600">Carregando carteira…</p> : items.length ? <div className="space-y-3">{items.map(property => <article key={property.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
        <div className="min-w-0"><h3 className="font-bold text-slate-900">{property.title}</h3><p className="text-sm text-slate-600">{property.neighborhood}, {property.city} · {Number(property.salePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><span className="text-xs font-semibold text-slate-500">{PROPERTY_STATUS_LABELS[property.status as PropertyStatus] || property.status}</span></div>
        <div className="flex flex-wrap items-center gap-2"><button disabled={busy} type="button" onClick={() => { setEditing(property); setError(""); setMessage(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Editar</button>
          <select disabled={busy} aria-label={`Status: ${property.title}`} value={property.status} onChange={event => { void changeStatus(property, event.target.value as PropertyStatus); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{PROPERTY_STATUSES.map(value => <option key={value} value={value}>{PROPERTY_STATUS_LABELS[value]}</option>)}</select>
          {property.status !== "arquivado" ? <button disabled={busy} type="button" onClick={() => { void changeStatus(property, "arquivado"); }} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">Arquivar</button> : <button disabled={busy} type="button" onClick={() => { void changeStatus(property, "disponivel"); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Restaurar anúncio</button>}
        </div>
      </article>)}</div> : <p className="py-4 text-sm text-slate-600">Nenhum imóvel encontrado na sua carteira.</p>}
      {total > 24 && <div className="flex items-center justify-between gap-3 text-sm"><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {page} de {Math.ceil(total / 24)} · {total} imóveis</span><button disabled={page >= Math.ceil(total / 24) || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button></div>}
    </>}
  </section>;
}
