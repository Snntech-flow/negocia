"use client";

// Rota /dvp (Registro de Visita): o formulário de visita + a lista de registros + o acompanhamento das parcerias
// (confirmar/recusar/revisar a divisão e fechar a parceria). Extraído do NegociaLarApp, com os mesmos handlers.
// O imóvel da visita vem de ?imovel=<id> (botão "Agendar visita" da vitrine); sem ele, a tela orienta a escolher.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Fingerprint, Hash, Stamp, UserCheck } from "lucide-react";
import CpfParcialInput from "@/components/CpfParcialInput";
import VisitControlPrint from "@/components/VisitControlPrint";
import { divisoesPermitidas, rotuloDaCondicao } from "@/lib/partnership-models";
import { createDvpCertificate, updatePartnershipStatus, respondToPartnershipSplit, revisePartnershipCommission } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { askConfirm, askText } from "@/lib/dialogs";
import { useRouteToast } from "./useRouteToast";

type CommissionModel = "two_party_50_50" | "three_party_referral_40_40_20";
type ClosingState = { id: string; total: string; date: string; note: string; busy: boolean };

interface DvpCertificateItem {
  id: string; certificateHash: string; propertyId: string; captorBrokerId: string; partnerBrokerId: string;
  clientName: string; clientCpfPartial: string; visitDate: Date; lockExpirationDate: Date; commissionSplit: string;
  commissionModel: string; captorCommissionPercent: string; partnerCommissionPercent: string; referrerCommissionPercent: string;
  externalReferrerName: string | null; externalReferrerCreci: string | null; externalReferrerWhatsapp: string | null;
  status: string; createdAt: Date;
}
interface PartnershipItem {
  id: string; propertyId: string; propertyTitle: string; captorBrokerId: string; captorName: string; partnerBrokerId: string;
  partnerName: string; status: string; commissionSplit: string; commissionStatus: string; commissionRevision: number;
  captorAcceptedAt: Date | null; partnerAcceptedAt: Date | null; propertyPartnershipModels?: string; commissionModel: string;
  captorCommissionPercent: string; partnerCommissionPercent: string; referrerCommissionPercent: string;
  externalReferrerName: string | null; externalReferrerCreci: string | null; externalReferrerWhatsapp: string | null;
  visitScheduledDate: Date | null; commissionTotal: string | null; commissionExpectedDate: string | null;
  notes: string | null; createdAt: Date; updatedAt: Date;
}
interface PartnershipActivityItem {
  id: string; partnershipId: string; actorUserId: string; actorName: string; previousStatus: string | null;
  newStatus: string; note: string | null; createdAt: Date;
}
interface ActiveProperty {
  id: string; title: string; neighborhood: string; city: string; acceptsPartnership: boolean;
  partnershipModels?: string | null; splitPercentage?: string | null; broker: { id: string; name: string; creci: string };
}

function PartnershipClosingForm({ partnership, value, onChange, onSubmit, onCancel }: {
  partnership: PartnershipItem; value: ClosingState; onChange: (next: ClosingState) => void;
  onSubmit: (event: React.FormEvent) => void; onCancel: () => void;
}) {
  const totalCents = Math.round(Number((value.total || "0").replace(",", ".")) * 100) || 0;
  const share = (percent: string) => ((totalCents * Number(percent)) / 10000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const field = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white";
  return <form onSubmit={onSubmit} className="mt-3 grid gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-3 sm:grid-cols-2">
    <p className="text-xs font-bold text-white sm:col-span-2">Fechar parceria e lançar a previsão</p>
    <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">Cada corretor recebe no Financeiro a sua parte como “a receber”, pelo percentual combinado. Dá para ajustar depois no Financeiro.</p>
    <label className="text-[10px] text-slate-300">Valor total da comissão (R$) *<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={value.total} onChange={(event) => onChange({ ...value, total: event.target.value })} className={field} /></label>
    <label className="text-[10px] text-slate-300">Data prevista para receber *<input required type="date" value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} className={field} /></label>
    <div className="rounded-md bg-slate-950/70 p-2 text-[11px] text-slate-300 sm:col-span-2" aria-live="polite">
      Captador ({partnership.captorName}): {Number(partnership.captorCommissionPercent)}% = <strong>{share(partnership.captorCommissionPercent)}</strong> · Parceiro ({partnership.partnerName}): {Number(partnership.partnerCommissionPercent)}% = <strong>{share(partnership.partnerCommissionPercent)}</strong>
      {Number(partnership.referrerCommissionPercent) > 0 && <> · Indicador externo: {Number(partnership.referrerCommissionPercent)}% = {share(partnership.referrerCommissionPercent)} (fora do Financeiro)</>}
    </div>
    <label className="text-[10px] text-slate-300 sm:col-span-2">Observação para a linha do tempo (opcional)<textarea maxLength={500} rows={2} value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} className={field} /></label>
    <div className="flex flex-wrap gap-2 sm:col-span-2">
      <button disabled={value.busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">{value.busy ? "Fechando…" : "Confirmar fechamento"}</button>
      <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800">Cancelar</button>
    </div>
  </form>;
}

