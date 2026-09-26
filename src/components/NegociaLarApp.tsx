"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Share2,
  FileText,
  Radar,
  Building2,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  CheckCircle2,
  Lock,
  Phone,
  UserCheck,
  Sparkles,
  ExternalLink,
  Copy,
  PlusCircle,
  Clock,
  ArrowRight,
  Scale,
  AlertTriangle,
  Fingerprint,
  Stamp,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Ban,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  Bell,
  ChevronDown,
  User,
  Hash,
} from "lucide-react";
import {
  createProperty,
  updateUserStatus,
  createBuyerProfile,
  createDvpCertificate,
  markNotificationAsRead,
  switchBrokerSession,
} from "@/lib/actions";

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "ai_match" | "dvp" | "parceria" | "sistema";
  read: boolean;
  propertyId: string | null;
  createdAt: Date;
}

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
  status: string;
  createdAt: Date;
}

interface Property {
  id: string;
  title: string;
  propertyType: string;
  salePrice: string;
  condoFee: string | null;
  iptu: string | null;
  city: string;
  neighborhood: string;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  areaM2: string;
  description: string;
  photos: string[];
  acceptsPartnership: boolean;
  splitPercentage: string;
  status: string;
  broker: {
    id: string;
    name: string;
    creci: string;
    whatsapp: string;
    avatarUrl: string | null;
    city: string;
  };
}

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

interface UserItem {
  id: string;
  name: string;
  email: string;
  creci: string;
  whatsapp: string;
  avatarUrl: string | null;
  city: string;
  state: string;
  isVerified: boolean;
  verificationStatus: string;
  plan: string;
  subscriptionStatus: string;
  monthlyFee: string;
  role?: string;
  trustScore: number;
  successfulDeals: number;
  bypassReports: number;
  createdAt: Date;
}

interface TransactionItem {
  id: string;
  amount: string;
  type: string;
  paymentMethod: string;
  status: string;
  description: string;
  createdAt: Date;
  userName: string;
  userCreci: string;
}

import LandingPage from "./LandingPage";

