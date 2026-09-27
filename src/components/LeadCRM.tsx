"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { Building2, CalendarClock, CheckCircle2, Clock3, MapPin, Pencil, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { addLeadActivity, createDvpCertificate, createLead, updateLead, updateLeadStage } from "@/lib/actions";

export interface LeadItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  leadType: string;
  stage: string;
  source: string;
  propertyType: string | null;
  city: string | null;
  neighborhoods: string[];
  maxBudget: string | null;
  minBedrooms: number | null;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: Date | null;
  lastContactAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadActivityItem {
  id: string;
  leadId: string;
  userId: string;
  activityType: string;
  description: string;
  occurredAt: Date;
}

export interface LeadMatchProperty {
  id: string;
  title: string;
  propertyType: string;
  salePrice: string;
  purpose?: string;
  city: string;
  neighborhood: string;
  bedrooms: number;
  status: string;
  coverPhoto?: string | null;
  brokerId: string;
  acceptsPartnership: boolean;
  splitPercentage: string;
}

const stages = [
  { key: "novo", label: "Novo" },
  { key: "contato", label: "Contato" },
  { key: "qualificado", label: "Qualificado" },
  { key: "visita", label: "Visita" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "fechado", label: "Fechado" },
  { key: "perdido", label: "Perdido" },
];

const leadTypes = [
  ["comprador", "Comprador"],
  ["proprietario", "Proprietário / vendedor"],
  ["locatario", "Locatário"],
  ["parceiro", "Corretor parceiro"],
];

const sources = [
  ["indicacao", "Indicação"],
  ["whatsapp", "WhatsApp"],
  ["portal", "Portal imobiliário"],
  ["site", "Site"],
  ["ligacao", "Ligação"],
  ["rede_social", "Rede social"],
  ["outro", "Outro"],
];

const activityTypes = [
  ["ligacao", "Ligação"],
  ["mensagem", "Mensagem"],
  ["visita", "Visita"],
  ["proposta", "Proposta"],
  ["nota", "Nota"],
];

const LEAD_TYPE_LABELS: Record<string, string> = {
  comprador: "Comprador",
  proprietario: "Proprietário",
  locatario: "Locatário",
  parceiro: "Parceiro",
};

const LEAD_SOURCE_LABELS: Record<string, string> = {
  indicacao: "Indicação",
  whatsapp: "WhatsApp",
  portal: "Portal imobiliário",
  site: "Site",
  ligacao: "Ligação",
  rede_social: "Rede social",
  outro: "Outro",
};

function localDate(value: Date | string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleDateString("pt-BR");
}

function money(value: string | null) {
  if (!value || !Number.isFinite(Number(value))) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value));
}

function normalizeMatchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function localDateTimeNow() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function localDateTimeValue(value: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function LeadCRM({
  initialLeads,
  initialActivities,
  properties,
  onOpenProperty,
  currentUserId,
}: {
  initialLeads: LeadItem[];
  initialActivities: LeadActivityItem[];
  properties: LeadMatchProperty[];
  onOpenProperty: (propertyId: string) => void;
  currentUserId: string | null;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [activities, setActivities] = useState(initialActivities);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadItem | null>(null);
  const [visitProperty, setVisitProperty] = useState<LeadMatchProperty | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || null;
  const matchedProperties = useMemo(() => {
    if (!selectedLead || !["comprador", "locatario"].includes(selectedLead.leadType)) return [];
    const city = normalizeMatchText(selectedLead.city || "");
    const type = normalizeMatchText(selectedLead.propertyType || "");
    const neighborhoods = (selectedLead.neighborhoods || []).map(normalizeMatchText).filter(Boolean);
    const budget = Number(selectedLead.maxBudget || 0);
    const expectedPurpose = selectedLead.leadType === "locatario" ? "aluguel" : "venda";

    return properties
      .filter((property) => {
        if (property.status !== "disponivel") return false;
        if (property.purpose && property.purpose !== expectedPurpose) return false;
        if (city && normalizeMatchText(property.city) !== city) return false;
        if (budget && Number(property.salePrice) > budget) return false;
        if (selectedLead.minBedrooms && property.bedrooms < selectedLead.minBedrooms) return false;
        return true;
      })
      .map((property) => {
        let score = 40;
        const propertyType = normalizeMatchText(property.propertyType);
        if (type && (propertyType.includes(type) || type.includes(propertyType))) score += 25;
        if (budget && Number(property.salePrice) <= budget) score += 20;
        if (selectedLead.minBedrooms && property.bedrooms >= selectedLead.minBedrooms) score += 10;
        if (neighborhoods.some((area) => normalizeMatchText(property.neighborhood).includes(area) || area.includes(normalizeMatchText(property.neighborhood)))) score += 20;
        return { property, score: Math.min(100, score) };
      })
      .sort((a, b) => b.score - a.score || Number(a.property.salePrice) - Number(b.property.salePrice))
      .slice(0, 5);
  }, [properties, selectedLead]);
  const visibleLeads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return leads.filter((lead) => {
      if (stageFilter !== "todos" && lead.stage !== stageFilter) return false;
      if (!query) return true;
      return [lead.fullName, lead.phone, lead.email || "", lead.city || "", ...(lead.neighborhoods || [])]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(query));
    });
  }, [leads, search, stageFilter]);

  const overdueCount = leads.filter((lead) =>
    lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now()
    && !["fechado", "perdido"].includes(lead.stage)
  ).length;

  async function changeStage(lead: LeadItem, stage: string) {
    setError(null);
    let lostReason: string | undefined;
    if (stage === "perdido") {
      lostReason = window.prompt("Qual foi o motivo da perda?")?.trim() || undefined;
      if (!lostReason) return;
    }
    setBusy(true);
    try {
      const result = await updateLeadStage(lead.id, stage, lostReason);
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, stage: result.lead.stage, lostReason: result.lead.lostReason, updatedAt: result.lead.updatedAt } : item));
      setActivities((current) => [{
        id: result.activity.id,
        leadId: lead.id,
        userId: result.activity.userId,
        activityType: result.activity.activityType,
        description: result.activity.description,
        occurredAt: result.activity.occurredAt,
      }, ...current]);
      setSelectedLeadId(lead.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a etapa.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextActionAtValue = String(form.get("nextActionAt") || "");
    try {
      const leadData = {
        fullName: String(form.get("fullName") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        leadType: String(form.get("leadType") || "comprador"),
        source: String(form.get("source") || "outro"),
        propertyType: String(form.get("propertyType") || ""),
        city: String(form.get("city") || ""),
        neighborhoods: String(form.get("neighborhoods") || "").split(",").map((item) => item.trim()).filter(Boolean),
        maxBudget: String(form.get("maxBudget") || ""),
        minBedrooms: Number(form.get("minBedrooms") || 0) || undefined,
        notes: String(form.get("notes") || ""),
        nextAction: String(form.get("nextAction") || ""),
        nextActionAt: nextActionAtValue ? new Date(nextActionAtValue).toISOString() : "",
      };
      const result = editingLead
        ? await updateLead(editingLead.id, leadData)
        : await createLead(leadData);
      const lead: LeadItem = { ...result.lead, neighborhoods: (result.lead.neighborhoods as string[]) || [] };
      setLeads((current) => editingLead
        ? current.map((item) => item.id === lead.id ? lead : item)
        : [lead, ...current]);
      setActivities((current) => [{
        id: result.activity.id,
        leadId: lead.id,
        userId: result.activity.userId,
        activityType: result.activity.activityType,
        description: result.activity.description,
        occurredAt: result.activity.occurredAt,
      }, ...current]);
      setIsCreateOpen(false);
      setEditingLead(null);
      setSelectedLeadId(lead.id);
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    } finally {
      setBusy(false);
    }
  }

  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    setBusy(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const activityType = String(form.get("activityType") || "nota");
    const description = String(form.get("description") || "");
    const nextAction = String(form.get("nextAction") || "");
    const nextActionAtValue = String(form.get("nextActionAt") || "");
    const nextActionAt = nextActionAtValue ? new Date(nextActionAtValue).toISOString() : "";
    try {
      const result = await addLeadActivity({ leadId: selectedLead.id, activityType, description, nextAction, nextActionAt });
      const activity: LeadActivityItem = { ...result.activity, leadId: selectedLead.id };
      setActivities((current) => [activity, ...current]);
      setLeads((current) => current.map((lead) => lead.id === selectedLead.id ? {
        ...lead,
        nextAction: nextAction || null,
        nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        lastContactAt: activityType === "nota" ? lead.lastContactAt : new Date(),
        updatedAt: new Date(),
      } : lead));
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a atividade.");
    } finally {
      setBusy(false);
    }
  }

  async function submitVisitDvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead || !visitProperty || !currentUserId) return;
    const form = new FormData(event.currentTarget);
    const visitDateValue = String(form.get("visitDate") || "");
    setBusy(true);
    setError(null);
    try {
      const result = await createDvpCertificate({
        propertyId: visitProperty.id,
        captorBrokerId: visitProperty.brokerId,
        partnerBrokerId: currentUserId,
        leadId: selectedLead.id,
        clientName: selectedLead.fullName,
        clientPhone: selectedLead.phone,
        clientCpfPartial: String(form.get("clientCpfPartial") || ""),
        visitDate: visitDateValue ? new Date(visitDateValue).toISOString() : "",
        commissionSplit: visitProperty.splitPercentage || "50.00",
      });
      if (result.activity) {
        const activity: LeadActivityItem = { ...result.activity, leadId: selectedLead.id };
        setActivities((current) => [activity, ...current]);
        setLeads((current) => current.map((lead) => lead.id === selectedLead.id ? {
          ...lead,
          stage: result.lead?.stage || lead.stage,
          lastContactAt: new Date(),
          nextAction: "Confirmar visita e aceite do DVP",
          nextActionAt: visitDateValue ? new Date(visitDateValue) : null,
          updatedAt: new Date(),
        } : lead));
      }
      setVisitProperty(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o DVP.");
    } finally {
      setBusy(false);
    }
  }

  const selectClass = "rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none";
  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider"><UserRound className="w-4 h-4" /> CRM de Leads</div>
          <h2 className="mt-2 text-2xl font-extrabold text-white">Acompanhe cada oportunidade</h2>
          <p className="mt-1 text-sm text-slate-400">Seus contatos e histórico ficam privados na sua carteira.</p>
        </div>
        <button onClick={() => { setError(null); setEditingLead(null); setIsCreateOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">
          <Plus className="w-4 h-4" /> Novo lead
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Na carteira</div><div className="mt-1 text-2xl font-bold text-white">{leads.length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Em andamento</div><div className="mt-1 text-2xl font-bold text-amber-400">{leads.filter((lead) => !["fechado", "perdido"].includes(lead.stage)).length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Visitas</div><div className="mt-1 text-2xl font-bold text-sky-400">{leads.filter((lead) => lead.stage === "visita").length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Retornos atrasados</div><div className={`mt-1 text-2xl font-bold ${overdueCount ? "text-rose-400" : "text-emerald-400"}`}>{overdueCount}</div></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, e-mail ou bairro" className={`${inputClass} pl-9`} />
        </label>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className={`${selectClass} sm:w-52`} aria-label="Filtrar etapa">
          <option value="todos">Todas as etapas</option>
          {stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
        </select>
      </div>

      {error && !isCreateOpen && !editingLead && !visitProperty && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-14 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-500" />
          <h3 className="mt-4 text-lg font-bold text-white">Sua carteira começa aqui</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Cadastre um contato, defina a próxima ação e acompanhe cada etapa até a conclusão.</p>
          <button onClick={() => setIsCreateOpen(true)} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"><Plus className="mr-1 inline h-4 w-4" /> Cadastrar primeiro lead</button>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-3">
          <div className="grid min-w-[1760px] grid-cols-8 gap-3">
            {stages.map((stage) => {
              const stageLeads = visibleLeads.filter((lead) => lead.stage === stage.key);
              return (
                <div key={stage.key} className="min-h-72 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-800 px-1 pb-2">
                    <h3 className="text-xs font-bold text-slate-200">{stage.label}</h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.map((lead) => {
                      const budget = money(lead.maxBudget);
                      const isOverdue = lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now() && !["fechado", "perdido"].includes(lead.stage);
                      return (
                        <article key={lead.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-sm">
                          <button onClick={() => { setSelectedLeadId(lead.id); setError(null); }} className="w-full text-left">
                            <div className="truncate text-sm font-bold text-white">{lead.fullName}</div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" /> {lead.phone}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">{LEAD_TYPE_LABELS[lead.leadType] || lead.leadType}</span>
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{LEAD_SOURCE_LABELS[lead.source] || lead.source}</span>
                            </div>
                            {budget && <div className="mt-2 text-xs font-semibold text-emerald-400">Até {budget}</div>}
                            {(lead.city || lead.neighborhoods?.length > 0) && <div className="mt-1 truncate text-[11px] text-slate-400">{[lead.neighborhoods?.join(", "), lead.city].filter(Boolean).join(" • ")}</div>}
                            {lead.nextAction && <div className={`mt-2 flex items-start gap-1.5 border-t border-slate-800 pt-2 text-[11px] ${isOverdue ? "text-rose-300" : "text-amber-300"}`}><CalendarClock className="mt-0.5 h-3 w-3 shrink-0" /><span>{lead.nextAction} · {localDate(lead.nextActionAt)}</span></div>}
                          </button>
                          <select value={lead.stage} onChange={(event) => changeStage(lead, event.target.value)} disabled={busy} className="mt-3 w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300 disabled:opacity-50" aria-label={`Etapa de ${lead.fullName}`}>
                            {stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                        </article>
                      );
                    })}
                    {stageLeads.length === 0 && <div className="px-1 py-3 text-center text-[10px] text-slate-600">Nenhum lead</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isCreateOpen || editingLead) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-6">
          <form key={editingLead?.id || "novo-lead"} onSubmit={submitNewLead} className="my-auto w-full max-w-2xl space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-bold uppercase tracking-wide text-amber-400">{editingLead ? "Atualizar oportunidade" : "Nova oportunidade"}</div><h3 className="mt-1 text-xl font-extrabold text-white">{editingLead ? "Editar lead" : "Cadastrar lead"}</h3></div>
              <button type="button" onClick={() => { setIsCreateOpen(false); setEditingLead(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Nome *<input name="fullName" required maxLength={120} autoFocus defaultValue={editingLead?.fullName || ""} className={`${inputClass} mt-1`} placeholder="Nome da pessoa" /></label>
              <label className="text-xs font-semibold text-slate-300">Telefone com DDD *<input name="phone" type="tel" required defaultValue={editingLead?.phone || ""} className={`${inputClass} mt-1`} placeholder="(11) 99999-9999" /></label>
              <label className="text-xs font-semibold text-slate-300">E-mail<input name="email" type="email" defaultValue={editingLead?.email || ""} className={`${inputClass} mt-1`} placeholder="nome@email.com" /></label>
              <label className="text-xs font-semibold text-slate-300">Tipo de lead<select name="leadType" defaultValue={editingLead?.leadType || "comprador"} className={`${inputClass} mt-1`}>{leadTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-300">Como chegou<select name="source" defaultValue={editingLead?.source || "outro"} className={`${inputClass} mt-1`}>{sources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-300">Tipo de imóvel<input name="propertyType" defaultValue={editingLead?.propertyType || ""} className={`${inputClass} mt-1`} placeholder="Apartamento, casa..." /></label>
              <label className="text-xs font-semibold text-slate-300">Cidade<input name="city" defaultValue={editingLead?.city || ""} className={`${inputClass} mt-1`} placeholder="São Paulo" /></label>
              <label className="text-xs font-semibold text-slate-300">Bairros de interesse<input name="neighborhoods" defaultValue={editingLead?.neighborhoods?.join(", ") || ""} className={`${inputClass} mt-1`} placeholder="Moema, Pinheiros" /></label>
              <label className="text-xs font-semibold text-slate-300">Orçamento máximo (R$)<input name="maxBudget" type="number" min="1" step="0.01" defaultValue={editingLead?.maxBudget || ""} className={`${inputClass} mt-1`} placeholder="Ex.: 850000" /></label>
              <label className="text-xs font-semibold text-slate-300">Quartos mínimos<input name="minBedrooms" type="number" min="1" max="20" defaultValue={editingLead?.minBedrooms || ""} className={`${inputClass} mt-1`} placeholder="2" /></label>
              <label className="text-xs font-semibold text-slate-300">Próxima ação<input name="nextAction" maxLength={160} defaultValue={editingLead?.nextAction || ""} className={`${inputClass} mt-1`} placeholder="Ligar para confirmar preferências" /></label>
              <label className="text-xs font-semibold text-slate-300">Quando retornar<input name="nextActionAt" type="datetime-local" defaultValue={localDateTimeValue(editingLead?.nextActionAt || null)} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Observações<textarea name="notes" maxLength={3000} rows={3} defaultValue={editingLead?.notes || ""} className={`${inputClass} mt-1 resize-y`} placeholder="Preferências, prazo de compra, forma de pagamento..." /></label>
            </div>
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button type="button" onClick={() => { setIsCreateOpen(false); setEditingLead(null); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancelar</button>
              <button disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{busy ? "Salvando..." : editingLead ? "Salvar alterações" : "Salvar lead"}</button>
            </div>
          </form>
        </div>
      )}

      {visitProperty && selectedLead && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={submitVisitDvp} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs font-bold uppercase tracking-wide text-emerald-300">DVP · registro de visita</div><h3 className="mt-1 text-lg font-extrabold text-white">{selectedLead.fullName}</h3><p className="mt-1 text-xs text-slate-400">{visitProperty.title}</p></div>
              <button type="button" onClick={() => setVisitProperty(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs font-semibold text-slate-300">Data e horário da visita<input name="visitDate" type="datetime-local" required defaultValue={localDateTimeNow()} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-semibold text-slate-300">CPF parcial do cliente<input name="clientCpfPartial" type="text" required pattern="\*{3}\.\d{3}\.\d{3}-\*{2}" maxLength={14} placeholder="***.123.456-**" className={`${inputClass} mt-1 font-mono`} /></label>
            <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100/80">O registro fica como rascunho até ser validado e aceito pelas partes. Ele não equivale a assinatura eletrônica nem substitui orientação jurídica.</p>
            {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button type="button" onClick={() => setVisitProperty(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Cancelar</button>
              <button disabled={busy} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{busy ? "Registrando..." : "Criar DVP em rascunho"}</button>
            </div>
          </form>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLeadId(null); }}>
          <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 p-5">
              <div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-amber-400">{LEAD_TYPE_LABELS[selectedLead.leadType] || selectedLead.leadType} · {LEAD_SOURCE_LABELS[selectedLead.source] || selectedLead.source}</div><h3 className="mt-1 truncate text-xl font-extrabold text-white">{selectedLead.fullName}</h3><a className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-amber-300" href={`tel:${selectedLead.phone}`}><Phone className="h-3.5 w-3.5" />{selectedLead.phone}</a>{selectedLead.email && <div className="mt-1 text-xs text-slate-400">{selectedLead.email}</div>}</div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => { setEditingLead(selectedLead); setIsCreateOpen(false); setError(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Editar lead"><Pencil className="h-3.5 w-3.5" />Editar</button>
                <button onClick={() => setSelectedLeadId(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs">
                <div><div className="text-slate-500">Orçamento máximo</div><div className="mt-1 font-semibold text-emerald-300">{money(selectedLead.maxBudget) || "Não informado"}</div></div>
                <div><div className="text-slate-500">Busca</div><div className="mt-1 font-semibold text-slate-200">{[selectedLead.propertyType, selectedLead.city].filter(Boolean).join(" · ") || "Não informada"}</div></div>
                <div className="col-span-2"><div className="text-slate-500">Bairros</div><div className="mt-1 font-semibold text-slate-200">{selectedLead.neighborhoods?.join(", ") || "Não informados"}</div></div>
                <div><div className="text-slate-500">Último contato</div><div className="mt-1 font-semibold text-slate-200">{localDate(selectedLead.lastContactAt)}</div></div>
                <div><div className="text-slate-500">Próximo retorno</div><div className="mt-1 font-semibold text-amber-300">{selectedLead.nextAction ? `${selectedLead.nextAction} · ${localDate(selectedLead.nextActionAt)}` : "Não agendado"}</div></div>
              {selectedLead.notes && <div className="col-span-2 border-t border-slate-800 pt-3"><div className="text-slate-500">Observações</div><div className="mt-1 whitespace-pre-wrap text-slate-300">{selectedLead.notes}</div></div>}
                {selectedLead.lostReason && <div className="col-span-2 border-t border-slate-800 pt-3"><div className="text-slate-500">Motivo da perda</div><div className="mt-1 text-slate-300">{selectedLead.lostReason}</div></div>}
              </div>

              {selectedLead.leadType !== "parceiro" && selectedLead.leadType !== "proprietario" && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-white"><Building2 className="h-4 w-4 text-amber-400" />Imóveis compatíveis</h4>
                    <span className="text-[11px] text-slate-500">Vitrine · até 5 resultados</span>
                  </div>
                  {matchedProperties.length ? matchedProperties.map(({ property, score }) => (
                    <article key={property.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                      {property.coverPhoto ? <img src={property.coverPhoto} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-800"><Building2 className="h-6 w-6 text-slate-500" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-white">{property.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" />{property.neighborhood} · {property.city}</div>
                        <div className="mt-1 text-[11px] font-semibold text-emerald-300">{money(property.salePrice)} · {property.bedrooms} quartos · compatibilidade {score}%</div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 self-center">
                        <button type="button" onClick={() => onOpenProperty(property.id)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-slate-800">Abrir na Vitrine</button>
                        {property.acceptsPartnership && property.brokerId !== currentUserId && currentUserId && <button type="button" onClick={() => { setVisitProperty(property); setError(null); }} className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/25">Registrar visita</button>}
                      </div>
                    </article>
                  )) : (
                    <p className="rounded-xl border border-dashed border-slate-700 px-4 py-5 text-center text-xs text-slate-500">Nenhum imóvel disponível atende aos critérios atuais deste lead. Revise as preferências ou confira a Vitrine.</p>
                  )}
                </section>
              )}

              <form onSubmit={submitActivity} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h4 className="text-sm font-bold text-white">Registrar contato e próxima ação</h4>
                <div className="grid grid-cols-2 gap-2">
                  <select name="activityType" className={selectClass}>{activityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input name="nextAction" maxLength={160} className={inputClass} placeholder="Próxima ação" />
                </div>
                <input name="nextActionAt" type="datetime-local" className={inputClass} aria-label="Data do próximo retorno" />
                <textarea name="description" required minLength={2} maxLength={2000} rows={2} className={`${inputClass} resize-y`} placeholder="O que aconteceu neste contato?" />
                {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
                <button disabled={busy} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">{busy ? "Salvando..." : "Salvar na linha do tempo"}</button>
              </form>

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Clock3 className="h-4 w-4 text-amber-400" /> Histórico</h4>
                <div className="space-y-3">
                  {activities.filter((activity) => activity.leadId === selectedLead.id).map((activity) => (
                    <div key={activity.id} className="relative border-l border-slate-700 pl-4">
                      <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold capitalize text-slate-200">{activity.activityType.replaceAll("_", " ")}</span><time className="text-[10px] text-slate-500">{new Date(activity.occurredAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time></div>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{activity.description}</p>
                    </div>
                  ))}
                  {activities.every((activity) => activity.leadId !== selectedLead.id) && <p className="text-xs text-slate-500">Nenhuma atividade registrada.</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-800 p-4 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Dados privados da sua carteira</div>
          </aside>
        </div>
      )}
    </section>
  );
}
