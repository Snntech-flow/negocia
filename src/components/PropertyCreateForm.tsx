"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2, CheckSquare, DollarSign, Eye, Home, Image as ImageIcon, Layers, Lock, MapPin, PlusCircle, Search, Square, Sun, Trash2, Users, Video } from "lucide-react";
import { createProperty } from "@/lib/actions";
import { unwrap, type ActionData } from "@/lib/action-result";
import { BRAZILIAN_STATES, isBrazilianState } from "@/lib/brazil-states";
import { loadStateCities } from "@/lib/cities";
import {
  CONDITIONS, CONDO_AMENITIES_GROUPS, DOCUMENTATION_STATUSES, GARAGE_TYPES, PRIVATE_AMENITIES_LIST, PROPERTY_TYPES, PURPOSES, SOLAR_POSITIONS, VIEW_TYPES,
  type Condition, type DocumentationStatus, type GarageType, type Purpose, type SolarPosition, type ViewType,
} from "@/lib/property-options";
import PhotoUploader from "./PhotoUploader";
import { temPrevisaoDeEntrega } from "@/lib/delivery-forecast";

export type CreatedProperty = ActionData<Awaited<ReturnType<typeof createProperty>>>["property"];

const section = "bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg";
const heading = "text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3";
const input = "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500";
const label = "block text-xs font-medium text-slate-300 mb-1";
const safeHttps = (value: string) => { try { const url = new URL(value); return url.protocol === "https:"; } catch { return false; } };

function Choices<T extends string | number>({ title, options, value, onChange, columns = "grid-cols-2 sm:grid-cols-4", icon, required }: {
  title: string; options: readonly { id: T; label: string }[]; value: T | null; onChange: (value: T) => void; columns?: string; icon?: ReactNode; required?: boolean;
}) {
  return <div role="group" aria-label={title}>
    <p className={`${label} flex items-center gap-1.5`}>{icon}{title}{required && " *"}</p>
    <div className={`grid gap-1.5 ${columns}`}>
      {options.map((option) => (
        <button key={String(option.id)} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}
          className={`min-h-9 py-2 px-2 rounded-xl text-xs font-semibold border transition ${value === option.id ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"}`}>
          {option.label}
        </button>
      ))}
    </div>
  </div>;
}

const counts = (max: number) => Array.from({ length: max + 1 }, (_, index) => ({ id: index, label: index === max ? `${max}+` : String(index) }));

