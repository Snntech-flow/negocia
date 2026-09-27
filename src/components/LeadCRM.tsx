"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { Building2, CalendarClock, CheckCircle2, Clock3, Download, FileUp, MapPin, Pencil, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { addLeadActivity, completeLeadFollowUp, createDvpCertificate, createLead, importLeadsCsv, updateLead, updateLeadStage } from "@/lib/actions";

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

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

type CsvLeadRow = { fullName: string; phone: string; email?: string; leadType?: string; source?: string; propertyType?: string; city?: string; neighborhoods?: string; maxBudget?: string; minBedrooms?: string; notes?: string };

function parseCsv(text: string): CsvLeadRow[] {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos um contato.");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const headers = rows[0].map(normalize);
  const aliases: Record<string, string[]> = { fullName: ["nome", "nome_completo", "fullname"], phone: ["telefone", "celular", "phone"], email: ["email", "e_mail"], leadType: ["tipo", "tipo_de_lead", "leadtype"], source: ["origem", "source"], propertyType: ["tipo_de_imovel", "imovel", "propertytype"], city: ["cidade", "city"], neighborhoods: ["bairros", "bairro", "neighborhoods"], maxBudget: ["orcamento", "orcamento_maximo", "maxbudget"], minBedrooms: ["quartos", "quartos_minimos", "minbedrooms"], notes: ["observacoes", "notas", "notes"] };
  const value = (values: string[], key: string) => {
    const names = aliases[key] || [];
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? values[index] || "" : "";
  };
  const mapped = rows.slice(1).map((values) => ({
    fullName: value(values, "fullName"), phone: value(values, "phone"), email: value(values, "email"),
    leadType: value(values, "leadType"), source: value(values, "source"), propertyType: value(values, "propertyType"),
    city: value(values, "city"), neighborhoods: value(values, "neighborhoods"), maxBudget: value(values, "maxBudget"),
    minBedrooms: value(values, "minBedrooms"), notes: value(values, "notes"),
  }));
  if (!headers.some((header) => aliases.fullName.includes(header)) || !headers.some((header) => aliases.phone.includes(header))) throw new Error("Inclua as colunas obrigatórias Nome e Telefone.");
  return mapped;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/([,;])/g, "\\$1");
}

