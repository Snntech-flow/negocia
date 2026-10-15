"use client";

import dynamic from "next/dynamic";
import CpfParcialInput from "./CpfParcialInput";
import { abasGuardadas, abrirAba, fecharAba } from "@/lib/abas";
import BotaoFechar from "./BotaoFechar";
import { useVoltarFecha } from "@/lib/use-voltar-fecha";
import { divisoesPermitidas, rotuloDaCondicao } from "@/lib/partnership-models";
import { PROPERTY_PAGE_SIZE } from "@/lib/marketplace-query";
import RadarMatches from "./RadarMatches";
import WhiteLabelSheet from "./WhiteLabelSheet";
import PropertyMarketplace from "./PropertyMarketplace";
import type { Property } from "@/lib/property-types";
import { PROPERTY_TYPES } from "@/lib/property-options";
import { unwrap } from "@/lib/action-result";
import { billingNotice, hasSubscriptionAccess } from "@/lib/subscription";
import { planName } from "@/lib/plans";
import { readThemeChoice, saveThemeChoice, THEME_CHOICES, watchSystemTheme, type ThemeChoice } from "@/lib/theme";
import type { WorkspaceSessionUser, WorkspaceFeedback, WorkspaceNotification, WorkspaceTransaction, WorkspaceUser } from "@/lib/workspace-types";
import Avatar from "./Avatar";
import BuyerProfileForm from "./BuyerProfileForm";
import PropertyCreateForm from "./PropertyCreateForm";
const SubscriptionPanel = dynamic(() => import("./SubscriptionPanel"));
const BillingPopup = dynamic(() => import("./BillingPopup"));
const AdminPanel = dynamic(() => import("./AdminPanel"));
import DialogHost from "./DialogHost";
import PartnershipTerms from "./PartnershipTerms";
import VisitControlPrint from "./VisitControlPrint";
import { askConfirm, askText } from "@/lib/dialogs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CreditCard,
  Radar,
  Building2,
  UserCheck,
  Wallet,
  PlusCircle,
  ArrowRight,
  Scale,
  AlertTriangle,
  Fingerprint,
  Stamp,
  Users,
  Bell,
  ChevronDown,
  Hash,
  UserPlus,
  Info,
  MessageSquarePlus,
  FileText,
  X,
} from "lucide-react";
import OnboardingModal from "@/components/OnboardingModal";
const LeadCRM = dynamic(() => import("./LeadCRM"));
import {
  getMarketplaceData,
  createDvpCertificate,
  updatePartnershipStatus,
  respondToPartnershipSplit,
  revisePartnershipCommission,
  submitPilotFeedback,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  logoutUser,
} from "@/lib/actions";

const PropertyInventory = dynamic(() => import("./PropertyInventory"), { loading: () => <p className="p-4 text-sm">Carregando carteira…</p> });
const BrokerFinance = dynamic(() => import("./BrokerFinance"), { loading: () => <p className="p-4 text-sm">Carregando financeiro…</p> });

type NotificationItem = WorkspaceNotification;

interface DvpCertificateItem {
  id: string;
  certificateHash: string;
  propertyId: string;
  captorBrokerId: string;
  partnerBrokerId: string;
  clientName: string;
  clientCpfPartial: string;
  visitDate: Date;
  lockExpirationDate: Date;
  commissionSplit: string;
  commissionModel: string;
  captorCommissionPercent: string;
  partnerCommissionPercent: string;
  referrerCommissionPercent: string;
  externalReferrerName: string | null;
  externalReferrerCreci: string | null;
  externalReferrerWhatsapp: string | null;
  status: string;
  createdAt: Date;
}

interface PartnershipItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  captorBrokerId: string;
  captorName: string;
  partnerBrokerId: string;
  partnerName: string;
  status: string;
  commissionSplit: string;
  commissionStatus: string;
  commissionRevision: number;
  captorAcceptedAt: Date | null;
  partnerAcceptedAt: Date | null;
  /** Condição de parceria do imóvel (50_50 / 40_40_20 / ambos) — a revisão só oferece o que ela permite. */
  propertyPartnershipModels?: string;
  commissionModel: string;
  captorCommissionPercent: string;
  partnerCommissionPercent: string;
  referrerCommissionPercent: string;
  externalReferrerName: string | null;
  externalReferrerCreci: string | null;
  externalReferrerWhatsapp: string | null;
  visitScheduledDate: Date | null;
  commissionTotal: string | null;
  commissionExpectedDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type PilotFeedbackItem = WorkspaceFeedback;