export default function NegociaLarApp({
  initialProperties,
  initialRadar,
  initialUsers,
  initialTransactions,
  initialCurrentUser,
  initialNotifications = [],
  initialDvpList = [],
}: {
  initialProperties: Property[];
  initialRadar: BuyerProfile[];
  initialUsers: UserItem[];
  initialTransactions: TransactionItem[];
  initialCurrentUser?: UserItem | null;
  initialNotifications?: NotificationItem[];
  initialDvpList?: DvpCertificateItem[];
}) {
  const [currentView, setCurrentView] = useState<"app" | "landing">("landing");
  const [activeTab, setActiveTab] = useState<"vitrine" | "radar" | "cadastrar" | "termo" | "dvp" | "admin">("vitrine");
  const [userList, setUserList] = useState<UserItem[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(
    initialCurrentUser || initialUsers[0] || null
  );
  const [propertyList, setPropertyList] = useState<Property[]>(initialProperties);
  const [radarList, setRadarList] = useState<BuyerProfile[]>(initialRadar);
  const [selectedPropertyForWhiteLabel, setSelectedPropertyForWhiteLabel] = useState<Property | null>(null);
  const [selectedPropertyForTerm, setSelectedPropertyForTerm] = useState<Property | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [termSigned, setTermSigned] = useState(false);
  const [dvpEmitted, setDvpEmitted] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  // Notificações e Sininho da IA (Reais do Banco)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [dvpList, setDvpList] = useState<DvpCertificateItem[]>(initialDvpList);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelectBrokerSession = async (user: UserItem) => {
    await switchBrokerSession(user.id);
    setCurrentUser(user);
    setIsUserSwitcherOpen(false);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.propertyId) {
      const prop = propertyList.find((p) => p.id === notif.propertyId);
      if (prop) setSelectedPropertyForWhiteLabel(prop);
    }
    setIsNotificationsOpen(false);
  };

  const handleNaturalLanguageSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLanguageQuery.trim()) return;

    setIsSearchingAI(true);
    try {
      const res = await createBuyerProfile({
        clientInternalName: `Procura: ${naturalLanguageQuery.slice(0, 32)}`,
        propertyType: naturalLanguageQuery.toLowerCase().includes("casa") ? "Casa em Condomínio" : "Apartamento",
        city: "São Paulo",
        neighborhoods: ["Moema", "Jardins", "Pinheiros", "Centro"],
        maxBudget: "1600000",
        minBedrooms: naturalLanguageQuery.includes("3") ? 3 : naturalLanguageQuery.includes("2") ? 2 : 1,
        minParkingSpots: 1,
        notes: naturalLanguageQuery,
        brokerId: currentBroker.id,
      });

      if (res.success && res.profile) {
        setRadarList((prev) => [
          {
            id: res.profile.id,
            clientInternalName: res.profile.clientInternalName,
            propertyType: res.profile.propertyType,
            city: res.profile.city,
            neighborhoods: (res.profile.neighborhoods as string[]) || [],
            maxBudget: res.profile.maxBudget,
            minBedrooms: res.profile.minBedrooms,
            minParkingSpots: res.profile.minParkingSpots,
            notes: res.profile.notes,
            broker: {
              id: currentBroker.id,
              name: currentBroker.name,
              creci: currentBroker.creci,
              whatsapp: currentBroker.whatsapp,
            },
          },
          ...prev,
        ]);
        setToastMessage(`🔔 Registrado no banco de dados! A IA já cruzou sua busca com o estoque da rede.`);
        setTimeout(() => setToastMessage(null), 6000);
        setNaturalLanguageQuery("");
      }
    } catch (err) {
      console.error("Erro na busca por IA:", err);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const currentBroker = {
    id: currentUser?.id || "anon",
    name: currentUser?.name || "Mariana Costa Ramos",
    creci: currentUser?.creci || "204112-F",
    whatsapp: currentUser?.whatsapp || "(11) 99123-8877",
    avatar: currentUser?.avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    role: currentUser?.role === "imobiliaria" ? "Imobiliária Parceira (CRECI-J)" : "Corretor(a) Parceiro(a)",
    plan: currentUser?.plan || "40",
  };

  const formatBRL = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(num);
  };

  const handleCopyWhiteLabelLink = () => {
    navigator.clipboard.writeText(`https://negocialar.com.br/imovel/${selectedPropertyForWhiteLabel?.id}?ref=${currentBroker.creci}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleToggleUserModeration = async (userId: string, newStatus: string) => {
    await updateUserStatus(userId, newStatus);
    setUserList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, verificationStatus: newStatus, isVerified: newStatus === "aprovado" } : u))
    );
  };

  const activeProperty = selectedPropertyForTerm || initialProperties[0];

  // Métricas do Admin
  const totalRevenue = initialTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
  const mrrEstimated = userList
    .filter((u) => u.subscriptionStatus === "ativo")
    .reduce((acc, u) => acc + parseFloat(u.monthlyFee || "0"), 0);

  const filteredUsers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.creci.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.city.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (currentView === "landing") {
    return <LandingPage onAccessPlatform={() => setCurrentView("app")} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-amber-500/10 border border-amber-500/30">
              <Image
                src="/logo-negocialar.png"
                alt="Negocia Lar"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-white">Negocia<span className="text-amber-500">lar</span></span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">MLS B2B</span>
              </div>
              <p className="text-xs text-slate-400">
                Rede de Co-corretagem Segura • <span className="text-amber-400 font-semibold">Um produto SNNtech</span>
              </p>
            </div>
          </div>

          {/* User info & Infra Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentView("landing")}
              className="flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition"
            >
              <span>🌐 Ver Landing Page</span>
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition ${
                activeTab === "admin"
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-slate-800/80 text-amber-400 border-amber-500/30 hover:bg-slate-800"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Painel Admin & Faturamento</span>
            </button>

            {/* Sininho de Notificações com IA */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-700/80 transition"
                title="Notificações e Matches da IA"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-amber-400 animate-bounce" : "text-slate-400"}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown do Sininho */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Notificações da IA ({notifications.length})</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 space-y-1.5 transition cursor-pointer hover:bg-slate-800/50 ${
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
                                <span>Ver Imóvel / Ficha White-Label</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil Ativo com Seletor de Sessão Real */}
            <div className="relative">
              <button
                onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
                className="flex items-center gap-2.5 pl-3 border-l border-slate-800 hover:bg-slate-800/50 p-1.5 rounded-xl transition"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-500/50 shrink-0">
                  <img src={currentBroker.avatar} alt={currentBroker.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-right text-xs hidden sm:block">
                  <div className="font-semibold text-white flex items-center gap-1">
                    <span>{currentBroker.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-amber-400 font-mono text-[11px]">CRECI {currentBroker.creci}</div>
                </div>
              </button>

              {/* Dropdown de Troca de Corretor / Perfil */}
              {isUserSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-slate-950 border-b border-slate-800">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Corretor Ativo no Banco
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">{currentBroker.name}</div>
                    <div className="text-xs text-slate-400">CRECI {currentBroker.creci} • Plano {currentBroker.plan.toUpperCase()}</div>
                  </div>

                  <div className="p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1">
                      Alternar Perfil Cadastrado:
                    </div>
                    {userList.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectBrokerSession(u)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition ${
                          u.id === currentBroker.id
                            ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold"
                            : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <img
                          src={u.avatarUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400"}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="truncate flex-1">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">CRECI {u.creci}</div>
                        </div>
                        {u.id === currentBroker.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-slate-800 bg-slate-950/40">
                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        setCurrentView("landing");
                      }}
                      className="w-full py-2 px-3 text-xs font-bold text-center text-amber-400 hover:bg-amber-500/10 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Cadastrar Novo Corretor / Plano</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-3 border-t border-slate-800/60 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("vitrine")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === "vitrine"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Vitrine MLS ({initialProperties.length})
          </button>

          <button
            onClick={() => setActiveTab("radar")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition relative whitespace-nowrap ${
              activeTab === "radar"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Radar className="w-4 h-4" />
            Radar de Compradores
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">1 MATCH</span>
          </button>

          <button
            onClick={() => setActiveTab("termo")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === "termo"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            Termo Anti-Bypass (50/50)
          </button>

          <button
            onClick={() => setActiveTab("dvp")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === "dvp"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Stamp className="w-4 h-4 text-emerald-400" />
            DVP Digital & Trava 180 Dias
          </button>

          <button
            onClick={() => setActiveTab("cadastrar")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === "cadastrar"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Nova Captação Blindada
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap border ${
              activeTab === "admin"
                ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                : "text-amber-400 border-amber-500/40 hover:bg-slate-800/50"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Gestão & Faturamento
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB ADMIN: PAINEL DE CONTROLE DE USUÁRIOS E FATURAMENTO */}
        {activeTab === "admin" && (
          <div className="space-y-8">
            {/* Header Admin */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" /> Painel Master de Gestão Negocia Lar
                </div>
                <h1 className="text-2xl font-bold text-white">Controle de Usuários e Faturamento</h1>
                <p className="text-sm text-slate-400">
                  Gerencie corretores cadastrados, controle de inadimplência, aprovação de CRECI e fluxo de receita.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Gateway de Pagamentos Ativo
                </span>
              </div>
            </div>

            {/* CARDS DE FATURAMENTO / KPIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">MRR (Recorrência Mensal)</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-2">{formatBRL(mrrEstimated)}</div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +18.4% vs mês anterior
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Receita Bruta Acumulada</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-2">{formatBRL(totalRevenue)}</div>
                <div className="text-[11px] text-slate-400 mt-1">Mensalidades + Taxas de Parcerias</div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Corretores Cadastrados</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-2">{userList.length} Profissionais</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {userList.filter((u) => u.verificationStatus === "aprovado").length} ativos • {userList.filter((u) => u.verificationStatus === "suspenso").length} suspenso
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Ticket Médio / Corretor</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-2">R$ 149,00 / mês</div>
                <div className="text-[11px] text-emerald-400 mt-1">94% Adimplência</div>
              </div>
            </div>

            {/* SEÇÃO 1: GESTÃO DE CORRETORES (CONTROLE E MODERAÇÃO ANTI-LARANJA PODRE) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Gestão de Corretores & Moderação da Rede
                  </h3>
                  <p className="text-xs text-slate-400">
                    Aprove novos CRECIs, verifique planos de assinatura e bloqueie atravessadores reportados.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar corretor, CRECI ou cidade..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Tabela de Usuários */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Corretor / Imobiliária</th>
                      <th className="py-3 px-4">CRECI & Cidade</th>
                      <th className="py-3 px-4">Plano & Fatura</th>
                      <th className="py-3 px-4">Score Ético</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400"}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {u.name}
                                {u.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-amber-400">CRECI {u.creci}</div>
                          <div className="text-[11px] text-slate-400">{u.city}/{u.state}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold capitalize text-white">
                            {u.plan === "enterprise" ? "Imobiliária (5 corretores)" : u.plan === "pro" ? "40 Captações" : "10 Captações"}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-mono">
                            {formatBRL(u.monthlyFee)}/mês
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  u.trustScore >= 80 ? "bg-emerald-500" : u.trustScore >= 50 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${u.trustScore}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-bold text-xs">{u.trustScore}%</span>
                          </div>
                          {u.bypassReports > 0 && (
                            <div className="text-[10px] text-red-400 font-semibold mt-0.5">
                              ⚠️ {u.bypassReports} denúncia(s) de bypass
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.verificationStatus === "aprovado" && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                              Aprovado
                            </span>
                          )}
                          {u.verificationStatus === "pendente" && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                              Aguardando CRECI
                            </span>
                          )}
                          {u.verificationStatus === "suspenso" && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                              Suspenso (Bypass)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.verificationStatus !== "aprovado" && (
                              <button
                                onClick={() => handleToggleUserModeration(u.id, "aprovado")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Aprovar
                              </button>
                            )}
                            {u.verificationStatus !== "suspenso" && (
                              <button
                                onClick={() => handleToggleUserModeration(u.id, "suspenso")}
                                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                              >
                                <Ban className="w-3.5 h-3.5" /> Suspender
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: HISTÓRICO DE FATURAMENTO & TRANSAÇÕES REAIS */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Transações Recentes & Faturamento
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico de pagamentos de mensalidades via Pix e Cartão de Crédito.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Total Listado: <strong className="text-emerald-400">{formatBRL(totalRevenue)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Descrição da Cobrança</th>
                      <th className="py-3 px-4">Corretor / Empresa</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {initialTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-medium text-white">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{tx.userName}</div>
                          <div className="text-[11px] text-amber-400 font-mono">CRECI {tx.userCreci}</div>
                        </td>
                        <td className="py-3.5 px-4 uppercase font-mono text-[11px] text-slate-400">
                          {tx.paymentMethod === "cartao_credito" ? "💳 Cartão" : "⚡ Pix"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                          {formatBRL(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: VITRINE MLS */}
        {activeTab === "vitrine" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  Imóveis Disponíveis para Parceria
                </h2>
                <p className="text-sm text-slate-400">Imóveis captados por corretores verificados com divisão garantida</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Endereço exato oculto para proteger o captador
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {initialProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/40 transition duration-300 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem principal com badge 50/50 */}
                    <div className="relative h-64 w-full bg-slate-950 overflow-hidden">
                      <img
                        src={prop.photos[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200"}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1">
                          🤝 Parceria {prop.splitPercentage}% / {100 - parseFloat(prop.splitPercentage)}%
                        </span>
                        <span className="bg-slate-900/80 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-md border border-slate-700">
                          {prop.propertyType}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-800 text-xs flex items-center gap-1 text-slate-300">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Endereço Blindado
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {prop.neighborhood}, {prop.city}
                          </div>
                          <h3 className="font-bold text-lg text-white leading-snug">{prop.title}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-amber-400">{formatBRL(prop.salePrice)}</div>
                          {prop.condoFee && (
                            <div className="text-xs text-slate-400">Cond: {formatBRL(prop.condoFee)}</div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{prop.description}</p>

                      {/* Características */}
                      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                          <Bed className="w-3.5 h-3.5 text-amber-400" />
                          <span>{prop.bedrooms} Quartos</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                          <Bath className="w-3.5 h-3.5 text-amber-400" />
                          <span>{prop.bathrooms} Banheiros</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                          <Car className="w-3.5 h-3.5 text-amber-400" />
                          <span>{prop.parkingSpots} Vagas</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{prop.areaM2} m²</span>
                        </div>
                      </div>

                      {/* Info do Captador */}
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={prop.broker.avatarUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400"}
                            alt={prop.broker.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <div className="text-xs font-semibold text-white">{prop.broker.name}</div>
                            <div className="text-[10px] text-slate-400">Captador Oficial • CRECI {prop.broker.creci}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verificado
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações de Co-corretagem */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedPropertyForWhiteLabel(prop)}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl transition shadow-md shadow-amber-500/10"
                    >
                      <Share2 className="w-4 h-4" />
                      Ficha White-Label
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPropertyForTerm(prop);
                        setActiveTab("dvp");
                      }}
                      className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition border border-slate-700"
                    >
                      <Stamp className="w-4 h-4 text-emerald-400" />
                      Agendar Visita (DVP)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: RADAR DE COMPRADORES (MATCH REVERSO) */}
        {activeTab === "radar" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-amber-500 animate-spin" />
                Radar de Compradores (Match Reverso Ativo)
              </h2>
              <p className="text-sm text-slate-400">
                O algoritmo cruza os imóveis recém-captados com os clientes com crédito aprovado cadastrados na rede.
              </p>
            </div>

            {/* BUSCA EM LINGUAGEM NATURAL COM IA (ALERTA NO SININHO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Radar em Linguagem Natural com IA
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Notifica no Sininho
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Digite livremente o que seu cliente procura. A IA varre a base e envia notificações automáticas no seu sininho quando encontrar parceiros com o imóvel ideal.
              </p>

              <form onSubmit={handleNaturalLanguageSearch} className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={naturalLanguageQuery}
                    onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                    placeholder="Ex: Procuro um apartamento no Centro de 3 quartos até 800 mil..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingAI}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSearchingAI ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Cruzando dados com IA...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Buscar com IA & Ativar no Sininho</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Cartão de Match em Destaque */}
            <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-xs font-black px-4 py-1 rounded-bl-xl shadow-lg">
                🔥 MATCH 98% COMPATÍVEL
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Lado Esquerdo: O Comprador da Mariana */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Demanda de Comprador
                  </div>
                  <div className="text-base font-bold text-white">Dr. Marcelo (Investidor)</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div><strong>Busca:</strong> Apartamento em Moema</div>
                    <div><strong>Orçamento:</strong> Até R$ 1.500.000</div>
                    <div><strong>Mínimo:</strong> 2 Quartos, 2 Vagas</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Cadastrado por: <span className="text-white font-medium">Mariana Costa</span>
                  </div>
                </div>

                {/* Centro: O Ícone de Conexão */}
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-xs font-bold text-amber-400">CRUZAMENTO AUTOMÁTICO</div>
                  <div className="text-[11px] text-slate-400">
                    O imóvel atende 100% dos requisitos de bairro, tipologia e orçamento.
                  </div>
                </div>

                {/* Lado Direito: O Imóvel do Carlos */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Imóvel Captado na Rede
                  </div>
                  <div className="text-base font-bold text-white">Apto Alto Padrão Moema</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div><strong>Valor:</strong> R$ 1.280.000 (Dentro da margem)</div>
                    <div><strong>Configuração:</strong> 3 Quartos (2 suítes), 2 Vagas</div>
                    <div><strong>Comissão Estimada:</strong> R$ 76.800 (R$ 38.400 para cada)</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Captado por: <span className="text-white font-medium">Carlos Eduardo Silva</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Match */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Match detectado há 12 minutos via trigger do PostgreSQL
                </div>
                <button
                  onClick={() => {
                    const prop = initialProperties[0];
                    if (prop) setSelectedPropertyForWhiteLabel(prop);
                  }}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Share2 className="w-4 h-4" />
                  Gerar Ficha White-Label para o Dr. Marcelo
                </button>
              </div>
            </div>

            {/* LISTA DE PROCURAS REAIS CADASTRADAS NO BANCO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Demandas Reais no Banco de Dados ({radarList.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Cruzamento contínuo via PostgreSQL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {radarList.map((bp) => (
                  <div key={bp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{bp.clientInternalName}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Ativo no Radar
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div><strong className="text-slate-300">Tipo:</strong> {bp.propertyType} • {bp.city}</div>
                      <div>
                        <strong className="text-slate-300">Orçamento:</strong>{" "}
                        <span className="text-amber-400 font-mono font-bold">{formatBRL(bp.maxBudget)}</span>
                      </div>
                      <div>
                        <strong className="text-slate-300">Mínimo:</strong> {bp.minBedrooms} quartos, {bp.minParkingSpots} vagas
                      </div>
                      {bp.notes && <div className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">"{bp.notes}"</div>}
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

        {/* TAB 3: TERMO DE CO-CORRETAGEM ANTI-BYPASS */}
        {activeTab === "termo" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Termo de Parceria com Cláusula Anti-Atravessamento (Anti-Bypass)
              </h2>
              <p className="text-sm text-slate-400">
                Respaldo jurídico explícito baseado no Código de Ética dos Corretores e Código Civil.
              </p>
            </div>

            {/* Alerta de Proteção */}
            <div className="bg-red-950/30 border border-red-500/40 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 text-slate-300">
                <span className="font-bold text-red-300">CLÁUSULA DE PROTEÇÃO RIGOROSA:</span>
                <p>
                  É expressamente vedado a qualquer dos corretores contatar o proprietário ou o cliente comprador sem a anuência prévia e por escrito do parceiro. Qualquer violação acarreta penalidade de <strong>100% dos honorários de corretagem</strong> e encaminhamento ao Tribunal de Ética do CRECI.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              {/* Cabeçalho do Contrato */}
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
                  INSTRUMENTO PARTICULAR DE CO-CORRETAGEM IMOBILIÁRIA E BLINDAGEM DE CLIENTE
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Fundamento: Resolução COFECI nº 326/1992, art. 6º | Código Civil Brasileiro, arts. 725, 727 e 728
                </div>
              </div>

              {/* Partes Envolvidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-amber-400 font-bold mb-1">CORRETOR CAPTADOR (50%)</div>
                  <div className="text-sm font-semibold text-white">Carlos Eduardo Silva</div>
                  <div className="text-xs text-slate-400">CRECI 189420-F • São Paulo/SP</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-amber-400 font-bold mb-1">CORRETOR PARCEIRO (50%)</div>
                  <div className="text-sm font-semibold text-white">Mariana Costa Ramos</div>
                  <div className="text-xs text-slate-400">CRECI 204112-F • São Paulo/SP</div>
                </div>
              </div>

              {/* Assinatura Eletrônica em 1 Clique */}
              <div className="pt-2">
                {termSigned ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3 text-emerald-300 text-sm">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold">Termo Aceito Eletronicamente por Ambas as Partes!</div>
                      <div className="text-xs text-emerald-400/80">
                        Hash SHA-256 gerado e arquivado. Válido como prova pré-constituída para cobrança de comissão.
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setTermSigned(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Dar Aceite Eletrônico no Termo de Parceria (1 Clique)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DVP DIGITAL (DOCUMENTO DE VISITA PRESENCIAL) */}
        {activeTab === "dvp" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Stamp className="w-5 h-5 text-emerald-400" />
                DVP Digital (Documento de Visita Presencial)
              </h2>
              <p className="text-sm text-slate-400">
                Padrão COFECI com Trava de Anterioridade de 180 dias. Prova definitiva de quem apresentou o cliente ao imóvel.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const clientName = fd.get("clientName") as string;
                const clientPhone = fd.get("clientPhone") as string;
                const clientCpf = fd.get("clientCpf") as string;
                const visitDate = (fd.get("visitDate") as string) || new Date().toISOString();

                const res = await createDvpCertificate({
                  propertyId: activeProperty.id,
                  captorBrokerId: activeProperty.broker.id,
                  partnerBrokerId: currentBroker.id,
                  clientName,
                  clientPhone,
                  clientCpfPartial: clientCpf,
                  visitDate,
                  commissionSplit: activeProperty.splitPercentage || "50.00",
                });

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
                      status: res.certificate.status,
                      createdAt: new Date(res.certificate.createdAt),
                    },
                    ...prev,
                  ]);
                  setDvpEmitted(true);
                  setToastMessage(`📜 Certificado ${res.certificate.certificateHash} registrado no banco com trava de 180 dias!`);
                  setTimeout(() => setToastMessage(null), 6000);
                }
              }}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl"
            >
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <Fingerprint className="w-4 h-4" />
                  Trava de Anterioridade Ativada (180 dias)
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Art. 727 Código Civil</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Imóvel Selecionado:</div>
                  <div className="text-sm font-bold text-white">{activeProperty?.title}</div>
                  <div className="text-xs text-amber-400">{activeProperty?.neighborhood}, {activeProperty?.city}</div>
                  <div className="text-[11px] text-slate-500 pt-1">Captador: {activeProperty?.broker.name} (CRECI {activeProperty?.broker.creci})</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Corretor Solicitante:</div>
                  <div className="text-sm font-bold text-white">{currentBroker.name}</div>
                  <div className="text-xs text-emerald-400">CRECI {currentBroker.creci} • Parceria 50/50</div>
                </div>
              </div>

              {/* Dados do Cliente Visitante */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Dados do Cliente Apresentado para Registro
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo do Cliente</label>
                    <input
                      name="clientName"
                      required
                      placeholder="Ex: Dr. Roberto Silveira"
                      defaultValue="Dr. Roberto Silveira"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CPF (Parcial para Proteção LGPD)</label>
                    <input
                      name="clientCpf"
                      required
                      placeholder="***.382.910-**"
                      defaultValue="***.382.910-**"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp do Cliente</label>
                    <input
                      name="clientPhone"
                      placeholder="(11) 97777-6666"
                      defaultValue="(11) 97777-6666"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Data e Hora da Visita</label>
                  <input
                    name="visitDate"
                    type="datetime-local"
                    defaultValue={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Stamp className="w-5 h-5" />
                  Emitir e Gravar DVP Digital no Banco de Dados (180 Dias de Trava)
                </button>
              </div>
            </form>

            {/* LISTA DE CERTIFICADOS DVP REGISTRADOS NO BANCO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Certificados DVP Registrados no Banco ({dvpList.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Proteção Ativa COFECI</span>
              </div>

              {dvpList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nenhum DVP emitido ainda. Preencha o formulário acima para registrar sua primeira visita blindada!
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
                          Trava Ativa (180 dias)
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div><strong>Cliente:</strong> {dvp.clientName} (CPF: {dvp.clientCpfPartial})</div>
                        <div><strong>Data da Visita:</strong> {new Date(dvp.visitDate).toLocaleDateString("pt-BR")}</div>
                        <div><strong>Validade da Blindagem:</strong> até {new Date(dvp.lockExpirationDate).toLocaleDateString("pt-BR")}</div>
                        <div><strong>Divisão de Comissão:</strong> {dvp.commissionSplit}% / {100 - parseFloat(dvp.commissionSplit)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CADASTRAR CAPTAÇÃO BLINDADA */}
        {activeTab === "cadastrar" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                Cadastrar Imóvel com Blindagem de Captação
              </h2>
              <p className="text-sm text-slate-400">
                Os dados sensíveis (endereço exato e telefone do proprietário) ficam criptografados e acessíveis apenas a você.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const res = await createProperty({
                  brokerId: currentBroker.id,
                  title: fd.get("title") as string,
                  propertyType: fd.get("propertyType") as string,
                  salePrice: fd.get("salePrice") as string,
                  condoFee: fd.get("condoFee") as string,
                  iptu: fd.get("iptu") as string,
                  city: fd.get("city") as string,
                  neighborhood: fd.get("neighborhood") as string,
                  bedrooms: parseInt(fd.get("bedrooms") as string || "1"),
                  suites: parseInt(fd.get("suites") as string || "0"),
                  bathrooms: parseInt(fd.get("bathrooms") as string || "1"),
                  parkingSpots: parseInt(fd.get("parkingSpots") as string || "0"),
                  areaM2: fd.get("areaM2") as string,
                  description: fd.get("description") as string,
                  photos: [
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
                  ],
                  confidentialAddress: fd.get("confidentialAddress") as string,
                  ownerName: fd.get("ownerName") as string,
                  ownerPhone: fd.get("ownerPhone") as string,
                  acceptsPartnership: true,
                  splitPercentage: "50.00",
                });

                if (res.success && res.property) {
                  setPropertyList((prev) => [
                    {
                      ...res.property,
                      broker: {
                        id: currentBroker.id,
                        name: currentBroker.name,
                        creci: currentBroker.creci,
                        whatsapp: currentBroker.whatsapp,
                        avatarUrl: currentBroker.avatar,
                        city: res.property.city,
                      },
                    },
                    ...prev,
                  ]);
                  setToastMessage("🏠 Imóvel cadastrado no banco de dados e blindado com sucesso!");
                  setTimeout(() => setToastMessage(null), 5000);
                  setActiveTab("vitrine");
                }
              }}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6"
            >
              {/* DADOS PÚBLICOS NA REDE */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  1. Informações Públicas (Visíveis a todos os corretores)
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Título do Anúncio</label>
                  <input
                    name="title"
                    required
                    placeholder="Ex: Apartamento Amplo com Varanda Gourmet em Moema"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Imóvel</label>
                    <select
                      name="propertyType"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa em Condomínio">Casa em Condomínio</option>
                      <option value="Cobertura">Cobertura</option>
                      <option value="Casa de Rua">Casa de Rua</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Valor de Venda (R$)</label>
                    <input
                      name="salePrice"
                      required
                      type="number"
                      placeholder="950000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Condomínio (R$/mês)</label>
                    <input
                      name="condoFee"
                      type="number"
                      placeholder="950"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Cidade</label>
                    <input
                      name="city"
                      required
                      defaultValue="São Paulo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Bairro (Público)</label>
                    <input
                      name="neighborhood"
                      required
                      placeholder="Ex: Moema"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Quartos</label>
                    <input
                      name="bedrooms"
                      type="number"
                      defaultValue="2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Suítes</label>
                    <input
                      name="suites"
                      type="number"
                      defaultValue="1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Vagas</label>
                    <input
                      name="parkingSpots"
                      type="number"
                      defaultValue="2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Área (m²)</label>
                    <input
                      name="areaM2"
                      type="number"
                      defaultValue="85"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Descrição Comercial</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Descreva os diferenciais do imóvel..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SEÇÃO BLINDADA */}
              <div className="p-4 rounded-xl bg-amber-950/20 border-2 border-amber-500/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                      2. Campos Blindados (Sigilo Absoluto)
                    </h3>
                  </div>
                  <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Apenas Você Enxerga
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Endereço Exato</label>
                  <input
                    name="confidentialAddress"
                    required
                    placeholder="Ex: Alameda dos Arapanés, nº 842, Apto 112"
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Proprietário</label>
                    <input
                      name="ownerName"
                      required
                      placeholder="Ex: Carlos de Souza"
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Telefone do Proprietário</label>
                    <input
                      name="ownerPhone"
                      required
                      placeholder="(11) 98888-7777"
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-amber-500/20"
              >
                Salvar Captação com Blindagem Ativa
              </button>
            </form>
          </div>
        )}
      </main>

      {/* MODAL DE COMPARTILHAMENTO WHITE-LABEL */}
      {selectedPropertyForWhiteLabel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" /> Gerador White-Label Inteligente
                </div>
                <h3 className="text-lg font-bold text-white">Compartilhar com Seu Cliente Final</h3>
              </div>
              <button
                onClick={() => setSelectedPropertyForWhiteLabel(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300">
                ✨ <strong>Como seu cliente vai ver:</strong> A página e o PDF exibem exclusivamente os <strong>seus dados</strong> (Mariana Costa, seu CRECI e seu WhatsApp). Os dados do corretor captador e do proprietário nunca aparecem!
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentBroker.avatar}
                      alt={currentBroker.name}
                      className="w-10 h-10 rounded-full object-cover border border-amber-500/40"
                    />
                    <div>
                      <div className="text-sm font-bold text-white">{currentBroker.name}</div>
                      <div className="text-xs text-slate-400">CRECI {currentBroker.creci} • Corretora de Imóveis</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      Atendimento Exclusivo
                    </span>
                  </div>
                </div>

                <div className="relative h-48 rounded-xl overflow-hidden">
                  <img
                    src={selectedPropertyForWhiteLabel.photos[0]}
                    alt={selectedPropertyForWhiteLabel.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/90 text-white text-xs px-2.5 py-1 rounded-md">
                    {selectedPropertyForWhiteLabel.neighborhood}, {selectedPropertyForWhiteLabel.city}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-base">{selectedPropertyForWhiteLabel.title}</h4>
                  <div className="text-amber-400 font-extrabold text-xl mt-1">
                    {formatBRL(selectedPropertyForWhiteLabel.salePrice)}
                  </div>
                </div>

                <div className="bg-emerald-600/20 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    Fale direto com a corretora pelo WhatsApp:
                  </div>
                  <a
                    href={`https://wa.me/5511991238877?text=Olá Mariana, vi o imóvel em ${selectedPropertyForWhiteLabel.neighborhood} e tenho interesse.`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    (11) 99123-8877
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopyWhiteLabelLink}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "Link Copiado para o WhatsApp!" : "Copiar Link para Enviar no WhatsApp"}
                </button>

                <button
                  onClick={() => alert("PDF White-Label gerado com sua logomarca e seus dados para impressão ou envio!")}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition border border-slate-700"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  Baixar Ficha em PDF (Sem Captador)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Notificação Flutuante do Sininho */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-amber-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>IA Match Encontrado!</span>
              <span className="text-[10px] bg-red-500 text-white font-black px-1.5 rounded-full">NOVO</span>
            </div>
            <p className="text-slate-300 leading-snug">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs p-1 ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
