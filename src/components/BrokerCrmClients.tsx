"use client";

import { ChevronLeft, ChevronRight, MessageCircle, Pencil, UserRound } from "lucide-react";
import type { LeadItem } from "./LeadCRM";

export default function BrokerCrmClients({ leads, stages, page, onPage, onOpen, onEdit, onStage, busy }: {
  leads: LeadItem[]; stages: {key:string;label:string}[]; page:number;
  onPage:(page:number)=>void; onOpen:(id:string)=>void; onEdit:(lead:LeadItem)=>void;
  onStage:(lead:LeadItem, stage:string)=>void; busy:boolean;
}) {
  const size = 15;
  const pages = Math.max(1, Math.ceil(leads.length / size));
  const rows = leads.slice((page-1)*size, page*size);
  const types:Record<string,string> = {comprador:"Comprador",proprietario:"Proprietário",locatario:"Locatário",parceiro:"Parceiro"};
  const sources:Record<string,string> = {indicacao:"Indicação",whatsapp:"WhatsApp",portal:"Portal imobiliário",site:"Site",ligacao:"Ligação",rede_social:"Rede social",outro:"Outro"};
  const whatsapp = (phone:string) => {const digits=phone.replace(/\D/g,"");return `https://wa.me/${digits.length===10 || digits.length===11 ? `55${digits}` : digits}`;};
  const budget = (value:string|null) => value ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(Number(value)) : "Não informado";
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900">
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-bold">Minha carteira de clientes</h3><span className="text-xs text-slate-500">{leads.length} contatos encontrados</span></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs">
      <thead className="bg-slate-50 text-slate-900"><tr>{["Cliente","Contato","Imóvel procurado","Etapa","Orçamento máximo","Origem","Cadastro","Ações"].map(label=><th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
      <tbody>{rows.map(lead => <tr key={lead.id} className="border-t border-slate-100 hover:bg-amber-50/60">
        <td className="px-4 py-4"><button onClick={()=>onOpen(lead.id)} className="flex items-center gap-3 text-left hover:text-amber-700"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">{lead.fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span><span><span className="block max-w-48 break-words text-sm font-bold">{lead.fullName}</span><span className="mt-1 block text-[10px] text-slate-500">{types[lead.leadType] || lead.leadType}</span></span></button></td>
        <td className="px-4 py-4"><a href={whatsapp(lead.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-orange-700" title={`Abrir WhatsApp de ${lead.fullName}`}><MessageCircle className="h-3.5 w-3.5" />{lead.phone}</a>{lead.email && <span className="mt-1 block max-w-40 break-all text-[10px] text-slate-500">{lead.email}</span>}</td>
        <td className="px-4 py-4"><span className="block">{lead.propertyType || "Não informado"}</span><span className="mt-1 block text-[10px] text-slate-500">{[lead.city,...lead.neighborhoods].filter(Boolean).join(" · ")}</span></td>
        <td className="px-4 py-4"><select disabled={busy} value={lead.stage} onChange={event=>onStage(lead,event.target.value)} aria-label={`Etapa de ${lead.fullName}`} className="max-w-32 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-900 disabled:opacity-50">{stages.map(stage=><option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></td>
        <td className="px-4 py-4 font-semibold text-orange-700">{budget(lead.maxBudget)}</td>
        <td className="px-4 py-4 text-slate-500">{sources[lead.source] || lead.source}</td>
        <td className="whitespace-nowrap px-4 py-4 text-slate-500">{new Date(lead.createdAt).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}</td>
        <td className="px-4 py-4"><div className="flex gap-1"><button onClick={()=>onOpen(lead.id)} title="Abrir ficha e histórico" aria-label={`Abrir ficha de ${lead.fullName}`} className="rounded-lg p-2 hover:bg-slate-100"><UserRound className="h-4 w-4" /></button><button onClick={()=>onEdit(lead)} title="Editar cadastro" aria-label={`Editar ${lead.fullName}`} className="rounded-lg p-2 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button></div></td>
      </tr>)}</tbody>
    </table></div>
    {!rows.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhum cliente corresponde aos filtros. Cadastre um cliente ou ajuste a busca.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500"><span>{leads.length ? `Mostrando ${(page-1)*size+1} a ${Math.min(page*size,leads.length)} de ${leads.length} contatos` : "Nenhum contato"}</span><div className="flex items-center gap-3"><button onClick={()=>onPage(page-1)} disabled={page<=1} aria-label="Página anterior de clientes" className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pages}</span><button onClick={()=>onPage(page+1)} disabled={page>=pages} aria-label="Próxima página de clientes" className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
  </section>;
}