// Tema da área logada (Minha conta): claro, escuro ou automático pelo aparelho.
function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChoice(readThemeChoice()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="px-3 py-2">
    <p className="mb-1.5 text-[11px] font-semibold text-slate-400">Tema</p>
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1">
      {THEME_CHOICES.map((option) => <button key={option.id} type="button" role="radio" aria-checked={choice === option.id}
        onClick={() => { saveThemeChoice(option.id); setChoice(option.id); }}
        className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${choice === option.id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{option.label}</button>)}
    </div>
  </div>;
}

// Fechar a parceria: valor total da comissão, data prevista e a parte de cada um calculada na hora.
type ClosingState = { id: string; total: string; date: string; note: string; busy: boolean };
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


interface PartnershipActivityItem {
  id: string;
  partnershipId: string;
  actorUserId: string;
  actorName: string;
  previousStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: Date;
}

const SCREEN_GUIDANCE: Record<string, { title: string; description: string }> = {
  atendimento: { title: "Atendimento aos clientes", description: "Acompanhe o funil de atendimento e as próximas ações de cada cliente." },
  vitrine: { title: "Vitrine de imóveis compartilhados (MLS)", description: "MLS é uma rede em que corretores compartilham imóveis e oportunidades. Consulte as condições com o captador; o endereço completo e os dados do proprietário ficam restritos a ele. Para mudar fotos, valor ou condição de parceria de um imóvel SEU, use o botão “Editar em Meus imóveis” no cartão dele (ou o menu Imóveis › Meus imóveis)." },
  crm: { title: "CRM interno do corretor", description: "Organize clientes e parceiros, acompanhe cada oportunidade por etapa, registre contatos e programe retornos. Os leads ficam privados na sua carteira." },
  radar: { title: "Radar de Compradores", description: "Compare as preferências de compradores cadastrados com os imóveis disponíveis. Confira os critérios do match antes de falar com o corretor responsável." },
  termo: { title: "Termo de Parceria", description: "O termo de cada parceria sai com a divisão da comissão confirmada pelos dois corretores. Leia, aceite e acompanhe o aceite do outro; assinado, imprima ou salve em PDF." },
  dvp: { title: "Registro de visita · DVP", description: "Salve os dados da visita para consulta e acompanhamento. O rascunho não é assinado por ninguém, não confirma um acordo e não garante comissão." },
  cadastrar: { title: "Meus imóveis", description: "Para mudar fotos, valor ou condição de parceria, clique em “Editar” no imóvel, na lista abaixo. Aqui você também arquiva e cadastra imóveis. Os dados completos de endereço e do proprietário ficam visíveis apenas para o corretor captador." },
  admin: { title: "Corretores e pagamentos", description: "Aprove CRECIs e confirme ou estorne pagamentos via Pix. O pagamento é conferido manualmente no extrato do banco." },
};

interface BuyerProfile {
  id: string;
  clientInternalName: string;
  propertyType: string;
  city: string;
  neighborhoods: string[];
  maxBudget: string;
  minBedrooms: number;
  minParkingSpots: number;
  notes: string | null;
  broker: {
    id: string;
    name: string;
    creci: string;
    whatsapp: string;
  };
}

type UserItem = WorkspaceUser;

type TransactionItem = WorkspaceTransaction;

import LandingPage from "./LandingPage";

export default function NegociaLarApp({
  initialProperties,
  initialPropertyTotal = initialProperties.length,
  initialRadar,
  initialUsers,
  initialTransactions,
  initialCurrentUser,
  initialNotifications = [],
  initialDvpList = [],
  initialPartnerships = [],
  initialPartnershipActivities = [],
  initialLeads = [],
  initialLeadActivities = [],
  initialFeedback = [],
}: {
  initialProperties: Property[];
  initialPropertyTotal?: number;
  initialRadar: BuyerProfile[];
  initialUsers: UserItem[];
  initialTransactions: TransactionItem[];
  initialCurrentUser?: WorkspaceSessionUser | null;
  initialNotifications?: NotificationItem[];
  initialDvpList?: DvpCertificateItem[];
  initialPartnerships?: PartnershipItem[];
  initialPartnershipActivities?: PartnershipActivityItem[];
  initialLeads?: React.ComponentProps<typeof LeadCRM>["initialLeads"];
  initialLeadActivities?: React.ComponentProps<typeof LeadCRM>["initialActivities"];
  initialFeedback?: PilotFeedbackItem[];
}) {
  const [currentView, setCurrentView] = useState<"app" | "landing">(initialCurrentUser ? "app" : "landing");
  type WorkspaceTab = "vitrine" | "crm" | "radar" | "atendimento" | "cadastrar" | "termo" | "dvp" | "financeiro" | "admin";
  const [activeTab, setActiveTabState] = useState<WorkspaceTab>("vitrine");
  // Abas abertas, como no Flow (15/10/2026): cada tela aberta vira uma aba com X; a Vitrine é a fixa.
  const TAB_LABELS: Record<WorkspaceTab, string> = { vitrine: "Vitrine", crm: "Minha carteira", radar: "Radar de Compradores",
    atendimento: "Funil de atendimento", cadastrar: "Meus imóveis", termo: "Termo de Parceria", dvp: "Registro de Visita",
    financeiro: "Receitas e despesas", admin: "Corretores e pagamentos" };
  const ABAS_PERMITIDAS: WorkspaceTab[] = ["vitrine", "crm", "radar", "atendimento", "cadastrar", "termo", "dvp", "financeiro", ...(initialCurrentUser?.role === "admin" ? ["admin" as const] : [])];
  const [abasAbertas, setAbasAbertas] = useState<WorkspaceTab[]>(["vitrine"]);
  const setActiveTab = (tab: WorkspaceTab) => {
    document.querySelectorAll<HTMLDetailsElement>(".workspace-navigation details[open]").forEach(menu => { menu.open = false; });
    setActiveTabState(tab);
    setAbasAbertas((abertas) => abrirAba(abertas, tab));
    // A seta de voltar do navegador volta para a aba anterior, em vez de sair do aplicativo.
    if (window.history.state?.negocialarAba !== tab) window.history.pushState({ negocialarAba: tab }, "");
    if (currentUser) {
      try { sessionStorage.setItem(`negocialar-tab:${currentUser.id}`, tab); } catch {}
    }
  };
  const fecharAbaDaTela = (aba: WorkspaceTab) => {
    const resultado = fecharAba(abasAbertas, aba, activeTab, "vitrine");
    setAbasAbertas(resultado.abertas);
    if (resultado.ativa !== activeTab) setActiveTab(resultado.ativa);
  };
  useEffect(() => {
    if (!initialCurrentUser) return;
    let saved: string | null = null;
    let abasSalvas: unknown = null;
    try {
      saved = sessionStorage.getItem(`negocialar-tab:${initialCurrentUser.id}`);
      abasSalvas = JSON.parse(sessionStorage.getItem(`negocialar-abas:${initialCurrentUser.id}`) || "null");
    } catch {}
    const allowed: string[] = ["vitrine", "crm", "radar", "atendimento", "cadastrar", "termo", "dvp", "financeiro", ...(initialCurrentUser.role === "admin" ? ["admin"] : [])];
    const tab = (saved && allowed.includes(saved) ? saved : "vitrine") as WorkspaceTab;
    const abas = abrirAba(abasGuardadas<WorkspaceTab>(abasSalvas, allowed as WorkspaceTab[], "vitrine"), tab);
    window.history.replaceState({ ...(window.history.state ?? {}), negocialarAba: tab }, "");
    const frame = requestAnimationFrame(() => { setActiveTabState(tab); setAbasAbertas(abas); });
    return () => cancelAnimationFrame(frame);
  }, [initialCurrentUser]);
  useEffect(() => {
    const aoVoltar = (event: PopStateEvent) => {
      const aba = event.state?.negocialarAba as WorkspaceTab | undefined;
      if (!aba || !ABAS_PERMITIDAS.includes(aba)) return;
      setActiveTabState(aba);
      setAbasAbertas((abertas) => abrirAba(abertas, aba));
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  });
  const [userList, setUserList] = useState<UserItem[]>(initialUsers);
  const [transactionList, setTransactionList] = useState<TransactionItem[]>(initialTransactions);
  const [currentUser, setCurrentUser] = useState<WorkspaceSessionUser | null>(
    initialCurrentUser || null
  );
  useEffect(() => {
    if (!currentUser) return;
    try { sessionStorage.setItem(`negocialar-abas:${currentUser.id}`, JSON.stringify(abasAbertas)); } catch {}
  }, [abasAbertas, currentUser]);
  const [propertyList, setPropertyList] = useState<Property[]>(initialProperties);
  const [propertyTotal, setPropertyTotal] = useState(initialPropertyTotal);
  const [propertyPage, setPropertyPage] = useState(1);
  const [leadList, setLeadList] = useState(initialLeads);
  const [leadActivityList, setLeadActivityList] = useState(initialLeadActivities);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // "Editar em Meus imóveis" na Vitrine: abre a carteira já na edição daquele imóvel (14/10/2026).
  const [imovelParaEditar, setImovelParaEditar] = useState<string | null>(null);
  const imovelAberto = useCallback(() => setImovelParaEditar(null), []);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [radarList, setRadarList] = useState<BuyerProfile[]>(initialRadar);
  const [selectedPropertyForWhiteLabel, setSelectedPropertyForWhiteLabel] = useState<Property | null>(null);
  const [selectedPropertyForTerm, setSelectedPropertyForTerm] = useState<Property | null>(null);
  const [dvpEmitted, setDvpEmitted] = useState(false);
  const [commissionModel, setCommissionModel] = useState<"two_party_50_50" | "three_party_referral_40_40_20">("two_party_50_50");
  const [userSearch, setUserSearch] = useState("");
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const fecharSugestao = useVoltarFecha(() => setIsFeedbackOpen(false), isFeedbackOpen); // X visível, Esc e voltar (15/10/2026)
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [defaultVisitDate, setDefaultVisitDate] = useState("");
  // Celular: a aba ativa rola para dentro da faixa de abas.
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>("[data-ativa]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: Math.max(0, active.offsetLeft - 16), behavior: "smooth" });
  }, [activeTab]);
  // Tema automático acompanha o aparelho com a página aberta.
  useEffect(() => watchSystemTheme(), []);
  // Hora lida no navegador depois de montar (o servidor não sabe o "agora" de quem usa); refaz a cada minuto.
  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const frame = requestAnimationFrame(tick);
    const timer = window.setInterval(tick, 60_000);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const localDate = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000);
      setDefaultVisitDate(localDate.toISOString().slice(0, 16));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  // Notificações do usuário
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // Um aviso por vez, com um único temporizador: um aviso antigo não apaga o novo antes da hora.
  const showToast = (text: string, milliseconds = 6000) => {
    setToastMessage(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), milliseconds);
  };

  useEffect(() => {
    const closeMenus = () => document.querySelectorAll<HTMLDetailsElement>(".workspace-navigation details[open]").forEach(menu => { menu.open = false; });
    const handlePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".workspace-navigation details")) closeMenus();
      if (!(event.target instanceof Element) || !event.target.closest("[data-header-popover]")) { setIsNotificationsOpen(false); setIsUserSwitcherOpen(false); }
    };
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") { closeMenus(); setIsNotificationsOpen(false); setIsUserSwitcherOpen(false); } };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [dvpList, setDvpList] = useState<DvpCertificateItem[]>(initialDvpList);
  const [partnershipList, setPartnershipList] = useState<PartnershipItem[]>(initialPartnerships);
  const [partnershipActivityList, setPartnershipActivityList] = useState<PartnershipActivityItem[]>(initialPartnershipActivities);
  const [pilotFeedbackList, setPilotFeedbackList] = useState<PilotFeedbackItem[]>(initialFeedback);

  // Filtros da Vitrine MLS
  const [propertyFilterPurpose, updatePropertyFilterPurpose] = useState<string>("todos");
  const [propertyFilterType, updatePropertyFilterType] = useState<string>("todos");
  const [propertyFilterSearch, updatePropertyFilterSearch] = useState<string>("");

  // Formulário Completo de Cadastro de Imóvel (4 Páginas das Imobiliárias)
  const setPropertyFilterPurpose = (value: string) => { updatePropertyFilterPurpose(value); setPropertyPage(1); };
  const setPropertyFilterType = (value: string) => { updatePropertyFilterType(value); setPropertyPage(1); };
  const setPropertyFilterSearch = (value: string) => { updatePropertyFilterSearch(value); setPropertyPage(1); };
  const requestKey = JSON.stringify([currentUser?.id, activeTab, propertyPage, propertyFilterPurpose, propertyFilterType, propertyFilterSearch, reloadKey]);
  const [loadedRequest, setLoadedRequest] = useState(requestKey);
  const workspaceReady = loadedRequest === requestKey;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setWorkspaceError(null);
      try {
        const data = unwrap(await getMarketplaceData({ section: activeTab, page: propertyPage,
          purpose: propertyFilterPurpose, propertyType: propertyFilterType, search: propertyFilterSearch }));
        if (cancelled) return;
        setCurrentUser(data.currentUser);
        if (!data.currentUser) setCurrentView("landing");
        setPropertyList(data.properties);
        if (activeTab === "vitrine") {
          const lastPage = Math.max(1, Math.ceil(data.propertyTotal / PROPERTY_PAGE_SIZE));
          if (propertyPage > lastPage) { setPropertyPage(lastPage); return; }
        }
        if (["vitrine", "radar", "crm", "atendimento", "cadastrar", "dvp"].includes(activeTab)) setPropertyTotal(data.propertyTotal);
        setRadarList(data.radarList);
        setUserList(data.users);
        setTransactionList(data.transactions);
        setNotifications(data.notifications);
        setDvpList(data.dvpList);
        setPartnershipList(data.partnerships);
        setPartnershipActivityList(data.partnershipActivities);
        setPilotFeedbackList(data.pilotFeedback);
        setLeadList(data.leads);
        setLeadActivityList(data.leadActivities);
        setLoadedRequest(requestKey);
      } catch (error) {
        if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Não foi possível carregar esta área.");
      }
    }, activeTab === "vitrine" ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [requestKey, activeTab, propertyPage, propertyFilterPurpose, propertyFilterType, propertyFilterSearch]);

  useEffect(() => {
    if (!workspaceReady || activeTab !== "vitrine" || !pendingPropertyId) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector(`[data-property-id="${pendingPropertyId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingPropertyId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [workspaceReady, activeTab, pendingPropertyId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Ao trocar de conta, nada da sessão anterior fica aberto (aba, menus, aviso).
  const resetWorkspaceView = () => {
    setIsUserSwitcherOpen(false);
    setIsNotificationsOpen(false);
    setToastMessage(null);
    setActiveTabState("vitrine");
  };

  const handleLogout = async () => {
    try { unwrap(await logoutUser()); } catch { /* a sessão local sai de qualquer forma */ }
    resetWorkspaceView();
    setCurrentUser(null);
    setUserList([]);
    setCurrentView("landing");
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        unwrap(await markNotificationAsRead(notif.id));
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível marcar como lida."); }
    }
    if (notif.type === "dvp") {
      // Registro de visita (14/10/2026): a notificação leva ao quadro onde se confirma a divisão, não à ficha do imóvel.
      setActiveTab("dvp");
      window.setTimeout(() => document.getElementById("acompanhamento-parcerias")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    } else if (notif.propertyId) {
      const prop = propertyList.find((p) => p.id === notif.propertyId);
      if (prop) setSelectedPropertyForWhiteLabel(prop);
      else {
        // O imóvel pode não estar na página atual da vitrine: abre a vitrine sem filtros e rola até ele se aparecer.
        setPropertyFilterPurpose("todos"); setPropertyFilterType("todos"); setPropertyFilterSearch("");
        setPendingPropertyId(notif.propertyId); setActiveTab("vitrine");
      }
    }
    setIsNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      unwrap(await markAllNotificationsAsRead());
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível marcar as notificações."); }
  };

  const currentBroker = {
    id: currentUser?.id || "",
    name: currentUser?.name || "",
    creci: currentUser?.creci || "",
    whatsapp: currentUser?.whatsapp || "",
    avatar: currentUser?.avatarUrl || "",
    plan: currentUser?.plan || "",
  };

  // CRECI aprovado e acesso em dia: sem isso o servidor recusa cadastros e parcerias, então a tela avisa antes.
  const accessExpiresAt = currentUser?.nextBillingDate ? new Date(currentUser.nextBillingDate) : null;
  // Aviso da mensalidade: fixo no topo do sino, conta no número vermelho e não some ao "marcar como lidas".
  const billingAlert = currentUser && clock !== null && currentUser.hasPaid !== undefined ? billingNotice({
    role: currentUser.role, subscriptionStatus: currentUser.subscriptionStatus, nextBillingDate: accessExpiresAt,
    billingExemptAt: currentUser.billingExemptAt ? new Date(currentUser.billingExemptAt) : null,
    plan: currentUser.plan, billingCycle: currentUser.billingCycle, hasPaid: currentUser.hasPaid, pendingPix: !!currentUser.pendingPix,
  }, new Date(clock)) : null;
  const bellCount = unreadCount + (billingAlert ? 1 : 0);
  const blockedReason = !currentUser || currentUser.role === "admin" ? null
    : currentUser.verificationStatus !== "aprovado"
      ? "Seu CRECI está em análise pela equipe. Enquanto isso você pode conhecer a plataforma; cadastrar imóveis, clientes, procuras e visitas fica liberado assim que ele for aprovado."
      : !hasSubscriptionAccess(currentUser.subscriptionStatus, accessExpiresAt)
        ? `Seu acesso ${accessExpiresAt ? `venceu em ${accessExpiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "não está ativo"}. Renove via Pix em Minha assinatura para voltar a cadastrar e usar a rede.`
        : null;

  const formatBRL = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(num);
  };

  const handlePartnershipStatus = async (partnership: PartnershipItem, newStatus: string, statusLabel: string) => {
    const refusing = newStatus === "recusado";
    const note = await askText({ title: refusing ? `Confirmar etapa “${statusLabel}”?` : `Marcar: ${statusLabel}`, label: "Observação para a linha do tempo (opcional)", maxLength: 500, multiline: true, confirmLabel: refusing ? "Recusar" : "Salvar etapa", danger: refusing });
    if (note === null) return;
    try {
      const result = unwrap(await updatePartnershipStatus(partnership.id, newStatus, note));
      setPartnershipList((items) => items.map((item) => item.id === partnership.id ? { ...item, ...result.partnership } : item));
      setPartnershipActivityList((items) => [{
        ...result.activity,
        partnershipId: partnership.id,
        actorUserId: currentUser?.id || "",
        actorName: currentUser?.name || "Você",
      }, ...items]);
      showToast("Etapa atualizada na linha do tempo. Esta mudança é operacional, sem aceite contratual.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível atualizar a parceria.");
    }
  };

  // Fechar a parceria: valor total da comissão e data prevista; o servidor lança a parte de cada corretor no Financeiro.
  const [closing, setClosing] = useState<ClosingState | null>(null);
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
      setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUser?.id || "", actorName: currentUser?.name || "Você" }, ...items]);
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
      if (result.activity) setPartnershipActivityList((items) => [{
        ...result.activity,
        partnershipId: partnership.id,
        actorUserId: currentUser?.id || "",
        actorName: currentUser?.name || "Você",
      }, ...items]);
      showToast(result.alreadyAccepted ? "Você já confirmou esta proposta." : accepted ? `Confirmação ${splitName} registrada para este corretor.` : "Proposta recusada. Ela pode ser revisada e enviada novamente.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível registrar a resposta.");
    }
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
      setPartnershipActivityList((items) => [{ ...result.activity, partnershipId: partnership.id, actorUserId: currentUser?.id || "", actorName: currentUser?.name || "Você" }, ...items]);
      form.reset();
      showToast(`Versão ${result.partnership.commissionRevision} salva. Os dois corretores precisam confirmar novamente.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível revisar a divisão.");
    }
  };

  const handlePilotFeedbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setFeedbackBusy(true);
    try {
      const result = unwrap(await submitPilotFeedback({
        screen: activeTab,
        category: String(values.get("category") || ""),
        message: String(values.get("message") || ""),
      }));
      if (currentUser?.role === "admin") setPilotFeedbackList((items) => [{
        id: result.feedback.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userCreci: currentUser.creci,
        screen: activeTab,
        category: String(values.get("category") || ""),
        message: String(values.get("message") || ""),
        status: "novo",
        createdAt: new Date(result.feedback.createdAt),
      }, ...items]);
      form.reset();
      setIsFeedbackOpen(false);
      showToast("Obrigado. Seu feedback foi enviado para a equipe do piloto.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível enviar seu feedback.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const activeProperty = selectedPropertyForTerm;
  // Condição de parceria do imóvel (14/10/2026): o registro de visita só oferece a divisão que o captador aceita.
  const divisoesDoImovel = divisoesPermitidas(activeProperty?.partnershipModels);
  const modeloDaVisita = divisoesDoImovel.includes(commissionModel) ? commissionModel : divisoesDoImovel[0];

  if (currentView === "landing") {
    return (
      <LandingPage
        onAccessPlatform={(userData) => {
          resetWorkspaceView();
          if (userData) {
            setCurrentUser(userData);
            setUserList((prev) => [userData, ...prev.filter((u) => u.id !== userData.id)]);
          }
          setCurrentView("app");
        }}
      />
    );
  }

  return (
    <div className="negocialar-interior min-h-screen bg-slate-950 text-slate-100">
      {/* Top Banner quando não há usuário logado */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 font-medium text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>
              Faça login ou cadastre-se. Contas novas aguardam validação do CRECI.
            </span>
          </div>
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shrink-0 shadow-md flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Cadastrar / entrar</span>
          </button>
        </div>
      )}

      {/* Cabeçalho: fixo só a partir do tablet; no celular rola com a página para não tomar a tela. */}
      <header className="relative sm:sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg border border-amber-500/30">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="48px" className="object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 bg-white rounded-md px-2 py-0.5">Negocia<span className="text-amber-600">lar</span></span>
              <p className="hidden text-[11px] text-slate-400 sm:block">Rede de co-corretagem</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentUser && <button type="button" onClick={() => setIsSubscriptionOpen(true)} className="hidden md:inline-flex rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-white">Minha assinatura</button>}
            {currentUser && <button type="button" onClick={() => setIsFeedbackOpen(true)} aria-label="Ajuda e fale conosco" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-amber-500/40"><MessageSquarePlus className="h-4 w-4" /><span className="hidden md:inline">Ajuda</span></button>}

            <div className="relative" data-header-popover="">
              <button
                type="button"
                onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsUserSwitcherOpen(false); }}
                aria-label={bellCount ? `Notificações: ${bellCount} não lidas` : "Notificações"}
                aria-expanded={isNotificationsOpen}
                className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition"
              >
                <Bell className="w-4 h-4 text-slate-400" />
                {bellCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{bellCount}</span>}
              </button>
              {/* Dropdown do Sininho */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Notificações ({notifications.length + (billingAlert ? 1 : 0)})</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllRead()}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {billingAlert && (
                      <div role="status" className={`p-3.5 space-y-1.5 border-l-2 ${billingAlert.tone === "vencido" ? "border-red-500 bg-red-950/30" : "border-amber-500 bg-amber-950/20"}`}>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5"><CreditCard className={`w-3.5 h-3.5 ${billingAlert.tone === "vencido" ? "text-red-400" : "text-amber-400"}`} aria-hidden="true" />{billingAlert.title}</span>
                        <p className="text-xs text-slate-300 leading-relaxed">{billingAlert.message}</p>
                        <button type="button" onClick={() => { setIsNotificationsOpen(false); setIsSubscriptionOpen(true); }} className="text-[11px] font-bold text-amber-400 hover:underline">Abrir Minha assinatura</button>
                      </div>
                    )}
                    {notifications.length === 0 ? (
                      billingAlert ? null :
                      <div className="p-6 text-center text-xs text-slate-500">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          type="button"
                          key={notif.id}
                          onClick={() => void handleNotificationClick(notif)}
                          className={`block w-full text-left p-3.5 space-y-1.5 transition cursor-pointer hover:bg-slate-800/50 ${
                            notif.read ? "bg-slate-900/60 opacity-75" : "bg-amber-950/20 border-l-2 border-amber-500"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {notif.createdAt
                                ? new Date(notif.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Hoje"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                          {notif.propertyId && (
                            <div className="pt-1">
                              <span className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                                <span>Ver imóvel e ficha para o cliente</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" data-header-popover="">
              <button type="button" onClick={() => { setIsUserSwitcherOpen(!isUserSwitcherOpen); setIsNotificationsOpen(false); }} aria-haspopup="menu" aria-expanded={isUserSwitcherOpen} aria-label="Minha conta" className="flex items-center gap-2 sm:pl-3 sm:border-l border-slate-800 hover:bg-slate-800/50 p-1 rounded-xl transition">
                <Avatar name={currentBroker.name || "?"} url={currentBroker.avatar} size={34} />
                <span className="text-right text-xs hidden sm:block">
                  <span className="font-semibold text-white flex items-center gap-1">{currentBroker.name}<ChevronDown className="w-3.5 h-3.5 text-slate-400" /></span>
                  <span className="block text-slate-400 text-[11px]">{currentUser?.role === "admin" ? "Administração" : `CRECI ${currentBroker.creci}`}</span>
                </span>
              </button>
              {isUserSwitcherOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 bg-slate-950 border-b border-slate-800">
                    <div className="text-sm font-bold text-white">{currentBroker.name}</div>
                    <div className="text-xs text-slate-400">{currentUser?.role === "admin" ? "Administração SNNtech" : `CRECI ${currentBroker.creci} · plano ${planName(currentBroker.plan)}`}</div>
                    <div className="text-xs text-slate-400">{currentUser?.email}</div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button type="button" role="menuitem" onClick={() => { setIsUserSwitcherOpen(false); setIsSubscriptionOpen(true); }} className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Minha assinatura</button>
                    <ThemeSwitch />
                    <button type="button" role="menuitem" onClick={() => { setIsUserSwitcherOpen(false); setCurrentView("landing"); }} className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Ver o site do Negocia Lar</button>
                    <button type="button" role="menuitem" onClick={() => void handleLogout()} className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Sair <span className="font-normal text-slate-500">(encerra em todos os aparelhos)</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {/* No celular, uma faixa só que rola para o lado (antes eram 3 linhas de abas acima do conteúdo); os menus
            abertos são fixed no cabeçalho e não são cortados pela rolagem. */}
        <div ref={navRef} className="workspace-navigation max-w-7xl mx-auto flex items-center gap-2 border-t border-slate-800/60 px-4 py-1.5 sm:flex-wrap sm:px-6 lg:px-8 max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
          <button type="button" data-ativa={activeTab === "vitrine" ? "" : undefined} onClick={() => setActiveTab("vitrine")} className={`inline-flex h-9 items-center shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${activeTab === "vitrine" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Building2 className="mr-1.5 inline h-3.5 w-3.5" />Vitrine ({propertyTotal})
          </button>
          {[
            { title: "CRM", active: ["crm", "radar"], items: [{ id: "crm", label: "Minha carteira", icon: Users }, { id: "radar", label: "Radar de Compradores", icon: Radar }] },
            { title: "Atendimento", active: ["atendimento"], items: [{ id: "atendimento", label: "Funil de atendimento", icon: Users }] },
            { title: "Documentos", active: ["termo", "dvp"], items: [{ id: "termo", label: "Termo de Parceria", icon: FileText }, { id: "dvp", label: "Registro de Visita", icon: Stamp }] },
            { title: "Imóveis", active: ["cadastrar"], items: [{ id: "cadastrar", label: "Meus imóveis", icon: PlusCircle }] },
            { title: "Financeiro", active: ["financeiro"], items: [{ id: "financeiro", label: "Receitas e despesas", icon: Wallet }] },
            ...(currentUser?.role === "admin" ? [{ title: "Administração", active: ["admin"], items: [{ id: "admin", label: "Corretores e pagamentos", icon: UserCheck }] }] : []),
          ].map((menu, index) => (
            <details key={menu.title} name="workspace-navigation-menu" data-ativa={menu.active.includes(activeTab) ? "" : undefined} className="group relative shrink-0">
              <summary className={`flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition [&::-webkit-details-marker]:hidden ${menu.active.includes(activeTab) ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {menu.title}<ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className={`absolute top-full z-50 mt-1 w-56 rounded-xl max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto ${index >= 2 ? "sm:left-0" : "left-0"}`} data-menu=""><div className="rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl">
                {menu.items.map((item) => {
                  const MenuIcon = item.icon;
                  return <button key={item.id} type="button" onClick={(event) => { setActiveTab(item.id as typeof activeTab); event.currentTarget.closest("details")?.removeAttribute("open"); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${activeTab === item.id ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><MenuIcon className="h-4 w-4 shrink-0" />{item.label}</button>;
                })}
              </div></div>
            </details>
          ))}
        </div>
        {/* Abas abertas (15/10/2026), como no Flow: a tela de cada aba e um X para fechar; a Vitrine é a fixa. */}
        <div role="tablist" aria-label="Telas abertas" className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8 [scrollbar-width:none]">
          {abasAbertas.map((aba) => <div key={aba} className={`flex h-8 shrink-0 items-center rounded-md text-xs font-semibold ${aba === activeTab ? "bg-[#ffffff] text-[#083858]" : "bg-[#ffffff]/10 text-[#ffffff] hover:bg-[#ffffff]/20"}`}>
            <button type="button" role="tab" aria-selected={aba === activeTab} onClick={() => setActiveTab(aba)} className={`h-full ${aba === "vitrine" ? "px-3" : "pl-3 pr-1"}`}>{TAB_LABELS[aba]}</button>
            {aba !== "vitrine" && <button type="button" aria-label={`Fechar a aba ${TAB_LABELS[aba]}`} title="Fechar aba" onClick={() => fecharAbaDaTela(aba)}
              className="mr-1 flex h-6 w-6 items-center justify-center rounded hover:bg-[#083858]/15"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
          </div>)}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {blockedReason && (
          <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
            <p>{blockedReason}</p>
            {currentUser?.verificationStatus === "aprovado" && <button type="button" onClick={() => setIsSubscriptionOpen(true)} className="shrink-0 rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white">Abrir Minha assinatura</button>}
          </div>
        )}
        {SCREEN_GUIDANCE[activeTab] && (
          <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${activeTab === "dvp" ? "border-amber-500/40 bg-amber-950/25" : "border-sky-200 bg-sky-50"}`}>
            <Info className={`mt-0.5 h-4 w-4 shrink-0 ${activeTab === "dvp" ? "text-amber-300" : "text-sky-700"}`} />
            <div>
              <h2 className={`text-xs font-bold ${activeTab === "vitrine" ? "mls-guidance-title" : activeTab === "dvp" ? "text-amber-200" : "text-sky-900"}`}>{SCREEN_GUIDANCE[activeTab].title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{SCREEN_GUIDANCE[activeTab].description}</p>
            </div>
          </div>
        )}
        {activeTab !== "vitrine" && !workspaceReady && !workspaceError && <p role="status" className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-300">Carregando esta área...</p>}
        {workspaceError && <div role="alert" className="mb-6 rounded-xl border border-rose-500/40 p-5 text-sm text-rose-300"><p>{workspaceError}</p><button type="button" onClick={() => setReloadKey(key => key + 1)} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-white">Tentar novamente</button></div>}
        {workspaceReady && (activeTab === "crm" || activeTab === "atendimento") && (
          <LeadCRM
            key={activeTab}
            initialView={activeTab === "atendimento" ? "pipeline" : "overview"}
            initialLeads={leadList}
            initialActivities={leadActivityList}
            properties={propertyList.map((property) => ({ ...property, brokerId: property.broker.id }))}
            currentUserId={currentUser?.id || null}
            currentUserState={currentUser?.state || null}
            blockedReason={blockedReason}
            onCreateProperty={() => setActiveTab("cadastrar")}
            onOpenProperty={(propertyId) => {
              const property = propertyList.find((item) => item.id === propertyId);
              if (!property) return;
              setPropertyFilterPurpose("todos");
              setPropertyFilterType("todos");
              setPropertyFilterSearch(property.title);
              setActiveTab("vitrine");
              setPendingPropertyId(propertyId);
            }}
          />
        )}
        {workspaceReady && activeTab === "admin" && currentUser?.role === "admin" && (
          <AdminPanel users={userList} transactions={transactionList} feedback={pilotFeedbackList} currentUserId={currentUser.id}
            onUsersChange={setUserList} onTransactionsChange={setTransactionList} onFeedbackChange={setPilotFeedbackList} onMessage={(text) => showToast(text)} />
        )}

        {/* TAB 1: VITRINE MLS */}
        {activeTab === "vitrine" && <PropertyMarketplace properties={propertyList} propertyTotal={propertyTotal}
          propertyPage={propertyPage} loading={!workspaceReady} currentUserId={currentUser?.id || null} propertyTypes={PROPERTY_TYPES}
          propertyFilterPurpose={propertyFilterPurpose} propertyFilterType={propertyFilterType} propertyFilterSearch={propertyFilterSearch}
          setPropertyFilterPurpose={setPropertyFilterPurpose} setPropertyFilterType={setPropertyFilterType} setPropertyFilterSearch={setPropertyFilterSearch}
          setPropertyPage={setPropertyPage} onCreate={() => setActiveTab("cadastrar")} blockedReason={blockedReason} onShare={setSelectedPropertyForWhiteLabel}
          onSchedule={property => { setSelectedPropertyForTerm(property); setActiveTab("dvp"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          onEdit={property => { setImovelParaEditar(property.id); setActiveTab("cadastrar"); }} />}

        {/* TAB 2: RADAR DE COMPRADORES (MATCH REVERSO) */}
        {workspaceReady && activeTab === "radar" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-orange-700" />
                Radar de compradores
              </h2>
              <p className="text-sm text-slate-400">
                Cadastre o que seu cliente procura. O Radar compara os critérios com os imóveis de venda oferecidos para parceria e avisa no sino quando algum atende a todos.
              </p>
            </div>

            <BuyerProfileForm brokerState={currentUser?.state || "SP"} blockedReason={blockedReason}
              onCreated={(profile) => setRadarList((prev) => [{
                id: profile.id, clientInternalName: profile.clientInternalName, propertyType: profile.propertyType, city: profile.city,
                neighborhoods: (profile.neighborhoods as string[]) || [], maxBudget: profile.maxBudget, minBedrooms: profile.minBedrooms,
                minParkingSpots: profile.minParkingSpots, notes: profile.notes,
                broker: { id: currentBroker.id, name: currentBroker.name, creci: currentBroker.creci, whatsapp: currentBroker.whatsapp },
              }, ...prev])} />

            <RadarMatches properties={propertyList} profiles={radarList} currentUserId={currentUser?.id || null}
              onOpenProperty={(propertyId) => {
                const property = propertyList.find(item => item.id === propertyId);
                if (!property) return;
                setPropertyFilterPurpose("todos"); setPropertyFilterType("todos"); setPropertyFilterSearch(property.title);
                setPendingPropertyId(propertyId); setActiveTab("vitrine");
              }}
              onShareProperty={(propertyId) => {
                const property = propertyList.find(item => item.id === propertyId);
                if (property) setSelectedPropertyForWhiteLabel(property);
              }} />

            {/* LISTA DE PROCURAS REAIS CADASTRADAS NO BANCO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Procuras na rede ({radarList.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Suas procuras e as de corretores aprovados</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {radarList.map((bp) => (
                  <div key={bp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{bp.clientInternalName}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        No Radar
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div><strong className="text-slate-300">Tipo:</strong> {bp.propertyType} • {bp.city}</div>
                      <div>
                        <strong className="text-slate-300">Orçamento:</strong>{" "}
                        <span className="text-amber-400 font-mono font-bold">{formatBRL(bp.maxBudget)}</span>
                      </div>
                      <div>
                        <strong className="text-slate-300">Mínimo:</strong> {bp.minBedrooms} {bp.minBedrooms === 1 ? "quarto" : "quartos"}, {bp.minParkingSpots} {bp.minParkingSpots === 1 ? "vaga" : "vagas"}
                      </div>
                      {bp.notes && <div className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">&ldquo;{bp.notes}&rdquo;</div>}
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Corretor: <span className="text-white font-medium">{bp.broker.name}</span></span>
                      <span className="font-mono text-amber-400">CRECI {bp.broker.creci}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TERMO DE PARCERIA (aceite eletrônico dos dois corretores) */}
        {workspaceReady && activeTab === "termo" && <PartnershipTerms />}

        {/* TAB 4: DVP DIGITAL (DOCUMENTO DE VISITA PRESENCIAL) */}
        {workspaceReady && activeTab === "dvp" && (
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

            <form
              id="dvp-visit-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!activeProperty || activeProperty.broker.id === currentBroker.id || !activeProperty.acceptsPartnership) {
                  showToast("Escolha na Vitrine um imóvel de outro corretor que aceite parceria.");
                  return;
                }
                if (blockedReason) { showToast(blockedReason); return; }
                const form = e.currentTarget;
                const fd = new FormData(form);
                const clientName = fd.get("clientName") as string;
                const clientPhone = fd.get("clientPhone") as string;
                const clientCpf = fd.get("clientCpf") as string;
                const visitDateValue = fd.get("visitDate") as string;
                // O campo traz a hora local sem fuso; toISOString leva o instante certo ao servidor.
                const visitDate = (visitDateValue ? new Date(visitDateValue) : new Date()).toISOString();

                let res;
                try {
                res = unwrap(await createDvpCertificate({
                  propertyId: activeProperty.id,
                  captorBrokerId: activeProperty.broker.id,
                  partnerBrokerId: currentBroker.id,
                  clientName,
                  clientPhone,
                  clientCpfPartial: clientCpf,
                  visitDate,
                  commissionSplit: activeProperty.splitPercentage || "50.00",
                  commissionModel: modeloDaVisita,
                  externalReferrerName: String(fd.get("externalReferrerName") || ""),
                  externalReferrerCreci: String(fd.get("externalReferrerCreci") || ""),
                  externalReferrerWhatsapp: String(fd.get("externalReferrerWhatsapp") || ""),
                }));
                } catch (error) {
                  showToast(error instanceof Error ? error.message : "Não foi possível salvar o registro da visita.");
                  return;
                }

                if (res.success && res.certificate) {
                  setDvpList((prev) => [
                    {
                      id: res.certificate.id,
                      certificateHash: res.certificate.certificateHash,
                      propertyId: res.certificate.propertyId,
                      captorBrokerId: res.certificate.captorBrokerId,
                      partnerBrokerId: res.certificate.partnerBrokerId,
                      clientName: res.certificate.clientName,
                      clientCpfPartial: res.certificate.clientCpfPartial,
                      visitDate: new Date(res.certificate.visitDate),
                      lockExpirationDate: new Date(res.certificate.lockExpirationDate),
                      commissionSplit: res.certificate.commissionSplit,
                      commissionModel: res.certificate.commissionModel,
                      captorCommissionPercent: res.certificate.captorCommissionPercent,
                      partnerCommissionPercent: res.certificate.partnerCommissionPercent,
                      referrerCommissionPercent: res.certificate.referrerCommissionPercent,
                      externalReferrerName: res.certificate.externalReferrerName,
                      externalReferrerCreci: res.certificate.externalReferrerCreci,
                      externalReferrerWhatsapp: res.certificate.externalReferrerWhatsapp,
                      status: res.certificate.status,
                      createdAt: new Date(res.certificate.createdAt),
                    },
                    ...prev,
                  ]);
                  if (res.partnership && res.partnershipActivity) {
                    setPartnershipList((prev) => [{
                      ...res.partnership,
                      propertyTitle: activeProperty.title,
                      captorName: activeProperty.broker.name,
                      partnerName: currentBroker.name,
                    }, ...prev]);
                    setPartnershipActivityList((prev) => [{
                      ...res.partnershipActivity,
                      partnershipId: res.partnership.id,
                      actorUserId: currentBroker.id,
                      actorName: currentBroker.name,
                    }, ...prev]);
                  }
                  setDvpEmitted(true);
                  showToast(modeloDaVisita === "three_party_referral_40_40_20"
                    ? `Registro salvo. A divisão 40/40/20 aguarda a confirmação dos dois corretores na plataforma.`
                    : `Registro ${res.certificate.certificateHash} salvo como rascunho; ainda não há aceite eletrônico.`);
                }
              }}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl"
            >
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <Fingerprint className="w-4 h-4" />
                  Registro da visita em rascunho
                </div>
                <span className="text-[11px] text-slate-400">Sem assinatura eletrônica</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Imóvel escolhido para a visita</div>
                  {activeProperty ? <><div className="text-sm font-bold text-white">{activeProperty.title}</div><div className="text-xs text-amber-400">{activeProperty.neighborhood}, {activeProperty.city}</div><div className="text-[11px] text-slate-500 pt-1">Captador: {activeProperty.broker.name} (CRECI {activeProperty.broker.creci})</div></> : <><div className="text-sm font-semibold text-amber-200">Nenhum imóvel selecionado</div><p className="text-[11px] text-slate-400">Abra a Vitrine e escolha um imóvel de outro corretor.</p><button type="button" onClick={() => { setActiveTab("vitrine"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-2 rounded-lg bg-amber-500 px-3 py-2 text-[11px] font-bold text-slate-950">Escolher imóvel na Vitrine</button></>}
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Corretor Solicitante:</div>
                  <div className="text-sm font-bold text-white">{currentBroker.name}</div>
                  <div className="text-xs text-emerald-400">CRECI {currentBroker.creci} • divisão cadastrada no imóvel</div>
                </div>
              </div>

              {/* Dados do Cliente Visitante */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Dados do Cliente Apresentado para Registro
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
                  <div>
                    <label htmlFor="commission-model" className="block text-xs font-semibold text-slate-200">Como a comissão será dividida?</label>
                    <select id="commission-model" value={modeloDaVisita} onChange={(event) => setCommissionModel(event.target.value as typeof commissionModel)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white">
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
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo do Cliente</label>
                    <input
                      name="clientName"
                      required
                      placeholder="Nome do cliente"
                      defaultValue=""
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="dvp-cpf" className="block text-xs font-medium text-slate-300 mb-1">CPF do cliente (fica mascarado — LGPD)</label>
                    <CpfParcialInput id="dvp-cpf" name="clientCpf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp do Cliente</label>
                    <input
                      name="clientPhone"
                      placeholder="(DDD) número"
                      defaultValue=""
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Data e Hora da Visita</label>
                  <input
                    name="visitDate"
                    type="datetime-local"
                    defaultValue={defaultVisitDate}
                    className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!!blockedReason}
                  title={blockedReason || undefined}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                >
                  <Stamp className="w-5 h-5" />
                  Salvar rascunho da visita
                </button>
              </div>
            </form>

            {/* LISTA DE CERTIFICADOS DVP REGISTRADOS NO BANCO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Registros de visita ({dvpList.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Registros internos de visita</span>
              </div>

              {dvpList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nenhuma visita registrada. Escolha um imóvel de outro corretor na Vitrine e clique em “Agendar visita”.
                </div>
              ) : (
                <div className="space-y-3">
                  {dvpList.map((dvp) => (
                    <div key={dvp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          {dvp.certificateHash}
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          {dvp.status === "rascunho" ? "Rascunho • nenhum aceite registrado" : dvp.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div><strong>Cliente:</strong> {dvp.clientName} (CPF: {dvp.clientCpfPartial})</div>
                        <div><strong>Data da Visita:</strong> {new Date(dvp.visitDate).toLocaleDateString("pt-BR")}</div>
                        <div><strong>Prazo de acompanhamento interno:</strong> {new Date(dvp.lockExpirationDate).toLocaleDateString("pt-BR")} <span className="text-slate-500">(não cria uma trava contratual)</span></div>
                        <div className="sm:col-span-2"><strong>Divisão informada:</strong> {dvp.commissionModel === "three_party_referral_40_40_20" ? `Captador ${dvp.captorCommissionPercent}% · corretor do comprador ${dvp.partnerCommissionPercent}% · indicador externo ${dvp.referrerCommissionPercent}% (${dvp.externalReferrerName}, CRECI ${dvp.externalReferrerCreci}${dvp.externalReferrerWhatsapp ? `, WhatsApp ${dvp.externalReferrerWhatsapp}` : ""})` : `${dvp.captorCommissionPercent}% captador · ${dvp.partnerCommissionPercent}% corretor do comprador`} <span className="text-slate-500">{dvp.commissionModel === "three_party_referral_40_40_20" ? "(aguardando confirmação dos dois corretores)" : "(condição cadastrada, a combinar entre as partes)"}</span></div>
                      </div>
                      {currentUser?.id === dvp.partnerBrokerId && <div className="pt-1"><VisitControlPrint dvpId={dvp.id} /></div>}
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
              {partnershipList.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 px-5 py-6 text-center"><p className="text-sm font-semibold text-white">Ainda não há parcerias para acompanhar.</p><p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400">Os registros aparecem aqui depois que você salva uma visita a um imóvel de outro corretor. Na Vitrine, escolha um imóvel que aceite parceria, clique em “Agendar visita” e preencha os dados do cliente. Salvar como rascunho só guarda essas informações; nenhum corretor dá aceite por essa ação.</p><button type="button" onClick={() => { setActiveTab("vitrine"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"><Building2 className="h-4 w-4" />Escolher imóvel na Vitrine</button></div> : (
                <div className="space-y-3">
                  {partnershipList.map((partnership) => {
                    const transitions: Record<string, string[]> = { proposta: ["visita_agendada", "recusado"], visita_agendada: ["em_negociacao", "recusado"], em_negociacao: ["fechado", "recusado"] };
                    const labels: Record<string, string> = { proposta: "Proposta", visita_agendada: "Visita agendada", em_negociacao: "Em negociação", fechado: "Encerrada como fechada", recusado: "Recusada", divisao_confirmada: "Divisão confirmada por um corretor", divisao_confirmada_um: "Divisão confirmada por um corretor", divisao_confirmada_ambos: "Divisão confirmada pelos dois", divisao_recusada: "Divisão não aceita", divisao_revisada: "Divisão revisada", termo_aceito: "Termo de Parceria aceito", termo_aceito_ambos: "Termo de Parceria assinado pelos dois" };
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
                          {currentUser?.id === partnership.captorBrokerId && !partnership.captorAcceptedAt && <><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, true)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-slate-950">Confirmar divisão (captador)</button><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, false)} className="rounded-lg border border-rose-500/40 px-3 py-2 text-[11px] font-semibold text-rose-300">Não aceito</button></>}
                          {currentUser?.id === partnership.partnerBrokerId && !partnership.partnerAcceptedAt && <><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, true)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-slate-950">Confirmar divisão (parceiro)</button><button type="button" onClick={() => void handlePartnershipSplitResponse(partnership, false)} className="rounded-lg border border-rose-500/40 px-3 py-2 text-[11px] font-semibold text-rose-300">Não aceito</button></>}
                        </div>}
                        {partnership.captorAcceptedAt && partnership.partnerAcceptedAt && <p className="text-[11px] font-semibold text-emerald-300">Os dois corretores confirmaram esta proposta.</p>}
                        {(currentUser?.id === partnership.captorBrokerId || currentUser?.id === partnership.partnerBrokerId) && partnership.status !== "fechado" && partnership.status !== "recusado" && <details className="border-t border-amber-500/15 pt-3"><summary className="cursor-pointer text-[11px] font-semibold text-amber-200">Revisar proposta de divisão</summary><form onSubmit={(event) => void handleRevisePartnershipCommission(partnership, event)} className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="text-[10px] text-slate-300">Modelo<select name="commissionModel" defaultValue={partnership.commissionModel} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white">{divisoesPermitidas(partnership.propertyPartnershipModels).includes("two_party_50_50") && <option value="two_party_50_50">50% / 50%</option>}{divisoesPermitidas(partnership.propertyPartnershipModels).includes("three_party_referral_40_40_20") && <option value="three_party_referral_40_40_20">40% / 40% / 20%</option>}</select><span className="mt-1 block text-[10px] text-slate-400">{rotuloDaCondicao(partnership.propertyPartnershipModels)}</span></label>
                          <label className="text-[10px] text-slate-300">Nome do indicador externo (se houver)<input name="externalReferrerName" defaultValue={partnership.externalReferrerName || ""} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                          <label className="text-[10px] text-slate-300">CRECI do indicador<input name="externalReferrerCreci" defaultValue={partnership.externalReferrerCreci || ""} maxLength={40} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                          <label className="text-[10px] text-slate-300">WhatsApp do indicador<input name="externalReferrerWhatsapp" defaultValue={partnership.externalReferrerWhatsapp || ""} maxLength={30} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></label>
                          <button className="sm:col-span-2 rounded-lg border border-amber-500/40 px-3 py-2 text-[11px] font-bold text-amber-200 hover:bg-amber-500/10">Salvar nova versão e pedir confirmação dos dois</button>
                        </form></details>}
                      </div>
                      {nextStatuses.length > 0 && (currentUser?.id === partnership.captorBrokerId || currentUser?.id === partnership.partnerBrokerId) && <div className="mt-3 flex flex-wrap gap-2">{nextStatuses.map((nextStatus) => <button key={nextStatus} type="button" onClick={() => { if (nextStatus === "fechado") { openClosing(partnership); return; } void handlePartnershipStatus(partnership, nextStatus, labels[nextStatus]); }} className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${nextStatus === "recusado" ? "border-rose-500/25 text-rose-300 hover:bg-rose-500/10" : "border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10"}`}>{nextStatus === "recusado" ? "Recusar" : `Marcar: ${labels[nextStatus]}`}</button>)}</div>}
                      {closing?.id === partnership.id && <PartnershipClosingForm partnership={partnership} value={closing} onChange={setClosing} onSubmit={(event) => void handleClosePartnership(partnership, event)} onCancel={() => setClosing(null)} />}
                      {partnership.status === "fechado" && partnership.commissionTotal && <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-950/10 p-2 text-[11px] text-slate-300">Comissão total {Number(partnership.commissionTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{partnership.commissionExpectedDate ? `, prevista para ${partnership.commissionExpectedDate.split("-").reverse().join("/")}` : ""}. A parte de cada corretor está no Financeiro dele.</p>}
                      <details className="mt-3 border-t border-slate-800 pt-3"><summary className="cursor-pointer text-[11px] font-semibold text-slate-300">Linha do tempo ({history.length})</summary><div className="mt-3 space-y-2">{history.length ? history.map((activity) => <div key={activity.id} className="border-l border-slate-700 pl-3 text-[11px]"><div className="flex flex-wrap items-center justify-between gap-2 text-slate-300"><span>{activity.actorName}: {labels[activity.newStatus] || activity.newStatus}</span><time className="text-slate-500">{new Date(activity.createdAt).toLocaleString("pt-BR")}</time></div>{activity.note && <p className="mt-1 whitespace-pre-wrap text-slate-500">{activity.note}</p>}</div>) : <p className="text-[11px] text-slate-500">Nenhum evento registrado.</p>}</div></details>
                    </article>;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meus imóveis: carteira e cadastro */}
        {workspaceReady && activeTab === "financeiro" && currentUser && (
          <div className="max-w-5xl mx-auto"><BrokerFinance blockedReason={blockedReason} onMessage={(text) => showToast(text)} /></div>
        )}

        {activeTab === "cadastrar" && (
          <div className="max-w-3xl mx-auto space-y-6">
            {currentUser ? <>
              <PropertyInventory reloadKey={reloadKey} onChanged={() => setReloadKey(value => value + 1)} abrirImovelId={imovelParaEditar} aoAbrir={imovelAberto} />
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><PlusCircle className="w-5 h-5 text-amber-500" />Cadastrar imóvel</h2>
                <p className="text-sm text-slate-400">Endereço completo e dados do proprietário ficam visíveis só para você. Campos com * são obrigatórios.</p>
              </div>
              <PropertyCreateForm key={reloadKey} broker={{ name: currentUser.name, city: currentUser.city, state: currentUser.state }} blockedReason={blockedReason} onMessage={(text) => showToast(text)}
                onCreated={(property) => {
                  setPropertyTotal(total => total + 1);
                  setPropertyList((prev) => [{ ...property, broker: { id: currentBroker.id, name: currentBroker.name, creci: currentBroker.creci, whatsapp: currentBroker.whatsapp, avatarUrl: currentBroker.avatar || null, city: property.city } }, ...prev]);
                  setReloadKey(value => value + 1);
                  showToast(property.acceptsPartnership ? "Imóvel publicado na vitrine da rede." : "Imóvel salvo na sua carteira.");
                  setActiveTab("vitrine");
                }} />
            </> : (
              <div className="bg-slate-900 border-2 border-dashed border-amber-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                <h3 className="text-xl font-bold text-white">Entre ou cadastre-se para cadastrar imóveis</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">O cadastro de imóveis é feito por corretores com CRECI.</p>
                <button type="button" onClick={() => setIsOnboardingModalOpen(true)} className="bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-6 rounded-xl text-sm inline-flex items-center gap-2"><UserPlus className="w-4 h-4" /><span>Entrar ou cadastrar</span></button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE COMPARTILHAMENTO WHITE-LABEL */}
      {selectedPropertyForWhiteLabel && <WhiteLabelSheet key={selectedPropertyForWhiteLabel.id} property={selectedPropertyForWhiteLabel} broker={currentBroker} onClose={() => setSelectedPropertyForWhiteLabel(null)} />}

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md bg-slate-900 border border-slate-700 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
          <p className="flex-1 text-sm text-slate-200 leading-snug">{toastMessage}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs p-1 font-bold">✕</button>
        </div>
      )}

      {/* Modal de Onboarding Direto */}
      {isSubscriptionOpen && <SubscriptionPanel onClose={() => setIsSubscriptionOpen(false)} />}
      {currentUser && billingAlert && clock !== null && !isSubscriptionOpen && <BillingPopup userId={currentUser.id} notice={billingAlert} pendingPix={!!currentUser.pendingPix} now={new Date(clock)}
        plan={currentUser.plan} hasPaid={!!currentUser.hasPaid} billingCycle={currentUser.billingCycle}
        onRegistered={() => setCurrentUser((user) => user && { ...user, pendingPix: true })} onOpenSubscription={() => setIsSubscriptionOpen(true)} onMessage={(text) => showToast(text)} />}
      <DialogHost />
      {isFeedbackOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="pilot-feedback-title"><form onSubmit={(event) => void handlePilotFeedbackSubmit(event)} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="pilot-feedback-title" className="text-lg font-bold text-white">Ajuda e fale conosco</h2><p className="mt-1 text-xs text-slate-400">Envie uma dúvida, relate um problema ou sugira uma melhoria. Sua mensagem e a tela atual ficam disponíveis para a equipe no painel administrativo.</p></div><BotaoFechar onClick={fecharSugestao} /></div><label className="block text-xs font-semibold text-slate-300">Tipo<select name="category" required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="duvida">Dúvida</option><option value="erro">Encontrei um erro</option><option value="ideia">Sugestão de melhoria</option></select></label><label className="block text-xs font-semibold text-slate-300">O que aconteceu ou o que você sugere?<textarea name="message" required minLength={10} maxLength={2000} rows={5} placeholder="Descreva o que tentou fazer e o que ficou confuso…" className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsFeedbackOpen(false)} className="rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Cancelar</button><button disabled={feedbackBusy} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{feedbackBusy ? "Enviando…" : "Enviar feedback"}</button></div></form></div>}
      {isOnboardingModalOpen && <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={(newUserData) => {
          resetWorkspaceView();
          setCurrentUser(newUserData);
          setUserList((prev) => [newUserData, ...prev.filter((u) => u.id !== newUserData.id)]);
          setIsOnboardingModalOpen(false);
          showToast(`Cadastro criado. Bem-vindo(a), ${newUserData.name}.`);
        }}
      />}
    </div>
  );
}
