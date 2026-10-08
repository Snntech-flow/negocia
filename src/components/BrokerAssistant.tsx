"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Send, Trash2 } from "lucide-react";
import { askBrokerAssistant, getBrokerAssistantStatus } from "@/lib/actions";
import type { BrokerAnswer } from "@/lib/broker-assistant";

type Message={role:"user"|"assistant";text:string;sources?:BrokerAnswer["sources"];searchSuggestions?:string|null};
const greeting:Message={role:"assistant",text:"Olá! Sou o Bartolomeu do NegociaLar. Posso ajudar você a organizar sua carteira, preparar mensagens para clientes e entender financiamento imobiliário. Qual é a sua dúvida?"};
export default function BrokerAssistant() {
  const [messages,setMessages]=useState<Message[]>([greeting]);
  const [question,setQuestion]=useState("");
  const [busy,setBusy]=useState(false);
  const [enabled,setEnabled]=useState<boolean|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;getBrokerAssistantStatus().then(status=>{if(active)setEnabled(status.enabled);}).catch(()=>{if(active){setEnabled(false);setError("Não foi possível consultar a disponibilidade da IA.");}});return()=>{active=false;};},[]);
  async function send(event:React.FormEvent) {
    event.preventDefault();const text=question.trim();if(text.length<3 || busy || !enabled)return;
    setBusy(true);setError("");const history=messages.slice(1).slice(-10).map(item=>({role:item.role,text:item.text.slice(0,6000)}));
    setMessages(current=>[...current,{role:"user",text}]);setQuestion("");
    try {const answer=await askBrokerAssistant({question:text,history});setMessages(current=>[...current,{role:"assistant",...answer}]);}
    catch(error){setMessages(current=>current.slice(0,-1));setQuestion(text);setError(error instanceof Error?error.message:"Não foi possível consultar o Bartolomeu.");}
    finally{setBusy(false);}
  }
  return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xl font-bold text-white"><Image src="/bartolomeu.png" alt="Bartolomeu" width={72} height={72} className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-400 object-cover" />Bartolomeu · Assistente imobiliário</h3><p className="mt-2 text-sm text-slate-300">Atendimento, CRM, Minha Casa Minha Vida, SBPE e dúvidas sobre financiamento.</p></div><button type="button" disabled={busy} onClick={()=>{setMessages([greeting]);setError("");setQuestion("");}} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"><Trash2 className="h-4 w-4" />Nova conversa</button></div>
    <div className="grid gap-3 sm:grid-cols-3">{[{title:"Minha Casa Minha Vida",url:"https://www.gov.br/cidades/pt-br/assuntos/habitacao/minha-casa-minha-vida"},{title:"Financiamento CAIXA",url:"https://www.caixa.gov.br/voce/habitacao/Paginas/default.aspx"},{title:"Banco Central",url:"https://www.bcb.gov.br/cidadaniafinanceira"}].map(item=><a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-900">{item.title}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6">
      {enabled===false && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">O Bartolomeu está aguardando a configuração da IA pela equipe. Os links oficiais e as outras áreas do CRM já podem ser usados.</p>}
      <div role="log" aria-label="Conversa com Bartolomeu" aria-live="polite" className="max-h-[550px] min-h-64 space-y-4 overflow-y-auto">{messages.map((message,index)=><article key={index} className={`rounded-2xl p-4 text-sm ${message.role==="user"?"ml-5 bg-slate-900 text-white sm:ml-16":"mr-5 bg-slate-50 sm:mr-10"}`}><div className="mb-3 flex items-center gap-2">{message.role==="assistant" && <Image src="/bartolomeu.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />}<p className="text-[10px] font-bold uppercase tracking-wider">{message.role==="user"?"Você":"Bartolomeu"}</p></div><p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>{message.sources && <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-[10px] font-bold text-slate-500">{message.sources.length?"Fontes consultadas nesta resposta":"Nenhuma fonte web foi consultada nesta resposta"}</p><ul className="mt-2 space-y-1">{message.sources.map((source,idx)=><li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="break-words text-xs text-sky-700 underline">[{idx+1}] {source.title}</a></li>)}</ul></div>}{message.searchSuggestions && <iframe title={`Sugestões de pesquisa da resposta ${index}`} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https:;">${message.searchSuggestions}`} className="mt-3 h-28 w-full rounded-lg border-0" />}</article>)}{busy && <p role="status" className="text-xs text-slate-500">Bartolomeu está preparando a resposta…</p>}</div>
      {enabled && messages.length===1 && <div className="my-4 flex flex-wrap gap-2">{["Qual a diferença entre SAC e Price?","Como organizar os retornos da minha carteira?","Me ajude a escrever uma mensagem para agendar uma visita."].map(text=><button key={text} type="button" onClick={()=>setQuestion(text)} className="rounded-full border border-slate-200 px-3 py-2 text-[11px] text-slate-500 hover:border-amber-500">{text}</button>)}</div>}
      <form onSubmit={send} className="mt-5 flex items-end gap-2 border-t border-slate-200 pt-4"><label className="flex-1"><span className="sr-only">Sua pergunta ao Bartolomeu</span><textarea value={question} onChange={event=>setQuestion(event.target.value)} required minLength={3} maxLength={2000} rows={2} disabled={!enabled || busy} placeholder={enabled===null?"Verificando a disponibilidade…":"Digite sua dúvida ou peça ajuda com seu atendimento…"} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 disabled:bg-slate-50" /></label><button type="submit" aria-label="Enviar pergunta" disabled={!enabled || busy || question.trim().length<3} className="rounded-xl bg-amber-500 p-4 text-slate-950 disabled:opacity-40"><Send className="h-5 w-5" /></button></form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">As mensagens são processadas pela IA do Google. Não envie CPF, documentos, senhas ou dados pessoais dos clientes. A conversa fica apenas nesta sessão; as contagens da carteira são enviadas sem nomes ou contatos. Até 60 perguntas por dia. Confirme regras e valores com a fonte oficial e com o banco: a IA não aprova crédito nem garante subsídio.</p>
    </div>
  </section>;
}
