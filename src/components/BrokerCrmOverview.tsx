"use client";

import { CalendarClock, ChevronRight, ClipboardList, Users } from "lucide-react";
import type { LeadItem } from "./LeadCRM";

type Activity = { id: string; leadId: string; description: string; occurredAt: Date };
type Stage = { key: string; label: string };

export default function BrokerCrmOverview({ leads, activities, stages, now, onOpen, onStage, onAgenda }: {
  leads: LeadItem[]; activities: Activity[]; stages: Stage[]; now: number;
  onOpen: (id: string) => void; onStage: (stage: string) => void; onAgenda: () => void;
}) {
  const pending = leads.filter(lead => !["fechado", "perdido"].includes(lead.stage) && lead.nextActionAt)
    .sort((a,b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime()).slice(0, 5);
  const recent = [...activities].filter(activity => leads.some(lead => lead.id === activity.leadId))
    .sort((a,b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);
  const active = leads.filter(lead => !["fechado", "perdido"].includes(lead.stage));
  const withoutReturn = active.filter(lead => !lead.nextActionAt);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4" />Seu funil de atendimento</h3><span className="text-xs text-slate-500">{active.length} oportunidades em andamento</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{stages.map(stage => {
        const count = leads.filter(lead => lead.stage === stage.key).length;
        return <button key={stage.key} onClick={() => onStage(stage.key)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-amber-500 hover:bg-amber-50"><span className="text-xs font-semibold">{stage.label}</span><span className="mt-2 block text-2xl font-extrabold">{count}</span><span className="mt-2 block h-1 rounded-full bg-slate-200"><span className="block h-full rounded-full bg-amber-500" style={{width: `${leads.length ? count / leads.length * 100 : 0}%`}} /></span></button>;
      })}</div>
      {withoutReturn.length > 0 && <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><CalendarClock className="h-4 w-4 shrink-0" />{withoutReturn.length} contatos em andamento estão sem próximo retorno. Abra o cliente para agendar a próxima ação.</p>}
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold text-white"><CalendarClock className="h-4 w-4 text-amber-400" />Próximas ações</h3><button onClick={onAgenda} className="text-xs font-semibold text-amber-300">Abrir agenda</button></div>
        <div className="mt-4 space-y-2">{pending.length ? pending.map(lead => <button key={lead.id} onClick={() => onOpen(lead.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-amber-500/50"><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{lead.fullName}</p><p className="mt-1 break-words text-xs text-slate-300">{lead.nextAction || "Retorno agendado"}</p><p className={`mt-1 text-[11px] ${new Date(lead.nextActionAt!).getTime() < now ? "text-rose-300" : "text-slate-400"}`}>{new Date(lead.nextActionAt!).toLocaleString("pt-BR", {dateStyle:"short",timeStyle:"short"})}{new Date(lead.nextActionAt!).getTime() < now ? " · Atrasado" : ""}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></button>) : <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">Sem retornos agendados. Abra um cliente e registre a próxima ação.</p>}</div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-white"><ClipboardList className="h-4 w-4 text-amber-400" />Últimas atividades</h3><div className="mt-4 space-y-2">{recent.length ? recent.map(activity => <button key={activity.id} onClick={() => onOpen(activity.leadId)} className="block w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-amber-500/50"><p className="text-xs font-semibold text-amber-300">{leads.find(lead => lead.id === activity.leadId)?.fullName}</p><p className="mt-1 line-clamp-2 text-xs text-slate-300">{activity.description}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(activity.occurredAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</p></button>) : <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">As ligações, mensagens, visitas e notas registradas aparecerão aqui.</p>}</div></section>
    </div>
  </div>;
}
