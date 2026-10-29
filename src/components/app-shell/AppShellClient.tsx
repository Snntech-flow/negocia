"use client";

// Fase 1 — chrome compartilhada das rotas logadas (header + sino + abas-por-rota + modais), extraída do
// NegociaLarApp. Cada rota sob (app)/ renderiza só a sua tela; o shell cuida da navegação e dos modais.
// A aba ativa vem da URL (usePathname); a barra de "abas abertas" (estilo Flow) persiste em sessionStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, Bell, Building2, ChevronDown, CreditCard, FileText, MessageSquarePlus, PlusCircle, Radar, Stamp, UserCheck, Users, Wallet, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import BotaoFechar from "@/components/BotaoFechar";
import DialogHost from "@/components/DialogHost";
import BillingPopup from "@/components/BillingPopup";
import { abasGuardadas, abrirAba, fecharAba, mostrarBarraDeAbas } from "@/lib/abas";
import { useVoltarFecha } from "@/lib/use-voltar-fecha";
import { logoutUser, markAllNotificationsAsRead, markNotificationAsRead, submitPilotFeedback } from "@/lib/actions";
import { unwrap } from "@/lib/action-result";
import { billingNotice } from "@/lib/subscription";
import { blockedReasonFor } from "@/lib/workspace-access";
import { planName } from "@/lib/plans";
import { readThemeChoice, saveThemeChoice, THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import type { WorkspaceNotification, WorkspaceSessionUser } from "@/lib/workspace-types";

const SubscriptionPanel = dynamic(() => import("@/components/SubscriptionPanel"));

export type WorkspaceTab = "vitrine" | "crm" | "radar" | "cadastrar" | "termo" | "dvp" | "financeiro" | "admin";

const TAB_LABELS: Record<WorkspaceTab, string> = { vitrine: "Vitrine", crm: "Minha carteira", radar: "Radar de Compradores",
  cadastrar: "Meus imóveis", termo: "Termo de Parceria", dvp: "Registro de Visita",
  financeiro: "Receitas e despesas", admin: "Corretores e pagamentos" };

const href = (tab: WorkspaceTab) => `/${tab}`;

function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChoice(readThemeChoice()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="px-3 py-2">
    <p className="mb-1.5 text-[11px] font-semibold text-slate-400">Tema</p>
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
      {THEME_CHOICES.map((option) => <button key={option.id} type="button" role="radio" aria-checked={choice === option.id}
        onClick={() => { saveThemeChoice(option.id); setChoice(option.id); }}
        className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${choice === option.id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{option.label}</button>)}
    </div>
  </div>;
}

export default function AppShellClient({ currentUser, initialNotifications, propertyTotal, children }: {
  currentUser: WorkspaceSessionUser;
  initialNotifications: WorkspaceNotification[];
  propertyTotal: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const veAdmin = currentUser.role === "admin" || currentUser.adminViewAccess === true;
  const abasPermitidas = useMemo<WorkspaceTab[]>(() => ["vitrine", "crm", "radar", "cadastrar", "termo", "dvp", "financeiro", ...(veAdmin ? ["admin" as const] : [])], [veAdmin]);

  // Aba ativa = primeira parte do caminho (/vitrine → vitrine); fora das telas conhecidas, nenhuma fica marcada.
  const activeTab = useMemo<WorkspaceTab | null>(() => {
    const seg = (pathname || "/").split("/")[1] as WorkspaceTab;
    return abasPermitidas.includes(seg) ? seg : null;
  }, [pathname, abasPermitidas]);

  const [notifications, setNotifications] = useState(initialNotifications);
  useEffect(() => { setNotifications(initialNotifications); }, [initialNotifications]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((text: string, milliseconds = 6000) => {
    setToastMessage(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), milliseconds);
  }, []);

  // Relógio para o aviso da mensalidade (só depois de montar, para não divergir do servidor).
  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setClock(Date.now()));
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);

  // Abas abertas (estilo Flow): a Vitrine é fixa; as demais abrem ao navegar e podem ser fechadas com o X.
  const [abasAbertas, setAbasAbertas] = useState<WorkspaceTab[]>(["vitrine"]);
  useEffect(() => {
    let abasSalvas: unknown = null;
    try { abasSalvas = JSON.parse(sessionStorage.getItem(`negocialar-abas:${currentUser.id}`) || "null"); } catch {}
    const base = abasGuardadas<WorkspaceTab>(abasSalvas, abasPermitidas, "vitrine");
    setAbasAbertas(activeTab ? abrirAba(base, activeTab) : base);
  }, [currentUser.id, abasPermitidas]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeTab) return;
    setAbasAbertas((abertas) => {
      const proximas = abrirAba(abertas, activeTab);
      try { sessionStorage.setItem(`negocialar-abas:${currentUser.id}`, JSON.stringify(proximas)); } catch {}
      return proximas;
    });
  }, [activeTab, currentUser.id]);
  const fecharAbaDaTela = (aba: WorkspaceTab) => {
    const resultado = fecharAba(abasAbertas, aba, activeTab ?? "vitrine", "vitrine");
    setAbasAbertas(resultado.abertas);
    try { sessionStorage.setItem(`negocialar-abas:${currentUser.id}`, JSON.stringify(resultado.abertas)); } catch {}
    if (aba === activeTab && resultado.ativa !== activeTab) router.push(href(resultado.ativa));
  };

  // Fecha os popovers (sino, conta) e os menus do nav ao clicar fora.
  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      const alvo = event.target as HTMLElement;
      if (!alvo.closest("[data-header-popover]")) { setIsNotificationsOpen(false); setIsUserSwitcherOpen(false); }
      if (!alvo.closest(".workspace-navigation")) document.querySelectorAll<HTMLDetailsElement>(".workspace-navigation details[open]").forEach((menu) => { menu.open = false; });
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, []);
  // Ao trocar de rota, fecha os menus e popovers abertos.
  useEffect(() => {
    setIsNotificationsOpen(false); setIsUserSwitcherOpen(false);
    document.querySelectorAll<HTMLDetailsElement>(".workspace-navigation details[open]").forEach((menu) => { menu.open = false; });
  }, [pathname]);

  const handleLogout = async () => {
    try { unwrap(await logoutUser()); } catch { /* a sessão local sai de qualquer forma */ }
    router.push("/");
    router.refresh();
  };

  const handleNotificationClick = async (notif: WorkspaceNotification) => {
    if (!notif.read) {
      try {
        unwrap(await markNotificationAsRead(notif.id));
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível marcar como lida."); }
    }
    setIsNotificationsOpen(false);
    if (notif.type === "dvp") router.push(`${href("dvp")}#acompanhamento-parcerias`);
    else if (notif.propertyId) router.push(`${href("vitrine")}?ficha=${notif.propertyId}`);
  };

  const handleMarkAllRead = async () => {
    try {
      unwrap(await markAllNotificationsAsRead());
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível marcar as notificações."); }
  };

  const handlePilotFeedbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setFeedbackBusy(true);
    try {
      unwrap(await submitPilotFeedback({ screen: activeTab ?? "vitrine", category: String(values.get("category") || ""), message: String(values.get("message") || "") }));
      form.reset();
      setIsFeedbackOpen(false);
      showToast("Obrigado. Seu feedback foi enviado para a equipe do piloto.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível enviar seu feedback.");
    } finally { setFeedbackBusy(false); }
  };
  const fecharSugestao = useVoltarFecha(() => setIsFeedbackOpen(false), isFeedbackOpen);

  const currentBroker = { name: currentUser.name || "", creci: currentUser.creci || "", avatar: currentUser.avatarUrl || "", plan: currentUser.plan || "" };
  const unreadCount = notifications.filter((n) => !n.read).length;
  const accessExpiresAt = currentUser.nextBillingDate ? new Date(currentUser.nextBillingDate) : null;
  const billingAlert = clock !== null && currentUser.hasPaid !== undefined ? billingNotice({
    role: currentUser.role, subscriptionStatus: currentUser.subscriptionStatus, nextBillingDate: accessExpiresAt,
    billingExemptAt: currentUser.billingExemptAt ? new Date(currentUser.billingExemptAt) : null,
    plan: currentUser.plan, billingCycle: currentUser.billingCycle, priceTable: currentUser.priceTable, hasPaid: currentUser.hasPaid, pendingPix: !!currentUser.pendingPix,
  }, new Date(clock)) : null;
  const bellCount = unreadCount + (billingAlert ? 1 : 0);
  const blockedReason = blockedReasonFor(currentUser);

  // Sem o menu "Atendimento" (28/10/2026, Sidney: "o CRM tem o funil e o Atendimento tem o mesmo funil"): era a mesma tela do
  // CRM aberta na aba Funil. O endereço /atendimento leva ao CRM já no Funil.
  const navMenus: { title: string; active: WorkspaceTab[]; items: { id: WorkspaceTab; label: string; icon: typeof Users }[] }[] = [
    { title: "CRM", active: ["crm", "radar"], items: [{ id: "crm", label: "Minha carteira", icon: Users }, { id: "radar", label: "Radar de Compradores", icon: Radar }] },
    { title: "Documentos", active: ["termo", "dvp"], items: [{ id: "termo", label: "Termo de Parceria", icon: FileText }, { id: "dvp", label: "Registro de Visita", icon: Stamp }] },
    { title: "Imóveis", active: ["cadastrar"], items: [{ id: "cadastrar", label: "Meus imóveis", icon: PlusCircle }] },
    { title: "Financeiro", active: ["financeiro"], items: [{ id: "financeiro", label: "Receitas e despesas", icon: Wallet }] },
    ...(veAdmin ? [{ title: "Administração", active: ["admin" as WorkspaceTab], items: [{ id: "admin" as WorkspaceTab, label: "Corretores e pagamentos", icon: UserCheck }] }] : []),
  ];

  return (
    <div className="negocialar-interior min-h-screen bg-slate-950 text-slate-100">
      <header className="relative sm:sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <Link href={href("vitrine")} className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg border border-amber-500/30">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="48px" className="object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 bg-white rounded-md px-2 py-0.5">Negocia<span className="text-amber-600">lar</span></span>
              <p className="hidden text-[11px] text-slate-400 sm:block">Rede de co-corretagem</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setIsSubscriptionOpen(true)} className="hidden md:inline-flex rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-white">Minha assinatura</button>
            <button type="button" onClick={() => setIsFeedbackOpen(true)} aria-label="Ajuda e fale conosco" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-amber-500/40"><MessageSquarePlus className="h-4 w-4" /><span className="hidden md:inline">Ajuda</span></button>

            <div className="relative" data-header-popover="">
              <button type="button" onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsUserSwitcherOpen(false); }}
                aria-label={bellCount ? `Notificações: ${bellCount} não lidas` : "Notificações"} aria-expanded={isNotificationsOpen}
                className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition">
                <Bell className="w-4 h-4 text-slate-400" />
                {bellCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{bellCount}</span>}
              </button>
              {/* Notificações em LARANJA, texto azul-marinho (28/10/2026, Sidney: "o branco está muito fraco; notificação tem que
                  chamar mais a atenção e ser melhor para ler"). Cores fixas: o tema do cabeçalho repinta as classes slate e amber.
                  Não lida: laranja forte, faixa marinho e bolinha; lida: laranja claro, sem transparência. */}
              {isNotificationsOpen && (
                <div data-painel-notificacoes="" className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-96 rounded-2xl border-2 border-[#d97706] bg-[#f59e0b] text-[#083858] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3.5 border-b-2 border-[#083858]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-[#083858]" /><span className="text-sm font-bold text-[#083858]">Notificações ({notifications.length + (billingAlert ? 1 : 0)})</span></div>
                    {unreadCount > 0 && <button type="button" onClick={() => void handleMarkAllRead()} className="text-[11px] font-bold text-[#083858] underline hover:no-underline">Marcar todas como lidas</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#083858]/15">
                    {billingAlert && (
                      <div role="status" className={`p-3.5 space-y-1.5 border-l-4 ${billingAlert.tone === "vencido" ? "border-[#b91c1c] bg-[#fecaca]" : "border-[#083858] bg-[#f59e0b]"}`}>
                        <span className="text-sm font-bold text-[#083858] flex items-center gap-1.5"><CreditCard className={`w-4 h-4 ${billingAlert.tone === "vencido" ? "text-[#b91c1c]" : "text-[#083858]"}`} aria-hidden="true" />{billingAlert.title}</span>
                        <p className="text-[13px] font-medium text-[#083858] leading-relaxed">{billingAlert.message}</p>
                        <button type="button" onClick={() => { setIsNotificationsOpen(false); setIsSubscriptionOpen(true); }} className="text-xs font-bold text-[#083858] underline hover:no-underline">Abrir Minha assinatura</button>
                      </div>
                    )}
                    {notifications.length === 0 ? (billingAlert ? null : <div className="p-6 text-center text-[13px] font-medium text-[#083858]">Nenhuma notificação no momento.</div>) : (
                      notifications.map((notif) => (
                        <button type="button" key={notif.id} onClick={() => void handleNotificationClick(notif)}
                          className={`block w-full text-left p-3.5 space-y-1.5 transition cursor-pointer ${notif.read ? "bg-[#fcd34d] hover:bg-[#fde68a]" : "bg-[#f59e0b] border-l-4 border-[#083858] hover:bg-[#fbbf24]"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#083858] flex items-center gap-1.5">{!notif.read && <span className="w-2 h-2 shrink-0 rounded-full bg-[#083858]"></span>}{notif.title}</span>
                            <span className="shrink-0 text-[11px] font-semibold text-[#083858] font-mono">{notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Hoje"}</span>
                          </div>
                          <p className="text-[13px] font-medium text-[#083858] leading-relaxed">{notif.message}</p>
                          {notif.propertyId && <div className="pt-1"><span className="text-xs font-bold text-[#083858] underline flex items-center gap-1"><span>Ver imóvel e ficha para o cliente</span><ArrowRight className="w-3.5 h-3.5" /></span></div>}
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
                  <span className="block text-slate-400 text-[11px]">{currentUser.role === "admin" ? "Administração" : `CRECI ${currentBroker.creci}`}</span>
                </span>
              </button>
              {isUserSwitcherOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 bg-slate-950 border-b border-slate-800">
                    <div className="text-sm font-bold text-white">{currentBroker.name}</div>
                    <div className="text-xs text-slate-400">{currentUser.role === "admin" ? "Administração SNNtech" : `CRECI ${currentBroker.creci} · plano ${planName(currentBroker.plan)}`}</div>
                    <div className="text-xs text-slate-400">{currentUser.email}</div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button type="button" role="menuitem" onClick={() => { setIsUserSwitcherOpen(false); setIsSubscriptionOpen(true); }} className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Minha assinatura</button>
                    <ThemeSwitch />
                    <Link href="/?site=1" className="block w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Ver o site do Negocia Lar</Link>
                    <button type="button" role="menuitem" onClick={() => void handleLogout()} className="w-full py-2 px-3 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl">Sair <span className="font-normal text-slate-500">(encerra em todos os aparelhos)</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegação por rota: a Vitrine é link fixo; as demais telas ficam em menus. */}
        <div className="workspace-navigation max-w-7xl mx-auto flex items-center gap-2 border-t border-slate-800/60 px-4 py-1.5 sm:flex-wrap sm:px-6 lg:px-8 max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
          <Link href={href("vitrine")} data-ativa={activeTab === "vitrine" ? "" : undefined} className={`inline-flex h-9 items-center shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${activeTab === "vitrine" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Building2 className="mr-1.5 inline h-3.5 w-3.5" />Vitrine ({propertyTotal})
          </Link>
          {navMenus.map((menu, index) => (
            <details key={menu.title} name="workspace-navigation-menu" data-ativa={activeTab && menu.active.includes(activeTab) ? "" : undefined} className="group relative shrink-0">
              <summary className={`flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition [&::-webkit-details-marker]:hidden ${activeTab && menu.active.includes(activeTab) ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {menu.title}<ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className={`absolute top-full z-50 mt-1 w-56 rounded-xl max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto ${index >= 2 ? "sm:left-0" : "left-0"}`} data-menu=""><div className="rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl">
                {menu.items.map((item) => {
                  const MenuIcon = item.icon;
                  return <Link key={item.id} href={href(item.id)} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${activeTab === item.id ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><MenuIcon className="h-4 w-4 shrink-0" />{item.label}</Link>;
                })}
              </div></div>
            </details>
          ))}
        </div>
        {/* Abas abertas (estilo Flow): a tela de cada aba e um X para fechar; a Vitrine é a fixa. Só com 2 telas ou mais. */}
        {mostrarBarraDeAbas(abasAbertas) && <div role="tablist" aria-label="Telas abertas" className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8 [scrollbar-width:none]">
          {abasAbertas.map((aba) => <div key={aba} className={`flex h-8 shrink-0 items-center rounded-md text-xs font-semibold ${aba === activeTab ? "bg-[#ffffff] text-[#083858]" : "bg-[#ffffff]/10 text-[#ffffff] hover:bg-[#ffffff]/20"}`}>
            <Link href={href(aba)} role="tab" aria-selected={aba === activeTab} className={`flex h-full items-center ${aba === "vitrine" ? "px-3" : "pl-3 pr-1"}`}>{TAB_LABELS[aba]}</Link>
            {aba !== "vitrine" && <button type="button" aria-label={`Fechar a aba ${TAB_LABELS[aba]}`} title="Fechar aba" onClick={() => fecharAbaDaTela(aba)} className="mr-1 flex h-6 w-6 items-center justify-center rounded hover:bg-[#083858]/15"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
          </div>)}
        </div>}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {blockedReason && (
          <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
            <p>{blockedReason}</p>
            {currentUser.verificationStatus === "aprovado" && <button type="button" onClick={() => setIsSubscriptionOpen(true)} className="shrink-0 rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white">Abrir Minha assinatura</button>}
          </div>
        )}
        {children}
      </main>

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md bg-slate-900 border border-slate-700 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
          <p className="flex-1 text-sm text-slate-200 leading-snug">{toastMessage}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs p-1 font-bold">✕</button>
        </div>
      )}

      {isSubscriptionOpen && <SubscriptionPanel onClose={() => setIsSubscriptionOpen(false)} />}
      {billingAlert && clock !== null && !isSubscriptionOpen && <BillingPopup userId={currentUser.id} notice={billingAlert} pendingPix={!!currentUser.pendingPix} now={new Date(clock)}
        plan={currentUser.plan} priceTable={currentUser.priceTable} hasPaid={!!currentUser.hasPaid} billingCycle={currentUser.billingCycle}
        onRegistered={() => showToast("Pix registrado. A equipe confere o pagamento.")} onOpenSubscription={() => setIsSubscriptionOpen(true)} onMessage={(text) => showToast(text)} />}
      <DialogHost />
      {isFeedbackOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="pilot-feedback-title"><form onSubmit={(event) => void handlePilotFeedbackSubmit(event)} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="pilot-feedback-title" className="text-lg font-bold text-white">Ajuda e fale conosco</h2><p className="mt-1 text-xs text-slate-400">Envie uma dúvida, relate um problema ou sugira uma melhoria. Sua mensagem e a tela atual ficam disponíveis para a equipe no painel administrativo.</p></div><BotaoFechar onClick={fecharSugestao} /></div><label className="block text-xs font-semibold text-slate-300">Tipo<select name="category" required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="duvida">Dúvida</option><option value="erro">Encontrei um erro</option><option value="ideia">Sugestão de melhoria</option></select></label><label className="block text-xs font-semibold text-slate-300">O que aconteceu ou o que você sugere?<textarea name="message" required minLength={10} maxLength={2000} rows={5} placeholder="Descreva o que tentou fazer e o que ficou confuso…" className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsFeedbackOpen(false)} className="rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Cancelar</button><button disabled={feedbackBusy} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{feedbackBusy ? "Enviando…" : "Enviar feedback"}</button></div></form></div>}
    </div>
  );
}