export default function DvpRouteClient({ currentBroker, currentUserId, blockedReason, activeProperty, initialDvpList, initialPartnerships, initialPartnershipActivities }: {
  currentBroker: { id: string; name: string; creci: string };
  currentUserId: string;
  blockedReason: string | null;
  activeProperty: ActiveProperty | null;
  initialDvpList: DvpCertificateItem[];
  initialPartnerships: PartnershipItem[];
  initialPartnershipActivities: PartnershipActivityItem[];
}) {
  const router = useRouter();
  const { showToast, toastNode } = useRouteToast();
  const [dvpList, setDvpList] = useState(initialDvpList);
  const [partnershipList, setPartnershipList] = useState(initialPartnerships);
  const [partnershipActivityList, setPartnershipActivityList] = useState(initialPartnershipActivities);
  const [commissionModel, setCommissionModel] = useState<CommissionModel>("two_party_50_50");
  const [closing, setClosing] = useState<ClosingState | null>(null);
  const [defaultVisitDate, setDefaultVisitDate] = useState("");
  useEffect(() => {
    const now = new Date();
    setDefaultVisitDate(new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
  }, []);

  const divisoesDoImovel = divisoesPermitidas(activeProperty?.partnershipModels);
  const modeloDaVisita = divisoesDoImovel.includes(commissionModel) ? commissionModel : divisoesDoImovel[0];

  const irParaVitrine = () => router.push("/vitrine");

  const handlePartnershipStatus = async (partnership: PartnershipItem, newStatus: string, statusLabel: string) => {
    const refusing = newStatus === "recusado";
    const note = await askText({ title: refusing ? `Confirmar etapa “${statusLabel}”?` : `Marcar: ${statusLabel}`, label: "Observação para a linha do tempo (opcional)", maxLength: 500, multiline: true, confirmLabel: refusing ? "Recusar" : "Salvar etapa", danger: refusing });
    if (note === null) return;
    try {
      const result = unwrap(await updatePartnershipStatus(partnership.id, newStatus, note));
      setPartnershipList((items) => items.map((item) => item.id === partnership.id ? { ...item, ...result.partnership } : item));
      setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUserId, actorName: currentBroker.name || "Você" }, ...items]);
      showToast("Etapa atualizada na linha do tempo. Esta mudança é operacional, sem aceite contratual.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível atualizar a parceria."); }
  };

  const openClosing = (partnership: PartnershipItem) => {
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    setClosing({ id: partnership.id, total: "", date: today, note: "", busy: false });
  };
  const handleClosePartnership = async (partnership: PartnershipItem, event: React.FormEvent) => {
    event.preventDefault();
    if (!closing || closing.busy) return;
    setClosing({ ...closing, busy: true });
    try {
      const result = unwrap(await updatePartnershipStatus(partnership.id, "fechado", closing.note, { commissionTotal: closing.total, expectedDate: closing.date }));
      setPartnershipList((items) => items.map((item) => item.id === partnership.id ? { ...item, ...result.partnership } : item));
      setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUserId, actorName: currentBroker.name || "Você" }, ...items]);
      setClosing(null);
      showToast(result.forecastCents
        ? `Parceria fechada. Sua parte, ${(result.forecastCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, entrou no Financeiro como a receber em ${closing.date.split("-").reverse().join("/")}.`
        : "Parceria fechada.");
    } catch (error) {
      setClosing((current) => current && { ...current, busy: false });
      showToast(error instanceof Error ? error.message : "Não foi possível fechar a parceria.");
    }
  };

  const handlePartnershipSplitResponse = async (partnership: PartnershipItem, accepted: boolean) => {
    const splitName = partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50";
    if (!accepted && !(await askConfirm({ title: `Recusar a proposta ${splitName}?`, message: "Ela poderá receber uma nova versão.", confirmLabel: "Recusar", danger: true }))) return;
    try {
      const result = unwrap(await respondToPartnershipSplit(partnership.id, accepted, partnership.commissionRevision));
      setPartnershipList((items) => items.map((item) => item.id === partnership.id ? { ...item, ...result.partnership } : item));
      if (result.activity) setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUserId, actorName: currentBroker.name || "Você" }, ...items]);
      showToast(result.alreadyAccepted ? "Você já confirmou esta proposta." : accepted ? `Confirmação ${splitName} registrada para este corretor.` : "Proposta recusada. Ela pode ser revisada e enviada novamente.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível registrar a resposta."); }
  };

  const handleRevisePartnershipCommission = async (partnership: PartnershipItem, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const result = unwrap(await revisePartnershipCommission(partnership.id, {
        commissionModel: String(values.get("commissionModel") || ""),
        externalReferrerName: String(values.get("externalReferrerName") || ""),
        externalReferrerCreci: String(values.get("externalReferrerCreci") || ""),
        externalReferrerWhatsapp: String(values.get("externalReferrerWhatsapp") || ""),
      }));
      setPartnershipList((items) => items.map((item) => item.id === partnership.id ? { ...item, ...result.partnership } : item));
      setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUserId, actorName: currentBroker.name || "Você" }, ...items]);
      form.reset();
      showToast(`Versão ${result.partnership.commissionRevision} salva. Os dois corretores precisam confirmar novamente.`);
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível revisar a divisão."); }
  };

  const onSubmitVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeProperty || activeProperty.broker.id === currentBroker.id || !activeProperty.acceptsPartnership) {
      showToast("Escolha na Vitrine um imóvel de outro corretor que aceite parceria.");
      return;
    }
    if (blockedReason) { showToast(blockedReason); return; }
    const form = e.currentTarget;
    const fd = new FormData(form);
    const visitDateValue = fd.get("visitDate") as string;
    const visitDate = (visitDateValue ? new Date(visitDateValue) : new Date()).toISOString();
    let res;
    try {
      res = unwrap(await createDvpCertificate({
        propertyId: activeProperty.id, captorBrokerId: activeProperty.broker.id, partnerBrokerId: currentBroker.id,
        clientName: fd.get("clientName") as string, clientPhone: fd.get("clientPhone") as string, clientCpfPartial: fd.get("clientCpf") as string,
        visitDate, commissionSplit: activeProperty.splitPercentage || "50.00", commissionModel: modeloDaVisita,
        externalReferrerName: String(fd.get("externalReferrerName") || ""), externalReferrerCreci: String(fd.get("externalReferrerCreci") || ""), externalReferrerWhatsapp: String(fd.get("externalReferrerWhatsapp") || ""),
      }));
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível salvar o registro da visita."); return; }
    if (res.success && res.certificate) {
      const c = res.certificate;
      setDvpList((prev) => [{
        id: c.id, certificateHash: c.certificateHash, propertyId: c.propertyId, captorBrokerId: c.captorBrokerId, partnerBrokerId: c.partnerBrokerId,
        clientName: c.clientName, clientCpfPartial: c.clientCpfPartial, visitDate: new Date(c.visitDate), lockExpirationDate: new Date(c.lockExpirationDate),
        commissionSplit: c.commissionSplit, commissionModel: c.commissionModel, captorCommissionPercent: c.captorCommissionPercent,
        partnerCommissionPercent: c.partnerCommissionPercent, referrerCommissionPercent: c.referrerCommissionPercent,
        externalReferrerName: c.externalReferrerName, externalReferrerCreci: c.externalReferrerCreci, externalReferrerWhatsapp: c.externalReferrerWhatsapp,
        status: c.status, createdAt: new Date(c.createdAt),
      }, ...prev]);
      if (res.partnership && res.partnershipActivity) {
        setPartnershipList((prev) => [{ ...res.partnership, propertyTitle: activeProperty.title, captorName: activeProperty.broker.name, partnerName: currentBroker.name }, ...prev]);
        setPartnershipActivityList((prev) => [{ ...res.partnershipActivity, partnershipId: res.partnership.id, actorUserId: currentBroker.id, actorName: currentBroker.name }, ...prev]);
      }
      showToast(modeloDaVisita === "three_party_referral_40_40_20"
        ? "Registro salvo. A divisão 40/40/20 aguarda a confirmação dos dois corretores na plataforma."
        : `Registro ${c.certificateHash} salvo como rascunho; ainda não há aceite eletrônico.`);
    }
  };

  const labels: Record<string, string> = { proposta: "Proposta", visita_agendada: "Visita agendada", em_negociacao: "Em negociação", fechado: "Encerrada como fechada", recusado: "Recusada", divisao_confirmada: "Divisão confirmada por um corretor", divisao_confirmada_um: "Divisão confirmada por um corretor", divisao_confirmada_ambos: "Divisão confirmada pelos dois", divisao_recusada: "Divisão não aceita", divisao_revisada: "Divisão revisada", termo_aceito: "Termo de Parceria aceito", termo_aceito_ambos: "Termo de Parceria assinado pelos dois" };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Stamp className="w-5 h-5 text-emerald-400" />Registrar uma visita</h2>
        <p className="text-sm text-slate-400">Este registro interno ainda não é um contrato e não tem assinatura eletrônica.</p>
        <ol className="mt-4 grid gap-2 rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-xs text-slate-300 sm:grid-cols-3">
          <li><strong className="text-sky-900">1. Escolha o imóvel</strong><br />Na Vitrine, abra um imóvel de outro corretor que aceite parceria e clique em “Agendar visita”.</li>
          <li><strong className="text-sky-900">2. Preencha os dados</strong><br />Informe o cliente, CPF parcialmente oculto e data da visita. Depois clique em “Registrar visita em rascunho”.</li>
          <li><strong className="text-sky-900">3. Acompanhe aqui</strong><br />O registro de visita e a parceria aparecem nesta tela para consulta e acompanhamento.</li>
        </ol>
      </div>

      <form id="dvp-visit-form" onSubmit={onSubmitVisit} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold"><Fingerprint className="w-4 h-4" />Registro da visita em rascunho</div>
          <span className="text-[11px] text-slate-400">Sem assinatura eletrônica</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Imóvel escolhido para a visita</div>
            {activeProperty ? <><div className="text-sm font-bold text-white">{activeProperty.title}</div><div className="text-xs text-amber-400">{activeProperty.neighborhood}, {activeProperty.city}</div><div className="text-[11px] text-slate-500 pt-1">Captador: {activeProperty.broker.name} (CRECI {activeProperty.broker.creci})</div></> : <><div className="text-sm font-semibold text-amber-200">Nenhum imóvel selecionado</div><p className="text-[11px] text-slate-400">Abra a Vitrine e escolha um imóvel de outro corretor.</p><button type="button" onClick={irParaVitrine} className="mt-2 rounded-lg bg-amber-500 px-3 py-2 text-[11px] font-bold text-slate-950">Escolher imóvel na Vitrine</button></>}
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Corretor Solicitante:</div>
            <div className="text-sm font-bold text-white">{currentBroker.name}</div>
            <div className="text-xs text-emerald-400">CRECI {currentBroker.creci} • divisão cadastrada no imóvel</div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-400" />Dados do Cliente Apresentado para Registro</div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
            <div>
              <label htmlFor="commission-model" className="block text-xs font-semibold text-slate-200">Como a comissão será dividida?</label>
              <select id="commission-model" value={modeloDaVisita} onChange={(event) => setCommissionModel(event.target.value as CommissionModel)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white">
                {divisoesDoImovel.includes("two_party_50_50") && <option value="two_party_50_50">50% captador · 50% corretor do comprador</option>}
                {divisoesDoImovel.includes("three_party_referral_40_40_20") && <option value="three_party_referral_40_40_20">40% captador · 40% corretor do comprador · 20% indicador externo</option>}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">Condição que o captador deu a este imóvel: <strong>{rotuloDaCondicao(activeProperty?.partnershipModels)}</strong>.</p>
              {modeloDaVisita === "three_party_referral_40_40_20" && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Os 20% são destinados ao corretor que conectou a oportunidade, calculados sobre a comissão total. Como ele não tem acesso à plataforma, informe os dados abaixo. Os dois corretores cadastrados precisam confirmar esta proposta.</p>}
            </div>
            {modeloDaVisita === "three_party_referral_40_40_20" && <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="block text-[11px] text-slate-300 mb-1" htmlFor="external-referrer-name">Nome do corretor indicador</label><input id="external-referrer-name" name="externalReferrerName" required minLength={2} maxLength={120} placeholder="Nome completo" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white" /></div>
              <div><label className="block text-[11px] text-slate-300 mb-1" htmlFor="external-referrer-creci">CRECI do indicador</label><input id="external-referrer-creci" name="externalReferrerCreci" required minLength={2} maxLength={30} placeholder="Ex.: 12345-F" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white" /></div>
              <div><label className="block text-[11px] text-slate-300 mb-1" htmlFor="external-referrer-whatsapp">WhatsApp (opcional)</label><input id="external-referrer-whatsapp" name="externalReferrerWhatsapp" maxLength={30} placeholder="(11) 99999-9999" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white" /></div>
            </div>}
            <p className="text-[10px] text-slate-500">Esta tela registra a proposta e as confirmações internas. Não é assinatura eletrônica nem substitui a formalização do acordo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo do Cliente</label><input name="clientName" required placeholder="Nome do cliente" defaultValue="" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" /></div>
            <div><label htmlFor="dvp-cpf" className="block text-xs font-medium text-slate-300 mb-1">CPF do cliente (fica mascarado — LGPD)</label><CpfParcialInput id="dvp-cpf" name="clientCpf" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" /></div>
            <div><label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp do Cliente</label><input name="clientPhone" placeholder="(DDD) número" defaultValue="" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" /></div>
          </div>

          <div><label className="block text-xs font-medium text-slate-300 mb-1">Data e Hora da Visita</label><input name="visitDate" type="datetime-local" defaultValue={defaultVisitDate} className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" /></div>
        </div>

        <div><button type="submit" disabled={!!blockedReason} title={blockedReason || undefined} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"><Stamp className="w-5 h-5" />Salvar rascunho da visita</button></div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2"><Fingerprint className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white uppercase tracking-wider">Registros de visita ({dvpList.length})</h3></div>
          <span className="text-xs text-slate-400">Registros internos de visita</span>
        </div>
        {dvpList.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">Nenhuma visita registrada. Escolha um imóvel de outro corretor na Vitrine e clique em “Agendar visita”.</div> : (
          <div className="space-y-3">
            {dvpList.map((dvp) => (
              <div key={dvp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{dvp.certificateHash}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">{dvp.status === "rascunho" ? "Rascunho • nenhum aceite registrado" : dvp.status}</span>
                </div>
                <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div><strong>Cliente:</strong> {dvp.clientName} (CPF: {dvp.clientCpfPartial})</div>
                  <div><strong>Data da Visita:</strong> {new Date(dvp.visitDate).toLocaleDateString("pt-BR")}</div>
                  <div><strong>Prazo de acompanhamento interno:</strong> {new Date(dvp.lockExpirationDate).toLocaleDateString("pt-BR")} <span className="text-slate-500">(não cria uma trava contratual)</span></div>
                  <div className="sm:col-span-2"><strong>Divisão informada:</strong> {dvp.commissionModel === "three_party_referral_40_40_20" ? `Captador ${dvp.captorCommissionPercent}% · corretor do comprador ${dvp.partnerCommissionPercent}% · indicador externo ${dvp.referrerCommissionPercent}% (${dvp.externalReferrerName}, CRECI ${dvp.externalReferrerCreci}${dvp.externalReferrerWhatsapp ? `, WhatsApp ${dvp.externalReferrerWhatsapp}` : ""})` : `${dvp.captorCommissionPercent}% captador · ${dvp.partnerCommissionPercent}% corretor do comprador`} <span className="text-slate-500">{dvp.commissionModel === "three_party_referral_40_40_20" ? "(aguardando confirmação dos dois corretores)" : "(condição cadastrada, a combinar entre as partes)"}</span></div>
                </div>
                {currentUserId === dvp.partnerBrokerId && <div className="pt-1"><VisitControlPrint dvpId={dvp.id} /></div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="acompanhamento-parcerias" className="scroll-mt-28 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div><h3 className="text-sm font-bold uppercase tracking-wider text-white">Acompanhamento das parcerias ({partnershipList.length})</h3><p className="mt-1 text-xs text-slate-400">Veja em que etapa está cada visita compartilhada.</p></div>
          <ArrowRight className="h-4 w-4 shrink-0 text-sky-300" />
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-slate-300">Você ou o outro corretor podem atualizar a etapa; o histórico mostra quem alterou e quando. Nas propostas 50/50 e 40/40/20, cada um dos dois corretores pode confirmar ou recusar a divisão. Essa confirmação interna não é assinatura eletrônica nem garante comissão; formalizem o acordo fora da plataforma.</div>
        {partnershipList.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 px-5 py-6 text-center"><p className="text-sm font-semibold text-white">Ainda não há parcerias para acompanhar.</p><p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400">Os registros aparecem aqui depois que você salva uma visita a um imóvel de outro corretor. Na Vitrine, escolha um imóvel que aceite parceria, clique em “Agendar visita” e preencha os dados do cliente. Salvar como rascunho só guarda essas informações; nenhum corretor dá aceite por essa ação.</p><button type="button" onClick={irParaVitrine} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"><Building2 className="h-4 w-4" />Escolher imóvel na Vitrine</button></div> : (
          <div className="space-y-3">
            {partnershipList.map((partnership) => {
              const transitions: Record<string, string[]> = { proposta: ["visita_agendada", "recusado"], visita_agendada: ["em_negociacao", "recusado"], em_negociacao: ["fechado", "recusado"] };
              const nextStatuses = transitions[partnership.status] || [];
              const history = partnershipActivityList.filter((activity) => activity.partnershipId === partnership.id);
              return <article key={partnership.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><h4 className="truncate text-sm font-bold text-white">{partnership.propertyTitle}</h4><p className="mt-1 text-xs text-slate-400">Captador: {partnership.captorName} · Parceiro: {partnership.partnerName}</p><p className="mt-1 text-[11px] text-slate-500">Visita: {partnership.visitScheduledDate ? new Date(partnership.visitScheduledDate).toLocaleString("pt-BR") : "não agendada"} · divisão {partnership.commissionModel === "three_party_referral_40_40_20" ? "40/40/20" : "50/50"} · versão {partnership.commissionRevision}</p></div>
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-200">{labels[partnership.status] || partnership.status}</span>
                </div>
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 space-y-3">
                  <div className="text-xs text-slate-200"><strong>Proposta de divisão (versão {partnership.commissionRevision}):</strong> {partnership.captorCommissionPercent}% captador · {partnership.partnerCommissionPercent}% corretor do comprador{partnership.commissionModel === "three_party_referral_40_40_20" ? ` · ${partnership.referrerCommissionPercent}% indicador externo (${partnership.externalReferrerName}, CRECI ${partnership.externalReferrerCreci}${partnership.externalReferrerWhatsapp ? `, WhatsApp ${partnership.externalReferrerWhatsapp}` : ""})` : ""}.</div>
                  <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                    <div className="rounded-md bg-slate-950/70 p-2 text-slate-300">Captador: {partnership.captorAcceptedAt ? `confirmou em ${new Date(partnership.captorAcceptedAt).toLocaleString("pt-BR")}` : "aguardando confirmação"}</div>
                    <div className="rounded-md bg-slate-950/70 p-2 text-slate-300">Corretor do comprador: {partnership.partnerAcceptedAt ? `confirmou em ${new Date(partnership.partnerAcceptedAt).toLocaleString("pt-BR")}` : "aguardando confirmação"}</div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">{partnership.commissionModel === "three_party_referral_40_40_20" ? "O indicador externo fica identificado no registro, mas não precisa acessar a plataforma. " : ""}A proposta só aparece como confirmada quando os dois corretores cadastrados confirmarem. Isso não é assinatura eletrônica nem substitui a formalização entre as partes.</p>
                  {partnership.commissionStatus === "aguardando_aceites" && partnership.status !== "recusado" && <div className="flex flex-wrap gap-2">
                    {currentUserId === partnership.captorBrokerId && !partnership.captorAcceptedAt && <><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, true)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-slate-950">Confirmar divisão (captador)</button><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, false)} className="rounded-lg border border-rose-500/40 px-3 py-2 text-[11px] font-semibold text-rose-300">Não aceito</button></>}
                    {currentUserId === partnership.partnerBrokerId && !partnership.partnerAcceptedAt && <><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, true)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-slate-950">Confirmar divisão (parceiro)</button><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, false)} className="rounded-lg border border-rose-500/40 px-3 py-2 text-[11px] font-semibold text-rose-300">Não aceito</button></>}
                  </div>}
                  {partnership.captorAcceptedAt && partnership.partnerAcceptedAt && <p className="text-[11px] font-semibold text-emerald-300">Os dois corretores confirmaram esta proposta.</p>}
                  {(currentUserId === partnership.captorBrokerId || currentUserId === partnership.partnerBrokerId) && partnership.status !== "fechado" && partnership.status !== "recusado" && <details className="border-t border-amber-500/15 pt-3"><summary className="cursor-pointer text-[11px] font-semibold text-amber-200">Revisar proposta de divisão</summary><form onSubmit={(event) => void handleRevisePartnershipCommission(partnership, event)} className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] text-slate-300">Modelo<select name="commissionModel" defaultValue={partnership.commissionModel} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white">{divisoesPermitidas(partnership.propertyPartnershipModels).includes("two_party_50_50") && <option value="two_party_50_50">50% / 50%</option>}{divisoesPermitidas(partnership.propertyPartnershipModels).includes("three_party_referral_40_40_20") && <option value="three_party_referral_40_40_20">40% / 40% / 20%</option>}</select><span className="mt-1 block text-[10px] text-slate-400">{rotuloDaCondicao(partnership.propertyPartnershipModels)}</span></label>
                    <label className="text-[10px] text-slate-300">Nome do indicador externo (se houver)<input name="externalReferrerName" defaultValue={partnership.externalReferrerName || ""} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                    <label className="text-[10px] text-slate-300">CRECI do indicador<input name="externalReferrerCreci" defaultValue={partnership.externalReferrerCreci || ""} maxLength={40} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                    <label className="text-[10px] text-slate-300">WhatsApp do indicador<input name="externalReferrerWhatsapp" defaultValue={partnership.externalReferrerWhatsapp || ""} maxLength={30} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                    <button className="sm:col-span-2 rounded-lg border border-amber-500/40 px-3 py-2 text-[11px] font-bold text-amber-200 hover:bg-amber-500/10">Salvar nova versão e pedir confirmação dos dois</button>
                  </form></details>}
                </div>
                {nextStatuses.length > 0 && (currentUserId === partnership.captorBrokerId || currentUserId === partnership.partnerBrokerId) && <div className="mt-3 flex flex-wrap gap-2">{nextStatuses.map((nextStatus) => <button key={nextStatus} type="button" onClick={() => { if (nextStatus === "fechado") { openClosing(partnership); return; } void handlePartnershipStatus(partnership, nextStatus, labels[nextStatus]); }} className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${nextStatus === "recusado" ? "border-rose-500/25 text-rose-300 hover:bg-rose-500/10" : "border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10"}`}>{nextStatus === "recusado" ? "Recusar" : `Marcar: ${labels[nextStatus]}`}</button>)}</div>}
                {closing?.id === partnership.id && <PartnershipClosingForm partnership={partnership} value={closing} onChange={setClosing} onSubmit={(event) => void handleClosePartnership(partnership, event)} onCancel={() => setClosing(null)} />}
                {partnership.status === "fechado" && partnership.commissionTotal && <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-950/10 p-2 text-[11px] text-slate-300">Comissão total {Number(partnership.commissionTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{partnership.commissionExpectedDate ? `, prevista para ${partnership.commissionExpectedDate.split("-").reverse().join("/")}` : ""}. A parte de cada corretor está no Financeiro dele.</p>}
                <details className="mt-3 border-t border-slate-800 pt-3"><summary className="cursor-pointer text-[11px] font-semibold text-slate-300">Linha do tempo ({history.length})</summary><div className="mt-3 space-y-2">{history.length ? history.map((activity) => <div key={activity.id} className="border-l border-slate-700 pl-3 text-[11px]"><div className="flex flex-wrap items-center justify-between gap-2 text-slate-300"><span>{activity.actorName}: {labels[activity.newStatus] || activity.newStatus}</span><time className="text-slate-500">{new Date(activity.createdAt).toLocaleString("pt-BR")}</time></div>{activity.note && <p className="mt-1 whitespace-pre-wrap text-slate-500">{activity.note}</p>}</div>) : <p className="text-[11px] text-slate-500">Nenhum evento registrado.</p>}</div></details>
              </article>;
            })}
          </div>
        )}
      </div>
      {toastNode}
    </div>
  );
}