export default function PropertyCreateForm({ broker, blockedReason, onCreated, onMessage }: {
  broker: { name: string; city: string; state: string };
  blockedReason: string | null;
  onCreated: (property: CreatedProperty) => void;
  onMessage: (text: string) => void;
}) {
  const [purpose, setPurpose] = useState<Purpose>("venda");
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [suites, setSuites] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [parkingSpots, setParkingSpots] = useState<number | null>(null);
  const [garageType, setGarageType] = useState<GarageType | null>(null);
  const [solarPosition, setSolarPosition] = useState<SolarPosition>("nao_definido");
  const [viewType, setViewType] = useState<ViewType>("nao_definido");
  const [iptuPeriod, setIptuPeriod] = useState<"anual" | "mensal">("anual");
  const [documentationStatus, setDocumentationStatus] = useState<DocumentationStatus | "">("");
  const [acceptsFinancing, setAcceptsFinancing] = useState<boolean | null>(null);
  const [acceptsTrade, setAcceptsTrade] = useState(false);
  const [acceptsPartnership, setAcceptsPartnership] = useState(true);
  const [privateAmenities, setPrivateAmenities] = useState<string[]>([]);
  const [condoAmenities, setCondoAmenities] = useState<string[]>([]);
  const [cep, setCep] = useState("");
  const [city, setCity] = useState(broker.city);
  const [state, setState] = useState(isBrazilianState(broker.state) ? broker.state : "");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [searchingCep, setSearchingCep] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [floorPlans, setFloorPlans] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [floorPlanUrl, setFloorPlanUrl] = useState("");
  const [stateCities, setStateCities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (state) void loadStateCities(state).then((list) => { if (!cancelled) setStateCities(list); });
    return () => { cancelled = true; };
  }, [state]);

  const toggle = (list: string[], item: string) => list.includes(item) ? list.filter((value) => value !== item) : [...list, item];

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setCep(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
    if (digits.length !== 8) return;
    setSearchingCep(true);
    try {
      const data = await (await fetch(`https://viacep.com.br/ws/${digits}/json/`)).json();
      if (data.erro) { onMessage("CEP não encontrado. Preencha o endereço manualmente."); return; }
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setState(data.uf);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.logradouro) setStreet(data.logradouro);
    } catch {
      onMessage("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
    } finally { setSearchingCep(false); }
  }

  function addUrl(kind: "photo" | "plan") {
    const value = (kind === "photo" ? photoUrl : floorPlanUrl).trim();
    if (!value) return;
    if (!safeHttps(value)) { setError("Cole um link que comece com https://"); return; }
    if (kind === "photo") { if (photos.length >= 40) return; setPhotos([...photos, value]); setPhotoUrl(""); }
    else { if (floorPlans.length >= 10) return; setFloorPlans([...floorPlans, value]); setFloorPlanUrl(""); }
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blockedReason) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    const text = (name: string) => String(fd.get(name) || "").trim();
    const missing = [
      !propertyType && "tipo do imóvel", !condition && "condição", bedrooms === null && "quartos", suites === null && "suítes",
      bathrooms === null && "banheiros", parkingSpots === null && "vagas", acceptsFinancing === null && "se aceita financiamento",
      !text("usefulAreaM2") && !text("totalAreaM2") && "área (útil ou total)", !state && "UF",
    ].filter(Boolean);
    if (missing.length) { setError(`Falta informar: ${missing.join(", ")}.`); form.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const number = text("streetNumber");
    const block = text("block");
    const floor = text("floor");
    const confidentialAddress = [`${street.trim()}, ${number || "s/n"}`, block && `Bloco ${block}`, floor, `${neighborhood.trim()} · ${city.trim()}/${state}`].filter(Boolean).join(" · ");
    setBusy(true); setError("");
    try {
      const result = unwrap(await createProperty({
        title: text("title") || `${propertyType} em ${neighborhood.trim()}`,
        purpose, salePrice: text("salePrice"), acceptsTrade, tradeDetails: acceptsTrade ? text("tradeDetails") || undefined : undefined,
        propertyType: propertyType!, condition: condition!,
        hotelRoomsCount: (propertyType === "Hotel" || propertyType === "Pousada") && text("hotelRoomsCount") ? Number(text("hotelRoomsCount")) : undefined,
        bedrooms: bedrooms!, suites: suites!, bathrooms: bathrooms!, parkingSpots: parkingSpots!,
        garageType: parkingSpots ? garageType || undefined : undefined,
        usefulAreaM2: text("usefulAreaM2") || undefined, totalAreaM2: text("totalAreaM2") || undefined,
        areaM2: text("usefulAreaM2") || text("totalAreaM2"),
        solarPosition, viewType,
        // Em construção/na planta: previsão de entrega (mês/ano) no lugar da idade (pedido da corretora piloto, 11/10/2026).
        propertyAge: !temPrevisaoDeEntrega(condition) && text("propertyAge") ? Number(text("propertyAge")) : undefined,
        deliveryForecast: temPrevisaoDeEntrega(condition) ? text("deliveryForecast") || undefined : undefined,
        condoFee: text("condoFee") || "0", iptu: text("iptu") || "0", iptuPeriod,
        acceptsFinancing: acceptsFinancing!, documentationStatus: documentationStatus || undefined,
        privateAmenities, condoAmenities,
        cep: cep || undefined, state, city: city.trim(), neighborhood: neighborhood.trim(), street: street.trim(), hideStreet: true,
        condoName: text("condoName") || undefined, streetNumber: number || undefined, block: block || undefined, floor: floor || undefined,
        confidentialAddress,
        videoUrl: text("videoUrl") || undefined,
        coverPhoto: photos[0], photos, floorPlanPhotos: floorPlans,
        description: text("description"),
        ownerName: text("ownerName"), ownerPhone: text("ownerPhone"),
        acceptsPartnership, splitPercentage: "50.00",
      }));
      onCreated(result.property);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Não foi possível salvar o imóvel.");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-6" aria-describedby={error ? "property-form-error" : undefined}>
    {blockedReason && <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{blockedReason}</p>}
    {error && <p id="property-form-error" role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

    <div className={section}>
      <h3 className={heading}><DollarSign className="w-4 h-4 text-amber-500" />1. Finalidade, valores e condições</h3>
      <Choices title="Finalidade do imóvel" options={PURPOSES} value={purpose} onChange={setPurpose} columns="grid-cols-3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label htmlFor="pc-price" className={label}>Valor {purpose === "venda" ? "de venda" : purpose === "aluguel" ? "do aluguel" : "da diária"} (R$) *</label><input id="pc-price" name="salePrice" required type="number" min="1" step="0.01" placeholder="Ex: 850000" className={input} /></div>
        <div><label htmlFor="pc-condo" className={label}>Condomínio (R$/mês)</label><input id="pc-condo" name="condoFee" type="number" min="0" step="0.01" placeholder="Ex: 650" className={input} /></div>
        <div><label htmlFor="pc-iptu" className={label}>IPTU (R$)</label><div className="flex gap-2"><input id="pc-iptu" name="iptu" type="number" min="0" step="0.01" placeholder="Ex: 180" className={input} /><select aria-label="Período do IPTU" value={iptuPeriod} onChange={(e) => setIptuPeriod(e.target.value as "anual" | "mensal")} className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"><option value="anual">Anual</option><option value="mensal">Mensal</option></select></div></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Choices title="Aceita financiamento bancário?" required options={[{ id: "sim", label: "Sim, financia" }, { id: "nao", label: "Somente à vista" }]} value={acceptsFinancing === null ? null : acceptsFinancing ? "sim" : "nao"} onChange={(value) => setAcceptsFinancing(value === "sim")} columns="grid-cols-2" />
        <div><label htmlFor="pc-doc" className={label}>Situação da documentação</label><select id="pc-doc" value={documentationStatus} onChange={(e) => setDocumentationStatus(e.target.value as DocumentationStatus | "")} className={input}><option value="">Não informada</option>{DOCUMENTATION_STATUSES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
      </div>
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <Choices title="Aceita permuta?" options={[{ id: "nao", label: "Não" }, { id: "sim", label: "Sim, aceita" }]} value={acceptsTrade ? "sim" : "nao"} onChange={(value) => setAcceptsTrade(value === "sim")} columns="grid-cols-2" />
        {acceptsTrade && <div><label htmlFor="pc-trade" className={label}>Detalhes da permuta</label><input id="pc-trade" name="tradeDetails" maxLength={1000} placeholder="Ex: aceita carro até R$ 100 mil" className={input} /></div>}
      </div>
    </div>

    <div className={section}>
      <h3 className={heading}><Building2 className="w-4 h-4 text-amber-500" />2. Tipo do imóvel e estrutura</h3>
      <Choices title="Tipo de imóvel" required options={PROPERTY_TYPES.map((type) => ({ id: type, label: type }))} value={propertyType} onChange={setPropertyType} columns="grid-cols-2 sm:grid-cols-4 md:grid-cols-7" />
      {(propertyType === "Hotel" || propertyType === "Pousada") && <div><label htmlFor="pc-rooms" className={label}>Número de quartos/suítes do {propertyType}</label><input id="pc-rooms" name="hotelRoomsCount" type="number" min="0" placeholder="Ex: 24" className={input} /></div>}
      <Choices title="Condição do imóvel" required options={CONDITIONS} value={condition} onChange={setCondition} />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Choices title="Quartos" required options={counts(5)} value={bedrooms} onChange={setBedrooms} columns="grid-cols-6" />
        <Choices title="Suítes" required options={counts(4)} value={suites} onChange={setSuites} columns="grid-cols-5" />
        <Choices title="Banheiros" required options={counts(5)} value={bathrooms} onChange={setBathrooms} columns="grid-cols-6" />
        <Choices title="Vagas de garagem" required options={counts(4)} value={parkingSpots} onChange={setParkingSpots} columns="grid-cols-5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {!!parkingSpots && <Choices title="Tipo de vaga" options={GARAGE_TYPES} value={garageType} onChange={setGarageType} columns="grid-cols-2" />}
        <div><label htmlFor="pc-useful" className={label}>Área útil privativa (m²)</label><input id="pc-useful" name="usefulAreaM2" type="number" min="0.01" step="0.01" placeholder="Ex: 85" className={input} /></div>
        <div><label htmlFor="pc-total" className={label}>Área total / terreno (m²)</label><input id="pc-total" name="totalAreaM2" type="number" min="0.01" step="0.01" placeholder="Ex: 120" className={input} /></div>
        {temPrevisaoDeEntrega(condition)
          ? <div><label htmlFor="pc-delivery" className={label}>Previsão de entrega (mês/ano)</label><input id="pc-delivery" name="deliveryForecast" type="month" min="2000-01" max="2100-12" className={input} /></div>
          : <div><label htmlFor="pc-age" className={label}>Idade do imóvel (anos)</label><input id="pc-age" name="propertyAge" type="number" min="0" placeholder="Ex: 5" className={input} /></div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Choices title="Posição solar" icon={<Sun className="w-3.5 h-3.5 text-amber-400" />} options={SOLAR_POSITIONS} value={solarPosition} onChange={setSolarPosition} columns="grid-cols-2" />
        <Choices title="Tipo de vista" icon={<Eye className="w-3.5 h-3.5 text-amber-400" />} options={VIEW_TYPES} value={viewType} onChange={setViewType} columns="grid-cols-3" />
      </div>
    </div>

    <div className={section}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Home className="w-4 h-4 text-amber-500" />3. Itens do imóvel</h3>
        <span className="text-xs font-bold text-amber-400">{privateAmenities.length} selecionados</span>
      </div>
      <p className="text-[11px] text-slate-400">Marque só o que está instalado na unidade.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PRIVATE_AMENITIES_LIST.map((item) => { const selected = privateAmenities.includes(item); return <button key={item} type="button" aria-pressed={selected} onClick={() => setPrivateAmenities(toggle(privateAmenities, item))} className={`p-2.5 rounded-xl text-left text-xs font-medium border flex items-center gap-2 transition ${selected ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}>{selected ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}<span>{item}</span></button>; })}
      </div>
    </div>

    <div className={section}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Layers className="w-4 h-4 text-amber-500" />4. Condomínio</h3>
        <span className="text-xs font-bold text-emerald-400">{condoAmenities.length} selecionados</span>
      </div>
      {CONDO_AMENITIES_GROUPS.map((group) => <div key={group.category} className="space-y-2">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{group.category}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {group.items.map((item) => { const selected = condoAmenities.includes(item); return <button key={item} type="button" aria-pressed={selected} onClick={() => setCondoAmenities(toggle(condoAmenities, item))} className={`p-2 rounded-xl text-left text-[11px] font-medium border flex items-center gap-2 transition ${selected ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}>{selected ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}<span>{item}</span></button>; })}
        </div>
      </div>)}
    </div>

    <div className={section}>
      <h3 className={heading}><MapPin className="w-4 h-4 text-amber-500" />5. Localização e proteção do endereço</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label htmlFor="pc-cep" className={`${label} flex items-center justify-between`}><span>CEP (preenche o endereço)</span>{searchingCep && <span className="text-[10px] text-amber-400 font-bold">Buscando…</span>}</label>
          <div className="flex gap-1.5"><input id="pc-cep" inputMode="numeric" value={cep} onChange={(e) => void lookupCep(e.target.value)} placeholder="00000-000" maxLength={9} className={`${input} font-mono`} /><span className="flex items-center rounded-xl bg-slate-800 px-3 text-slate-400"><Search className="w-3.5 h-3.5" /></span></div>
        </div>
        <div><label htmlFor="pc-city" className={label}>Cidade *</label><input id="pc-city" required list="pc-city-options" autoComplete="off" value={city} onChange={(e) => setCity(e.target.value)} className={input} /><datalist id="pc-city-options">{stateCities.map((name) => <option key={name} value={name} />)}</datalist></div>
        <div><label htmlFor="pc-state" className={label}>UF *</label><select id="pc-state" required value={state} onChange={(e) => setState(e.target.value)} className={input}><option value="">Escolha</option>{BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label htmlFor="pc-neighborhood" className={label}>Bairro (aparece na vitrine) *</label><input id="pc-neighborhood" required value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={input} /></div>
        <div><label htmlFor="pc-condo-name" className={label}>Nome do condomínio / edifício</label><input id="pc-condo-name" name="condoName" maxLength={160} className={input} /></div>
      </div>
      <div><label htmlFor="pc-street" className={label}>Rua / logradouro *</label><input id="pc-street" required value={street} onChange={(e) => setStreet(e.target.value)} className={input} /></div>
      <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-[11px] text-slate-300"><Lock className="w-4 h-4 text-amber-400 shrink-0" />Rua, número, bloco e andar ficam visíveis só para você: não aparecem na vitrine dos corretores nem na ficha enviada ao cliente, que mostram apenas bairro e cidade.</p>
      <div className="grid grid-cols-3 gap-3">
        <div><label htmlFor="pc-number" className={label}>Número</label><input id="pc-number" name="streetNumber" maxLength={30} className={input} /></div>
        <div><label htmlFor="pc-block" className={label}>Bloco / torre</label><input id="pc-block" name="block" maxLength={50} className={input} /></div>
        <div><label htmlFor="pc-floor" className={label}>Andar / unidade</label><input id="pc-floor" name="floor" maxLength={30} className={input} /></div>
      </div>
    </div>

    <div className={section}>
      <h3 className={heading}><ImageIcon className="w-4 h-4 text-amber-500" />6. Fotos, planta, vídeo e descrição</h3>
      <div className="space-y-2">
        <p className={label}>Fotos do imóvel ({photos.length}/40) · a primeira é a capa</p>
        <PhotoUploader remaining={40 - photos.length} label="Enviar fotos do celular ou computador" onUploaded={(urls) => setPhotos((current) => [...current, ...urls].slice(0, 40))} />
        <div className="flex gap-2"><input aria-label="Link de uma foto" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl("photo"); } }} placeholder="Ou cole o link (https://) de uma foto" className={`${input} text-xs`} /><button type="button" onClick={() => addUrl("photo")} disabled={!photoUrl.trim()} title={photoUrl.trim() ? "Adicionar a foto deste link" : "Cole o link de uma foto ao lado — para enviar do celular ou computador, use o botão acima"} className="shrink-0 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">Adicionar link</button></div>
        {photos.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">{photos.map((url, index) => <div key={url + index} className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
          <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] px-1 rounded text-white">{index === 0 ? "capa" : `#${index + 1}`}</span>
          <div className="absolute top-1 right-1 flex gap-1">
            {index > 0 && <button type="button" onClick={() => setPhotos([url, ...photos.filter((_, i) => i !== index)])} className="bg-slate-950/80 text-white text-[9px] px-1 rounded">capa</button>}
            <button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => setPhotos(photos.filter((_, i) => i !== index))} className="bg-red-600 text-white p-0.5 rounded"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>)}</div>}
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <p className={label}>Planta baixa (opcional, até 10)</p>
        <PhotoUploader remaining={10 - floorPlans.length} label="Enviar planta" onUploaded={(urls) => setFloorPlans((current) => [...current, ...urls].slice(0, 10))} />
        <div className="flex gap-2"><input aria-label="Link da planta" value={floorPlanUrl} onChange={(e) => setFloorPlanUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl("plan"); } }} placeholder="Ou cole o link (https://) da planta" className={`${input} text-xs`} /><button type="button" onClick={() => addUrl("plan")} disabled={!floorPlanUrl.trim()} title={floorPlanUrl.trim() ? "Adicionar a planta deste link" : "Cole o link da planta ao lado — para enviar do celular ou computador, use o botão acima"} className="shrink-0 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">Adicionar link</button></div>
        {floorPlans.length > 0 && <div className="flex flex-wrap gap-2">{floorPlans.map((url, index) => <div key={url + index} className="relative h-16 w-24 rounded-lg overflow-hidden border border-slate-800">
          <img src={url} alt={`Planta ${index + 1}`} className="w-full h-full object-cover" />
          <button type="button" aria-label={`Remover planta ${index + 1}`} onClick={() => setFloorPlans(floorPlans.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded"><Trash2 className="w-3 h-3" /></button>
        </div>)}</div>}
      </div>
      <div className="pt-2 border-t border-slate-800"><label htmlFor="pc-video" className={`${label} flex items-center gap-1.5`}><Video className="w-3.5 h-3.5 text-amber-400" />Link do vídeo (YouTube, Vimeo ou tour 360)</label><input id="pc-video" name="videoUrl" type="url" placeholder="https://" className={`${input} text-xs`} /></div>
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div><label htmlFor="pc-title" className={label}>Título do anúncio</label><input id="pc-title" name="title" maxLength={160} placeholder={propertyType && neighborhood ? `${propertyType} em ${neighborhood}` : "Ex: Apartamento com varanda gourmet"} className={input} /></div>
        <div><label htmlFor="pc-description" className={label}>Descrição *</label><textarea id="pc-description" name="description" required minLength={10} maxLength={10000} rows={4} placeholder="Diferenciais, acabamento e condições do imóvel" className={input} /></div>
      </div>
    </div>

    <div className="p-5 rounded-2xl bg-amber-950/20 border-2 border-amber-500/50 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2"><Lock className="w-5 h-5" />7. Proprietário</h3>
        <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30">Visível só para você</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">Nome e telefone do proprietário não aparecem na vitrine, na ficha do cliente nem para corretores parceiros. Só você ({broker.name}) vê estes dados.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label htmlFor="pc-owner" className={label}>Nome completo do proprietário *</label><input id="pc-owner" name="ownerName" required maxLength={120} className={input} /></div>
        <div><label htmlFor="pc-owner-phone" className={label}>Telefone / WhatsApp do proprietário *</label><input id="pc-owner-phone" name="ownerPhone" required inputMode="tel" maxLength={30} className={input} /></div>
      </div>
    </div>

    <div className={section}>
      <h3 className={heading}><Users className="w-4 h-4 text-amber-500" />8. Parceria</h3>
      <button type="button" aria-pressed={acceptsPartnership} onClick={() => setAcceptsPartnership(!acceptsPartnership)} className={`w-full p-4 rounded-xl border-2 text-left transition flex items-start gap-3 ${acceptsPartnership ? "bg-emerald-950/20 border-emerald-500" : "bg-slate-950 border-slate-800"}`}>
        {acceptsPartnership ? <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
        <span><span className="block text-xs font-bold text-white">Oferecer na rede para parceria</span><span className="block text-[11px] text-slate-300">Corretores aprovados veem o imóvel na vitrine e podem propor visita. Divisão de partida: 50% para você e 50% para o corretor do comprador. Desmarcado, o imóvel fica só na sua carteira.</span></span>
      </button>
    </div>

    <button type="submit" disabled={busy || !!blockedReason} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-4 rounded-2xl transition shadow-xl shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
      <PlusCircle className="w-5 h-5" /><span>{busy ? "Publicando…" : acceptsPartnership ? "Publicar imóvel na rede" : "Salvar imóvel na minha carteira"}</span>
    </button>
  </form>;
}