function foldIcsLine(value: string) {
  const parts: string[] = [];
  let line = "";
  let bytes = 0;
  for (const character of value) {
    const size = new TextEncoder().encode(character).length;
    const limit = line.startsWith(" ") ? 74 : 75;
    if (bytes + size > limit) {
      parts.push(line);
      line = ` ${character}`;
      bytes = 1 + size;
    } else {
      line += character;
      bytes += size;
    }
  }
  parts.push(line);
  return parts.join("\r\n");
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
  const [typeFilter, setTypeFilter] = useState("todos");
  const [sourceFilter, setSourceFilter] = useState("todos");
  const [cityFilter, setCityFilter] = useState("todas");
  const [followUpFilter, setFollowUpFilter] = useState("todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadItem | null>(null);
  const [visitProperty, setVisitProperty] = useState<LeadMatchProperty | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

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
        const reasons: string[] = ["Imóvel disponível", expectedPurpose === "aluguel" ? "Finalidade: aluguel" : "Finalidade: venda"];
        let score = 0;
        let weight = 0;
        const propertyType = normalizeMatchText(property.propertyType);
        const typeMatches = !type || propertyType.includes(type) || type.includes(propertyType);
        if (type) { weight += 30; if (typeMatches) { score += 30; reasons.push(`Tipo compatível: ${property.propertyType}`); } }
        if (budget) { weight += 30; score += 30; reasons.push(`Dentro do orçamento: ${money(property.salePrice)} de até ${money(selectedLead.maxBudget)}`); }
        if (selectedLead.minBedrooms) { weight += 20; score += 20; reasons.push(`${property.bedrooms} quartos (mínimo ${selectedLead.minBedrooms})`); }
        if (city) { weight += 10; score += 10; reasons.push(`Cidade: ${property.city}`); }
        const neighborhoodMatches = neighborhoods.some((area) => normalizeMatchText(property.neighborhood).includes(area) || area.includes(normalizeMatchText(property.neighborhood)));
        if (neighborhoods.length) {
          weight += 10;
          if (neighborhoodMatches) { score += 10; reasons.push(`Bairro de interesse: ${property.neighborhood}`); }
        }
        if (!weight) { weight = 1; score = 1; }
        return { property, score: Math.round((score / weight) * 100), reasons, typeMatches, neighborhoodMatches };
      })
      .sort((a, b) => b.score - a.score || Number(a.property.salePrice) - Number(b.property.salePrice))
      .slice(0, 5);
  }, [properties, selectedLead]);
  const visibleLeads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return leads.filter((lead) => {
      if (stageFilter !== "todos" && lead.stage !== stageFilter) return false;
      if (typeFilter !== "todos" && lead.leadType !== typeFilter) return false;
      if (sourceFilter !== "todos" && lead.source !== sourceFilter) return false;
      if (cityFilter !== "todas" && normalizeMatchText(lead.city || "") !== normalizeMatchText(cityFilter)) return false;
      const followUpTime = lead.nextActionAt ? new Date(lead.nextActionAt).getTime() : null;
      if (followUpFilter === "atrasados" && (!followUpTime || followUpTime >= Date.now() || ["fechado", "perdido"].includes(lead.stage))) return false;
      if (followUpFilter === "agendados" && (!followUpTime || followUpTime < Date.now())) return false;
      if (followUpFilter === "sem_agenda" && followUpTime) return false;
      if (!query) return true;
      return [lead.fullName, lead.phone, lead.email || "", lead.city || "", ...(lead.neighborhoods || [])]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(query));
    });
  }, [leads, search, stageFilter, typeFilter, sourceFilter, cityFilter, followUpFilter]);

  const availableCities = Array.from(new Set(leads.map((lead) => lead.city?.trim()).filter((city): city is string => Boolean(city)))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const overdueCount = leads.filter((lead) =>
    lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now()
    && !["fechado", "perdido"].includes(lead.stage)
  ).length;
  const closedCount = leads.filter((lead) => lead.stage === "fechado").length;
  const lostCount = leads.filter((lead) => lead.stage === "perdido").length;
  const resolvedCount = closedCount + lostCount;
  const closeRate = resolvedCount ? Math.round((closedCount / resolvedCount) * 100) : 0;
  const sourceDistribution = sources
    .map(([key, label]) => ({ key, label, count: leads.filter((lead) => lead.source === key).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const agendaNow = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  const agendaLeads = leads
    .filter((lead) => lead.nextActionAt && !["fechado", "perdido"].includes(lead.stage))
    .sort((a, b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime());
  const followUpGroups = [
    { key: "overdue", label: "Atrasados", tone: "text-rose-300", items: agendaLeads.filter((lead) => new Date(lead.nextActionAt!).getTime() < agendaNow) },
    { key: "today", label: "Hoje", tone: "text-amber-300", items: agendaLeads.filter((lead) => new Date(lead.nextActionAt!).getTime() >= agendaNow && new Date(lead.nextActionAt!).getTime() <= todayEnd.getTime()) },
    { key: "upcoming", label: "Próximos 7 dias", tone: "text-sky-300", items: agendaLeads.filter((lead) => new Date(lead.nextActionAt!).getTime() > todayEnd.getTime() && new Date(lead.nextActionAt!).getTime() <= weekEnd.getTime()) },
  ];

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

  async function completeFollowUp(lead: LeadItem) {
    setBusy(true);
    setError(null);
    try {
      const result = await completeLeadFollowUp(lead.id);
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...result.lead, neighborhoods: (result.lead.neighborhoods as string[]) || [] } : item));
      setActivities((current) => [{ ...result.activity, leadId: lead.id }, ...current]);
      setNotice(`Retorno de ${lead.fullName} concluído e salvo no histórico.`);
      window.setTimeout(() => setNotice(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o retorno.");
    } finally {
      setBusy(false);
    }
  }

  function exportVisibleLeads() {
    const headers = ["Nome", "Telefone", "E-mail", "Tipo", "Etapa", "Origem", "Tipo de imóvel", "Cidade", "Bairros", "Orçamento máximo", "Quartos mínimos", "Próxima ação", "Data do retorno", "Último contato", "Observações", "Motivo da perda"];
    const rows = visibleLeads.map((lead) => [
      lead.fullName,
      lead.phone,
      lead.email,
      LEAD_TYPE_LABELS[lead.leadType] || lead.leadType,
      stages.find((stage) => stage.key === lead.stage)?.label || lead.stage,
      LEAD_SOURCE_LABELS[lead.source] || lead.source,
      lead.propertyType,
      lead.city,
      lead.neighborhoods.join(", "),
      lead.maxBudget,
      lead.minBedrooms,
      lead.nextAction,
      lead.nextActionAt ? new Date(lead.nextActionAt).toLocaleString("pt-BR") : "",
      lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString("pt-BR") : "",
      lead.notes,
      lead.lostReason,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `negocia-lar-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${visibleLeads.length} leads exportados para CSV.`);
    window.setTimeout(() => setNotice(null), 5000);
  }

  function exportAgendaIcs() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const events = agendaLeads.map((lead) => {
      const start = new Date(lead.nextActionAt!);
      const end = new Date(start.getTime() + 30 * 60_000);
      const formatUtc = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      return [
        "BEGIN:VEVENT",
        `UID:${lead.id}-retorno@negocialar.com.br`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatUtc(start)}`,
        `DTEND:${formatUtc(end)}`,
        `SUMMARY:${escapeIcsText(`Retorno: ${lead.fullName}`)}`,
        `DESCRIPTION:${escapeIcsText(lead.nextAction || "Retorno de lead no Negocia Lar")}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ];
    }).flat();
    const calendarLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Negocia Lar//CRM Retornos//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Negocia Lar - Retornos CRM",
      ...events,
      "END:VCALENDAR",
    ];
    const contents = calendarLines.map(foldIcsLine).join("\r\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `negocia-lar-retornos-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${agendaLeads.length} retornos preparados para importar no seu calendário.`);
    window.setTimeout(() => setNotice(null), 5000);
  }

  async function handleCsvFile(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      if (file.size > 1_000_000) throw new Error("O arquivo deve ter até 1 MB.");
      const rows = parseCsv(await file.text());
      const result = await importLeadsCsv(rows);
      setLeads((current) => [...result.leads.map((lead) => ({ ...lead, neighborhoods: (lead.neighborhoods as string[]) || [] })), ...current]);
      setActivities((current) => [...result.activities, ...current]);
      setNotice(`${result.imported} leads importados${result.duplicates ? `; ${result.duplicates} telefones duplicados foram ignorados` : ""}.`);
      setCsvImportOpen(false);
      window.setTimeout(() => setNotice(null), 7000);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível importar o CSV."); }
    finally { setBusy(false); }
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
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setError(null); setCsvImportOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-500 hover:bg-slate-800"><FileUp className="h-4 w-4" /> Importar CSV</button>
          <button onClick={() => { setError(null); setEditingLead(null); setIsCreateOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"><Plus className="w-4 h-4" /> Novo lead</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Na carteira</div><div className="mt-1 text-2xl font-bold text-white">{leads.length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Em andamento</div><div className="mt-1 text-2xl font-bold text-amber-400">{leads.filter((lead) => !["fechado", "perdido"].includes(lead.stage)).length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Visitas</div><div className="mt-1 text-2xl font-bold text-sky-400">{leads.filter((lead) => lead.stage === "visita").length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Fechados</div><div className="mt-1 text-2xl font-bold text-emerald-400">{closedCount}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Taxa entre encerrados</div><div className="mt-1 text-2xl font-bold text-emerald-300">{closeRate}%</div><div className="mt-1 text-[10px] text-slate-500">{closedCount} ganhos · {lostCount} perdidos</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-400">Retornos atrasados</div><div className={`mt-1 text-2xl font-bold ${overdueCount ? "text-rose-400" : "text-emerald-400"}`}>{overdueCount}</div></div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-white">Leads por origem</h3><p className="mt-1 text-[11px] text-slate-500">Distribuição da sua carteira; a taxa usa leads fechados ou perdidos.</p></div><span className="text-[11px] text-slate-500">{leads.length} leads</span></div>
        {sourceDistribution.length ? (
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {sourceDistribution.map((source) => (
              <div key={source.key}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="text-slate-300">{source.label}</span><span className="text-slate-500">{source.count} · {Math.round((source.count / leads.length) * 100)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(5, (source.count / leads.length) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-xs text-slate-500">Cadastre leads para acompanhar quais origens trazem mais oportunidades.</p>}
      </section>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, e-mail ou bairro" className={`${inputClass} pl-9`} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className={selectClass} aria-label="Filtrar etapa">
            <option value="todos">Todas as etapas</option>
            {stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass} aria-label="Filtrar tipo de lead">
            <option value="todos">Todos os tipos</option>
            {leadTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className={selectClass} aria-label="Filtrar origem">
            <option value="todos">Todas as origens</option>
            {sources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className={selectClass} aria-label="Filtrar cidade">
            <option value="todas">Todas as cidades</option>
            {availableCities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)} className={selectClass} aria-label="Filtrar retornos">
            <option value="todos">Qualquer retorno</option>
            <option value="atrasados">Retorno atrasado</option>
            <option value="agendados">Retorno agendado</option>
            <option value="sem_agenda">Sem retorno</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>Exibindo {visibleLeads.length} de {leads.length} leads</span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {visibleLeads.length > 0 && <button type="button" onClick={exportVisibleLeads} className="font-semibold text-emerald-300 hover:text-emerald-200">Exportar seleção CSV</button>}
            {(search || stageFilter !== "todos" || typeFilter !== "todos" || sourceFilter !== "todos" || cityFilter !== "todas" || followUpFilter !== "todos") && <button type="button" onClick={() => { setSearch(""); setStageFilter("todos"); setTypeFilter("todos"); setSourceFilter("todos"); setCityFilter("todas"); setFollowUpFilter("todos"); }} className="font-semibold text-amber-300 hover:text-amber-200">Limpar filtros</button>}
          </div>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="flex items-center gap-2 text-sm font-bold text-white"><CalendarClock className="h-4 w-4 text-amber-400" />Agenda de retornos</h3><p className="mt-1 text-[11px] text-slate-500">Ações agendadas nos seus leads; selecione uma para abrir o perfil.</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300">{agendaLeads.length} agendados</span>
            <button type="button" onClick={exportAgendaIcs} disabled={!agendaLeads.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="Baixar agenda para importar no calendário"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Baixar .ics</span></button>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {followUpGroups.map((group) => (
            <div key={group.key} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2 flex items-center justify-between"><h4 className={`text-xs font-bold ${group.tone}`}>{group.label}</h4><span className="text-[10px] text-slate-500">{group.items.length}</span></div>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {group.items.length ? group.items.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-1">
                    <button type="button" onClick={() => { setSelectedLeadId(lead.id); setError(null); }} className="min-w-0 flex-1 rounded-lg border border-slate-800 px-2.5 py-2 text-left hover:border-slate-600 hover:bg-slate-900">
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-200">{lead.fullName}</span><time className="shrink-0 text-[10px] text-slate-500">{new Date(lead.nextActionAt!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time></div>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{lead.nextAction || "Retorno agendado"}</p>
                    </button>
                    <button type="button" disabled={busy} onClick={() => completeFollowUp(lead)} className="rounded-lg border border-emerald-500/30 p-2 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50" aria-label={`Concluir retorno de ${lead.fullName}`} title="Marcar retorno como concluído"><CheckCircle2 className="h-4 w-4" /></button>
                  </div>
                )) : <p className="rounded-lg border border-dashed border-slate-800 px-2.5 py-4 text-center text-[10px] text-slate-600">Nenhum retorno neste período.</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {notice && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && !isCreateOpen && !editingLead && !visitProperty && !csvImportOpen && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {csvImportOpen && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-amber-400">CRM · Importação</div><h3 className="mt-1 text-lg font-extrabold text-white">Importar contatos por CSV</h3></div><button type="button" onClick={() => setCsvImportOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800" aria-label="Fechar"><X className="h-5 w-5" /></button></div>
          <p className="text-xs leading-relaxed text-slate-400">Use um arquivo CSV separado por vírgula ou ponto e vírgula. Colunas obrigatórias: <b className="text-slate-200">Nome</b> e <b className="text-slate-200">Telefone</b>. Aceita também e-mail, tipo, origem, tipo de imóvel, cidade, bairros, orçamento, quartos e observações. Até 100 linhas; contatos repetidos pelo telefone serão ignorados.</p>
          <button type="button" onClick={() => { const content = '\uFEFFNome;Telefone;E-mail;Tipo;Origem;Tipo de imóvel;Cidade;Bairros;Orçamento máximo;Quartos mínimos;Observações\r\nMaria Exemplo;(11) 99999-0000;maria@email.com;Comprador;Indicação;Apartamento;São Paulo;Moema|Pinheiros;850000;2;Prefere andar alto'; const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'modelo-importacao-negocia-lar.csv'; a.click(); URL.revokeObjectURL(url); }} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Baixar modelo CSV</button>
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-5 text-sm font-bold text-white hover:border-amber-400 hover:bg-slate-800 ${busy ? "pointer-events-none opacity-50" : ""}`}><FileUp className="h-4 w-4" />{busy ? "Importando e validando…" : "Selecionar arquivo .csv"}<input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(event) => { void handleCsvFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">{error}</p>}
          <div className="flex justify-end border-t border-slate-800 pt-3"><button type="button" onClick={() => setCsvImportOpen(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Fechar</button></div>
        </div>
      </div>}

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-14 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-500" />
          <h3 className="mt-4 text-lg font-bold text-white">Sua carteira começa aqui</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Cadastre um contato, defina a próxima ação e acompanhe cada etapa até a conclusão.</p>
          <button onClick={() => setIsCreateOpen(true)} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"><Plus className="mr-1 inline h-4 w-4" /> Cadastrar primeiro lead</button>
        </div>
      ) : (
        <>
        <div className="space-y-2 lg:hidden">
          {visibleLeads.length ? visibleLeads.map((lead) => {
            const budget = money(lead.maxBudget);
            const isOverdue = lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now() && !["fechado", "perdido"].includes(lead.stage);
            return (
              <article key={lead.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
                <button type="button" onClick={() => { setSelectedLeadId(lead.id); setError(null); }} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-bold text-white">{lead.fullName}</span><span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{stages.find((stage) => stage.key === lead.stage)?.label || lead.stage}</span></div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{lead.phone}</div>
                  {(lead.city || lead.neighborhoods?.length > 0) && <div className="mt-1 truncate text-[11px] text-slate-400">{[lead.neighborhoods?.join(", "), lead.city].filter(Boolean).join(" • ")}</div>}
                  {budget && <div className="mt-1 text-xs font-semibold text-emerald-400">Até {budget}</div>}
                  {lead.nextAction && <div className={`mt-2 flex items-start gap-1.5 border-t border-slate-800 pt-2 text-[11px] ${isOverdue ? "text-rose-300" : "text-amber-300"}`}><CalendarClock className="mt-0.5 h-3 w-3 shrink-0" /><span>{lead.nextAction} · {localDate(lead.nextActionAt)}</span></div>}
                </button>
                <select value={lead.stage} onChange={(event) => changeStage(lead, event.target.value)} disabled={busy} className="mt-3 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-300 disabled:opacity-50" aria-label={`Etapa de ${lead.fullName}`}>
                  {stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </article>
            );
          }) : <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-xs text-slate-500">Nenhum lead corresponde aos filtros selecionados.</p>}
        </div>
        <div className="hidden -mx-4 overflow-x-auto px-4 pb-3 lg:block">
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
        </>
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
                  {matchedProperties.length ? matchedProperties.map(({ property, score, reasons, typeMatches, neighborhoodMatches }) => (
                    <article key={property.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                      {property.coverPhoto ? <img src={property.coverPhoto} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-800"><Building2 className="h-6 w-6 text-slate-500" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-white">{property.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" />{property.neighborhood} · {property.city}</div>
                        <div className="mt-1 text-[11px] font-semibold text-emerald-300">{money(property.salePrice)} · {property.bedrooms} quartos · critérios atendidos {score}%</div>
                        <details className="mt-1.5 text-[10px] text-slate-400"><summary className="cursor-pointer font-semibold text-sky-300">Ver como calculamos</summary><ul className="mt-1 list-inside list-disc space-y-0.5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}{selectedLead.propertyType && !typeMatches && <li>Tipo diferente do informado ({property.propertyType})</li>}{selectedLead.neighborhoods.length && !neighborhoodMatches ? <li>Fora dos bairros preferidos; cidade e demais critérios coincidem</li> : null}</ul><p className="mt-1">Compatibilidade é uma comparação simples das preferências preenchidas; confirme detalhes com o captador.</p></details>
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
