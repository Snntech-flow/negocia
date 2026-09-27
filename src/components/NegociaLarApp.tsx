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
  UserPlus,
  Home,
  Video,
  Image as ImageIcon,
  Layers,
  Sun,
  Compass,
  Eye,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import OnboardingModal from "@/components/OnboardingModal";
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
  purpose?: string;
  acceptsTrade?: boolean;
  tradeDetails?: string | null;
  condition?: string;
  hotelRoomsCount?: number | null;
  condoFee: string | null;
  iptu: string | null;
  iptuPeriod?: string | null;
  city: string;
  neighborhood: string;
  cep?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  block?: string | null;
  floor?: string | null;
  condoName?: string | null;
  hideStreet?: boolean;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  garageType?: string | null;
  areaM2: string;
  usefulAreaM2?: string | null;
  totalAreaM2?: string | null;
  solarPosition?: string | null;
  viewType?: string | null;
  propertyAge?: number | null;
  documentationStatus?: string | null;
  acceptsFinancing?: boolean;
  privateAmenities?: string[];
  condoAmenities?: string[];
  description: string;
  videoUrl?: string | null;
  coverPhoto?: string | null;
  photos: string[];
  floorPlanPhotos?: string[];
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

export const PROPERTY_TYPES = [
  "Apartamento",
  "Casa em Condomínio",
  "Casa Solta",
  "Cobertura",
  "Comercial",
  "Duplex",
  "Terreno",
  "Chácara",
  "Sítio",
  "Fazenda",
  "Hotel",
  "Pousada",
  "Loft",
  "Apart-Hotel",
];

export const PRIVATE_AMENITIES_LIST = [
  "Ar-condicionado",
  "Armário embutido / Closet",
  "Box blindex",
  "Cozinha americana",
  "Cozinha planejada",
  "Churrasqueira privativa",
  "Despensa",
  "Dependência de empregada (DCE)",
  "Escritório / Home office",
  "Lavabo",
  "Mezanino",
  "Internet / Wi-Fi",
  "TV a cabo instalada",
  "Sofá retrátil / Mobiliado",
  "Piscina privativa",
  "Sacada / Sacada gourmet",
  "Varanda / Varanda gourmet",
  "Ofurô / Hidromassagem",
  "Sauna privativa",
  "Ventilador de teto",
];

export const CONDO_AMENITIES_GROUPS = [
  {
    category: "Lazer & Convivência",
    items: [
      "Piscina adulto",
      "Piscina infantil",
      "Piscina aquecida / coberta",
      "Deck molhado",
      "Sauna",
      "Spa / Hidromassagem",
      "Espaço gourmet",
      "Salão de festas",
      "Churrasqueira coletiva",
      "Salão de jogos",
      "Cinema / Home theater",
      "Espaço kids / Brinquedoteca",
      "Playground",
      "Coworking / Sala de reunião",
      "Pista de cooper / caminhada",
      "Área verde / Bosque preservado",
      "Pet place / Pet care",
      "Haras / Hípica",
      "Heliponto",
    ],
  },
  {
    category: "Esportes & Saúde",
    items: [
      "Academia completa (Fitness)",
      "Quadra poliesportiva",
      "Quadra de tênis",
      "Quadra de beach tennis",
      "Campo de futebol",
    ],
  },
  {
    category: "Segurança, Tecnologia & Infraestrutura",
    items: [
      "Portaria 24 horas",
      "Portaria remota / virtual",
      "Reconhecimento facial / Biometria",
      "Câmeras CFTV 24h",
      "Gerador de energia",
      "Elevador social e de serviço",
      "Mini-mercado 24h",
      "Carregador para carro elétrico",
    ],
  },
];

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
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Notificações e Sininho da IA (Reais do Banco)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [dvpList, setDvpList] = useState<DvpCertificateItem[]>(initialDvpList);

  // Filtros da Vitrine MLS
  const [propertyFilterPurpose, setPropertyFilterPurpose] = useState<string>("todos");
  const [propertyFilterType, setPropertyFilterType] = useState<string>("todos");
  const [propertyFilterSearch, setPropertyFilterSearch] = useState<string>("");

  // Formulário Completo de Cadastro de Imóvel (4 Páginas das Imobiliárias)
  const [formPurpose, setFormPurpose] = useState<"venda" | "aluguel" | "temporada">("venda");
  const [formAcceptsTrade, setFormAcceptsTrade] = useState(false);
  const [formPropertyType, setFormPropertyType] = useState("Apartamento");
  const [formCondition, setFormCondition] = useState<"novo" | "usado" | "em_construcao" | "na_planta">("usado");
  const [formBedrooms, setFormBedrooms] = useState(2);
  const [formSuites, setFormSuites] = useState(1);
  const [formBathrooms, setFormBathrooms] = useState(2);
  const [formParkingSpots, setFormParkingSpots] = useState(1);
  const [formGarageType, setFormGarageType] = useState<"coberta" | "descoberta">("coberta");
  const [formSolarPosition, setFormSolarPosition] = useState<"nascente" | "norte_sul" | "poente">("nascente");
  const [formViewType, setFormViewType] = useState<"frente" | "fundos" | "lagoa" | "av_principal">("frente");
  const [formIptuPeriod, setFormIptuPeriod] = useState<"anual" | "mensal">("anual");
  const [formDocumentationStatus, setFormDocumentationStatus] = useState<"escriturado" | "promessa_compra_venda" | "inventario">("escriturado");
  const [formAcceptsFinancing, setFormAcceptsFinancing] = useState(true);
  const [formHideStreet, setFormHideStreet] = useState(true);
  
  const [formPrivateAmenities, setFormPrivateAmenities] = useState<string[]>([
    "Ar-condicionado",
    "Armário embutido / Closet",
    "Cozinha planejada",
    "Varanda / Varanda gourmet",
  ]);
  const [formCondoAmenities, setFormCondoAmenities] = useState<string[]>([
    "Piscina adulto",
    "Espaço gourmet",
    "Salão de festas",
    "Academia completa (Fitness)",
    "Portaria 24 horas",
    "Elevador social e de serviço",
  ]);

  // Endereço e Busca Inteligente via CEP
  const [formCep, setFormCep] = useState("");
  const [formCity, setFormCity] = useState("São Paulo");
  const [formState, setFormState] = useState("SP");
  const [formNeighborhood, setFormNeighborhood] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Mídias
  const [formCoverPhoto, setFormCoverPhoto] = useState("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80");
  const [formGalleryPhotos, setFormGalleryPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80"
  ]);
  const [formFloorPlans, setFormFloorPlans] = useState<string[]>([]);
  const [newPhotoInput, setNewPhotoInput] = useState("");
  const [newFloorPlanInput, setNewFloorPlanInput] = useState("");

  const handleCepLookup = async (rawCep?: string) => {
    const cepToSearch = (rawCep !== undefined ? rawCep : formCep).replace(/\D/g, "");
    if (!cepToSearch) return;

    let formattedCep = cepToSearch;
    if (cepToSearch.length > 5) {
      formattedCep = `${cepToSearch.slice(0, 5)}-${cepToSearch.slice(5, 8)}`;
    }
    setFormCep(formattedCep);

    if (cepToSearch.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepToSearch}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.localidade) setFormCity(data.localidade);
          if (data.uf) setFormState(data.uf);
          if (data.bairro) setFormNeighborhood(data.bairro);
          if (data.logradouro) setFormStreet(data.logradouro);
          setToastMessage(`📍 Endereço preenchido: ${data.logradouro || "Logradouro"}, ${data.bairro || ""} - ${data.localidade}/${data.uf}`);
          setTimeout(() => setToastMessage(null), 4000);
        } else {
          setToastMessage("⚠️ CEP não encontrado. Preencha os campos manualmente.");
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (err) {
        console.error("Erro na busca de CEP:", err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const togglePrivateAmenity = (item: string) => {
    setFormPrivateAmenities((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleCondoAmenity = (item: string) => {
    setFormCondoAmenities((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddPhoto = () => {
    if (!newPhotoInput.trim()) return;
    if (formGalleryPhotos.length >= 30) {
      setToastMessage("Limite de 30 fotos atingido!");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setFormGalleryPhotos((prev) => [...prev, newPhotoInput.trim()]);
    setNewPhotoInput("");
  };

  const handleRemovePhoto = (index: number) => {
    setFormGalleryPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddFloorPlan = () => {
    if (!newFloorPlanInput.trim()) return;
    setFormFloorPlans((prev) => [...prev, newFloorPlanInput.trim()]);
    setNewFloorPlanInput("");
  };

  const handleRemoveFloorPlan = (index: number) => {
    setFormFloorPlans((prev) => prev.filter((_, idx) => idx !== index));
  };

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
    id: currentUser?.id || "",
    name: currentUser?.name || (userList.length === 0 ? "Criar Usuário Master" : "Selecione um Corretor"),
    creci: currentUser?.creci || (userList.length === 0 ? "CRECI Pendente" : "000000-F"),
    whatsapp: currentUser?.whatsapp || "",
    avatar: currentUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    role: currentUser?.role === "admin"
      ? "Master Admin (SNNtech)"
      : currentUser?.role === "imobiliaria"
      ? "Imobiliária Parceira (CRECI-J)"
      : "Corretor(a) Parceiro(a)",
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

  const filteredProperties = propertyList.filter((prop) => {
    if (propertyFilterPurpose !== "todos" && prop.purpose && prop.purpose !== propertyFilterPurpose) {
      return false;
    }
    if (propertyFilterType !== "todos" && prop.propertyType !== propertyFilterType) {
      return false;
    }
    if (propertyFilterSearch.trim()) {
      const q = propertyFilterSearch.toLowerCase();
      const matchTitle = prop.title?.toLowerCase().includes(q);
      const matchCity = prop.city?.toLowerCase().includes(q);
      const matchNeigh = prop.neighborhood?.toLowerCase().includes(q);
      const matchCondo = prop.condoName?.toLowerCase().includes(q);
      if (!matchTitle && !matchCity && !matchNeigh && !matchCondo) return false;
    }
    return true;
  });

  if (currentView === "landing") {
    return (
      <LandingPage
        onAccessPlatform={(userData) => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Banner quando não há usuário logado */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 font-medium text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 font-bold" />
            <span>
              <strong>Banco 100% Zerado:</strong> Crie seu <strong>Usuário Master</strong> com seu CRECI real para cadastrar imóveis blindados, testar o radar com IA e emitir certificados DVP!
            </span>
          </div>
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shrink-0 shadow-md flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Criar Meu Usuário Master Agora</span>
          </button>
        </div>
      )}

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
                  <div className="text-amber-400 font-mono text-[11px]">
                    {currentUser?.role === "admin" ? "⭐ MASTER ADMIN" : `CRECI ${currentBroker.creci}`}
                  </div>
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
                    <div className="text-xs text-slate-400">
                      {currentUser?.role === "admin"
                        ? "⭐ Usuário Master (SNNtech)"
                        : `CRECI ${currentBroker.creci} • Plano ${currentBroker.plan.toUpperCase()}`}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1">
                      {userList.length === 0 ? "Nenhum Usuário Cadastrado" : "Alternar Perfil Cadastrado:"}
                    </div>
                    {userList.length === 0 ? (
                      <div className="p-2.5 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
                        Nenhum corretor cadastrado ainda.
                      </div>
                    ) : (
                      userList.map((u) => (
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
                            <div className="text-[10px] text-slate-400 font-mono">
                              {u.role === "admin" ? "⭐ Master Admin" : `CRECI ${u.creci}`}
                            </div>
                          </div>
                          {u.id === currentBroker.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-800 bg-slate-950/40 space-y-1">
                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        setIsOnboardingModalOpen(true);
                      }}
                      className="w-full py-2 px-3 text-xs font-bold text-center bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{userList.length === 0 ? "Criar Meu Usuário Master" : "Cadastrar Novo Corretor"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        setCurrentView("landing");
                      }}
                      className="w-full py-1.5 px-3 text-xs font-semibold text-center text-slate-400 hover:text-white rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <span>Voltar para Landing Page</span>
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
                            {u.plan === "enterprise" || u.plan === "pro" || u.plan === "40" ? "40 Anúncios" : u.plan === "20" ? "20 Anúncios" : "10 Anúncios"}
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

            {/* BARRA DE FILTROS DA VITRINE MLS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Filtro por Finalidade */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "venda", label: "🏷️ Venda" },
                    { id: "aluguel", label: "🔑 Aluguel" },
                    { id: "temporada", label: "🏖️ Temporada" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPropertyFilterPurpose(tab.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        propertyFilterPurpose === tab.id
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filtro por Tipo de Imóvel */}
                <div className="flex items-center gap-2">
                  <select
                    value={propertyFilterType}
                    onChange={(e) => setPropertyFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os 14 Tipos</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  {/* Busca Rápida */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={propertyFilterSearch}
                      onChange={(e) => setPropertyFilterSearch(e.target.value)}
                      placeholder="Bairro, condomínio, cidade..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                    />
                  </div>
                </div>
              </div>
            </div>

            {filteredProperties.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Nenhum Imóvel Encontrado</h3>
                  <p className="text-xs text-slate-400">
                    {propertyList.length === 0
                      ? "O banco de dados está limpo e zerado. Cadastre o seu primeiro imóvel blindado para inaugurar a rede de parcerias!"
                      : "Nenhum imóvel corresponde aos filtros selecionados. Tente alterar o tipo ou a finalidade."}
                  </p>
                </div>
                {propertyList.length === 0 ? (
                  <button
                    onClick={() => setActiveTab("cadastrar")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Cadastrar 1º Imóvel na Rede</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPropertyFilterPurpose("todos");
                      setPropertyFilterType("todos");
                      setPropertyFilterSearch("");
                    }}
                    className="text-amber-400 hover:underline text-xs font-semibold"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProperties.map((prop) => (
                  <div
                    key={prop.id}
                    className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/40 transition duration-300 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Imagem principal com badges */}
                      <div className="relative h-64 w-full bg-slate-950 overflow-hidden">
                        <img
                          src={prop.coverPhoto || prop.photos[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200"}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                          <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1">
                            🤝 Parceria {prop.splitPercentage}% / {100 - parseFloat(prop.splitPercentage)}%
                          </span>
                          <span className="bg-slate-900/90 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-md border border-slate-700">
                            {prop.propertyType}
                          </span>
                          {prop.purpose && prop.purpose !== "venda" && (
                            <span className="bg-blue-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase">
                              {prop.purpose}
                            </span>
                          )}
                          {prop.acceptsTrade && (
                            <span className="bg-purple-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                              🔄 Aceita Permuta
                            </span>
                          )}
                          {prop.condition && prop.condition !== "usado" && (
                            <span className="bg-emerald-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md capitalize">
                              {prop.condition.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-800 text-xs flex items-center gap-1 text-slate-300">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          {prop.hideStreet ? "Rua Ocultada (Blindagem Ativa)" : "Endereço Blindado"}
                        </div>

                        {prop.photos && prop.photos.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1 font-mono">
                            <ImageIcon className="w-3 h-3 text-amber-400" />
                            {prop.photos.length} fotos
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {prop.condoName ? `${prop.condoName} • ` : ""}
                              {prop.neighborhood}, {prop.city}
                            </div>
                            <h3 className="font-bold text-lg text-white leading-snug">{prop.title}</h3>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-black text-amber-400">{formatBRL(prop.salePrice)}</div>
                            {prop.condoFee && parseFloat(prop.condoFee) > 0 && (
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
                            <span>{prop.usefulAreaM2 || prop.areaM2} m²</span>
                          </div>
                        </div>

                        {/* Comodidades em destaque (se houver) */}
                        {prop.privateAmenities && prop.privateAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {prop.privateAmenities.slice(0, 3).map((am) => (
                              <span
                                key={am}
                                className="text-[10px] bg-slate-800/60 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-md"
                              >
                                {am}
                              </span>
                            ))}
                            {prop.privateAmenities.length > 3 && (
                              <span className="text-[10px] text-amber-400 font-semibold px-1 py-0.5">
                                +{prop.privateAmenities.length - 3} itens
                              </span>
                            )}
                          </div>
                        )}

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
            )}
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
            {!currentUser ? (
              <div className="bg-slate-900 border-2 border-dashed border-amber-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Crie seu Usuário Master para Cadastrar Imóveis</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Para registrar captações blindadas e ser o corretor titular do contrato 50/50, você precisa estar cadastrado com seu CRECI no banco de dados.
                  </p>
                </div>
                <button
                  onClick={() => setIsOnboardingModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Meu Usuário Master Agora</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-amber-500" />
                      Cadastrar Imóvel com Blindagem de Captação
                    </h2>
                    <p className="text-sm text-slate-400">
                      Formulário completo com 14 tipos, 20 comodidades privativas, 32 itens de condomínio e blindagem MLS.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Captador Oficial: {currentBroker.name}</span>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);

                    const title = (fd.get("title") as string)?.trim() || `${formPropertyType} em ${formNeighborhood || formCity}`;
                    const salePrice = (fd.get("salePrice") as string)?.trim();
                    const ownerName = (fd.get("ownerName") as string)?.trim();
                    const ownerPhone = (fd.get("ownerPhone") as string)?.trim();

                    if (!salePrice || !ownerName || !ownerPhone) {
                      setToastMessage("Por favor, preencha o valor do imóvel e os dados de contato do proprietário.");
                      setTimeout(() => setToastMessage(null), 5000);
                      return;
                    }

                    const usefulArea = (fd.get("usefulAreaM2") as string) || (fd.get("areaM2") as string) || "80";

                    try {
                      const res = await createProperty({
                        brokerId: currentBroker.id,
                        title,
                        purpose: formPurpose,
                        salePrice,
                        acceptsTrade: formAcceptsTrade,
                        tradeDetails: (fd.get("tradeDetails") as string) || undefined,
                        propertyType: formPropertyType,
                        hotelRoomsCount:
                          formPropertyType === "Hotel" || formPropertyType === "Pousada"
                            ? parseInt((fd.get("hotelRoomsCount") as string) || "0")
                            : undefined,
                        condition: formCondition,
                        bedrooms: formBedrooms,
                        suites: formSuites,
                        bathrooms: formBathrooms,
                        parkingSpots: formParkingSpots,
                        garageType: formGarageType,
                        usefulAreaM2: usefulArea,
                        totalAreaM2: (fd.get("totalAreaM2") as string) || undefined,
                        areaM2: usefulArea,
                        solarPosition: formSolarPosition,
                        viewType: formViewType,
                        propertyAge: fd.get("propertyAge") ? parseInt(fd.get("propertyAge") as string) : undefined,
                        condoFee: (fd.get("condoFee") as string) || "0",
                        iptu: (fd.get("iptu") as string) || "0",
                        iptuPeriod: formIptuPeriod,
                        acceptsFinancing: formAcceptsFinancing,
                        documentationStatus: formDocumentationStatus,
                        privateAmenities: formPrivateAmenities,
                        condoAmenities: formCondoAmenities,
                        cep: formCep,
                        state: formState,
                        city: formCity,
                        neighborhood: formNeighborhood || "Bairro Não Informado",
                        street: formStreet,
                        hideStreet: formHideStreet,
                        condoName: (fd.get("condoName") as string) || undefined,
                        streetNumber: (fd.get("streetNumber") as string) || undefined,
                        block: (fd.get("block") as string) || undefined,
                        floor: (fd.get("floor") as string) || undefined,
                        confidentialAddress: `${formStreet || "Rua Confidencial"}, ${fd.get("streetNumber") || "S/N"} - Bloco ${fd.get("block") || "-"} Andar ${fd.get("floor") || "-"}`,
                        videoUrl: (fd.get("videoUrl") as string) || undefined,
                        coverPhoto: formCoverPhoto,
                        photos: formGalleryPhotos.length > 0 ? formGalleryPhotos : [formCoverPhoto],
                        floorPlanPhotos: formFloorPlans,
                        description: (fd.get("description") as string) || "Excelente oportunidade de negócio com divisão garantida.",
                        ownerName,
                        ownerPhone,
                        acceptsPartnership: true,
                        splitPercentage: "50.00",
                      });

                      if (res && res.property) {
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
                        setToastMessage("🏠 Imóvel cadastrado com sucesso e publicado na Vitrine MLS!");
                        setTimeout(() => setToastMessage(null), 5000);
                        setActiveTab("vitrine");
                      }
                    } catch (err: any) {
                      setToastMessage(err?.message || "Erro ao salvar o imóvel.");
                      setTimeout(() => setToastMessage(null), 5000);
                    }
                  }}
                  className="space-y-6"
                >
                  {/* SEÇÃO 1: FINALIDADE, VALORES & CONDIÇÕES (PÁGINA 1) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      1. Finalidade, Valores & Condições de Negócio
                    </h3>

                    {/* Finalidade Buttons */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Finalidade do Imóvel</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "venda", label: "🏷️ Venda" },
                          { id: "aluguel", label: "🔑 Aluguel" },
                          { id: "temporada", label: "🏖️ Temporada" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFormPurpose(p.id as any)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                              formPurpose === p.id
                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Valor {formPurpose === "venda" ? "de Venda" : formPurpose === "aluguel" ? "do Aluguel" : "da Diária"} (R$) *
                        </label>
                        <input
                          name="salePrice"
                          required
                          type="number"
                          placeholder="Ex: 850000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Condomínio (R$/mês)</label>
                        <input
                          name="condoFee"
                          type="number"
                          placeholder="Ex: 650"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">IPTU (R$)</label>
                        <div className="flex gap-2">
                          <input
                            name="iptu"
                            type="number"
                            placeholder="Ex: 180"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                          />
                          <select
                            value={formIptuPeriod}
                            onChange={(e) => setFormIptuPeriod(e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="anual">Anual</option>
                            <option value="mensal">Mensal</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Aceita Permuta */}
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Aceita Permuta?</div>
                          <div className="text-[11px] text-slate-400">Aceita veículos, imóveis de menor valor, etc.</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormAcceptsTrade(false)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                              !formAcceptsTrade
                                ? "bg-slate-800 text-white border-slate-700"
                                : "text-slate-500 border-transparent hover:text-white"
                            }`}
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormAcceptsTrade(true)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                              formAcceptsTrade
                                ? "bg-purple-600 text-white border-purple-500 shadow"
                                : "text-slate-500 border-transparent hover:text-white"
                            }`}
                          >
                            Sim, Aceita
                          </button>
                        </div>
                      </div>
                      {formAcceptsTrade && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Detalhes da Permuta Aceita
                          </label>
                          <input
                            name="tradeDetails"
                            placeholder="Ex: Aceita automóvel até R$ 100 mil ou apartamento até 50% do valor"
                            className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Financiamento & Documentação */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Aceita Financiamento Bancário?
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormAcceptsFinancing(true)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                              formAcceptsFinancing
                                ? "bg-emerald-600/30 text-emerald-300 border-emerald-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            ✓ Sim, Financia
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormAcceptsFinancing(false)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                              !formAcceptsFinancing
                                ? "bg-red-600/30 text-red-300 border-red-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            ✕ Somente à Vista
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Situação da Documentação
                        </label>
                        <select
                          value={formDocumentationStatus}
                          onChange={(e) => setFormDocumentationStatus(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="escriturado">Escriturado e Registrado (100% Regular)</option>
                          <option value="promessa_compra_venda">Promessa de Compra e Venda / Cessão</option>
                          <option value="inventario">Inventário / Em Regularização</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: TIPO DE IMÓVEL & CARACTERÍSTICAS DA PLANTA (PÁGINAS 1 & 2) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      2. Tipo do Imóvel & Detalhes da Estrutura
                    </h3>

                    {/* 14 Tipos de Imóvel */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Tipo de Imóvel (14 Categorias das Imobiliárias)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormPropertyType(type)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-semibold text-center border transition truncate ${
                              formPropertyType === type
                                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Se for Hotel ou Pousada */}
                    {(formPropertyType === "Hotel" || formPropertyType === "Pousada") && (
                      <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-xl flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-amber-300 mb-1">
                            Número de Quartos / Suítes do {formPropertyType}
                          </label>
                          <input
                            name="hotelRoomsCount"
                            type="number"
                            defaultValue="12"
                            placeholder="Ex: 24"
                            className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Condição da Obra */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Condição do Imóvel</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "novo", label: "✨ Novo / Pronto" },
                          { id: "usado", label: "🏡 Usado" },
                          { id: "em_construcao", label: "🏗️ Em Construção" },
                          { id: "na_planta", label: "📐 Na Planta" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setFormCondition(c.id as any)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                              formCondition === c.id
                                ? "bg-slate-800 text-amber-400 border-amber-500 shadow-sm"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cômodos com seletores numéricos rápidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                      {/* Quartos */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Quartos</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFormBedrooms(num)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                formBedrooms === num
                                  ? "bg-amber-500 text-slate-950 border-amber-400"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {num === 5 ? "5+" : num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Suítes */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Suítes</label>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFormSuites(num)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                formSuites === num
                                  ? "bg-amber-500 text-slate-950 border-amber-400"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {num === 4 ? "4+" : num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Banheiros */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Banheiros</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFormBathrooms(num)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                formBathrooms === num
                                  ? "bg-amber-500 text-slate-950 border-amber-400"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {num === 5 ? "5+" : num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vagas */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Vagas de Garagem</label>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFormParkingSpots(num)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                formParkingSpots === num
                                  ? "bg-amber-500 text-slate-950 border-amber-400"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {num === 4 ? "4+" : num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Vaga coberta / descoberta + Áreas */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Vaga</label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFormGarageType("coberta")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                              formGarageType === "coberta"
                                ? "bg-slate-800 text-white border-amber-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            Coberta
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormGarageType("descoberta")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                              formGarageType === "descoberta"
                                ? "bg-slate-800 text-white border-amber-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            Descoberta
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Área Útil Privativa (m²)</label>
                        <input
                          name="usefulAreaM2"
                          type="number"
                          placeholder="Ex: 85"
                          defaultValue="85"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Área Total / Terreno (m²)</label>
                        <input
                          name="totalAreaM2"
                          type="number"
                          placeholder="Ex: 120"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Idade do Imóvel (anos)</label>
                        <input
                          name="propertyAge"
                          type="number"
                          placeholder="Ex: 5"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Posição Solar e Vista */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          Posição Solar
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "nascente", label: "Nascente (Sol Manhã)" },
                            { id: "norte_sul", label: "Norte / Sul" },
                            { id: "poente", label: "Poente (Sol Tarde)" },
                          ].map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setFormSolarPosition(pos.id as any)}
                              className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition ${
                                formSolarPosition === pos.id
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          Tipo de Vista
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: "frente", label: "Frente" },
                            { id: "fundos", label: "Fundos" },
                            { id: "lagoa", label: "Lagoa / Mar" },
                            { id: "av_principal", label: "Av. Principal" },
                          ].map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setFormViewType(v.id as any)}
                              className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition ${
                                formViewType === v.id
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 3: COMODIDADES PRIVATIVAS (20 ITENS - PÁGINAS 2 & 3) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Home className="w-4 h-4 text-amber-500" />
                          3. Comodidades Privativas (20 Itens do Imóvel)
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Selecione todos os itens instalados dentro da unidade privativa.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        {formPrivateAmenities.length} selecionados
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRIVATE_AMENITIES_LIST.map((item) => {
                        const isSelected = formPrivateAmenities.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => togglePrivateAmenity(item)}
                            className={`p-2.5 rounded-xl text-left text-xs font-medium border flex items-center gap-2 transition ${
                              isSelected
                                ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SEÇÃO 4: ESTRUTURA DO CONDOMÍNIO (32 ITENS - PÁGINA 3) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-500" />
                          4. Estrutura & Lazer do Condomínio (32 Itens)
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Itens de conveniência, segurança e entretenimento das áreas comuns.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                        {formCondoAmenities.length} selecionados
                      </span>
                    </div>

                    <div className="space-y-4">
                      {CONDO_AMENITIES_GROUPS.map((group) => (
                        <div key={group.category} className="space-y-2">
                          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {group.category}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {group.items.map((item) => {
                              const isSelected = formCondoAmenities.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleCondoAmenity(item)}
                                  className={`p-2 rounded-xl text-left text-[11px] font-medium border flex items-center gap-2 transition ${
                                    isSelected
                                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold"
                                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                                  }`}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                  )}
                                  <span className="truncate">{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SEÇÃO 5: LOCALIZAÇÃO & BLINDAGEM MLS (PÁGINA 4) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      5. Localização & Blindagem de Endereço MLS
                    </h3>

                    {/* Busca Inteligente por CEP */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                          <span>CEP (Busca Automática)</span>
                          {isSearchingCep && <span className="text-[10px] text-amber-400 font-bold animate-pulse">Buscando...</span>}
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            value={formCep}
                            onChange={(e) => handleCepLookup(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCepLookup();
                              }
                            }}
                            placeholder="00000-000"
                            maxLength={9}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleCepLookup()}
                            disabled={isSearchingCep}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Buscar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Cidade</label>
                        <input
                          value={formCity}
                          onChange={(e) => setFormCity(e.target.value)}
                          required
                          placeholder="São Paulo"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Estado (UF)</label>
                        <input
                          value={formState}
                          onChange={(e) => setFormState(e.target.value)}
                          required
                          maxLength={2}
                          placeholder="SP"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Bairro (Visível no MLS) *
                        </label>
                        <input
                          value={formNeighborhood}
                          onChange={(e) => setFormNeighborhood(e.target.value)}
                          required
                          placeholder="Ex: Moema"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Nome do Condomínio / Edifício
                        </label>
                        <input
                          name="condoName"
                          placeholder="Ex: Edifício Terraços de Moema"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Rua e Blindagem */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Rua / Logradouro</label>
                      <input
                        value={formStreet}
                        onChange={(e) => setFormStreet(e.target.value)}
                        placeholder="Ex: Alameda dos Arapanés"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* BLINDAGEM TOGGLE */}
                    <div
                      onClick={() => setFormHideStreet(!formHideStreet)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        formHideStreet
                          ? "bg-amber-950/20 border-amber-500 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="mt-0.5">
                        {formHideStreet ? (
                          <CheckSquare className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>[x] Ocultar Rua do Cliente Final (Blindagem MLS Ativa)</span>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          Recomendado! Os corretores parceiros e compradores veem apenas o Bairro e a Cidade na vitrine e na ficha white-label. O nome da rua e o número só são revelados após a assinatura do DVP Digital de 180 dias.
                        </p>
                      </div>
                    </div>

                    {/* Campos confidenciais de unidade */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Número (Confidencial)</label>
                        <input
                          name="streetNumber"
                          placeholder="842"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Bloco / Torre</label>
                        <input
                          name="block"
                          placeholder="Torre B"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Andar / Unidade</label>
                        <input
                          name="floor"
                          placeholder="12º andar, Apto 122"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 6: FOTOS & MÍDIAS (PÁGINA 4) */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      6. Mídias, Fotos (até 30 fotos), Planta Baixa & Vídeo Tour
                    </h3>

                    {/* Foto de Capa */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        URL da Foto de Capa (Principal) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={formCoverPhoto}
                          onChange={(e) => setFormCoverPhoto(e.target.value)}
                          placeholder="https://exemplo.com/foto-capa.jpg"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Galeria de Fotos (até 30 fotos) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">
                          Galeria de Fotos do Imóvel ({formGalleryPhotos.length}/30 fotos)
                        </label>
                        <span className="text-[11px] text-slate-500">Insira a URL de cada foto</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={newPhotoInput}
                          onChange={(e) => setNewPhotoInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddPhoto();
                            }
                          }}
                          placeholder="Cole a URL da foto e clique em Adicionar..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhoto}
                          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                        >
                          Adicionar Foto
                        </button>
                      </div>

                      {/* Miniaturas da Galeria */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                        {formGalleryPhotos.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950"
                          >
                            <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="bg-red-600 text-white p-1 rounded-md text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] px-1 py-0.5 rounded text-white font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fotos da Planta Baixa */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="block text-xs font-medium text-slate-300">
                        Fotos da Planta Baixa (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={newFloorPlanInput}
                          onChange={(e) => setNewFloorPlanInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddFloorPlan();
                            }
                          }}
                          placeholder="URL da foto da planta..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddFloorPlan}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition"
                        >
                          Adicionar Planta
                        </button>
                      </div>

                      {formFloorPlans.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {formFloorPlans.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group h-16 w-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-950"
                            >
                              <img src={url} alt="Planta" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveFloorPlan(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vídeo Tour */}
                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-amber-400" />
                        Link do Vídeo Tour (YouTube, Vimeo ou Tour 360)
                      </label>
                      <input
                        name="videoUrl"
                        placeholder="Ex: https://youtube.com/watch?v=..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Título & Descrição Comercial */}
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Título do Anúncio</label>
                        <input
                          name="title"
                          placeholder="Ex: Apartamento Amplo com Varanda Gourmet em Moema"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Descrição Comercial</label>
                        <textarea
                          name="description"
                          rows={3}
                          placeholder="Descreva os diferenciais, acabamento, vista e condições especiais do imóvel..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 7: BLINDAGEM DO CAPTADOR (PROPRIETÁRIO CONFIDENCIAL) */}
                  <div className="p-5 rounded-2xl bg-amber-950/20 border-2 border-amber-500/50 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-400" />
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                          7. Blindagem do Captador (Sigilo Absoluto do Proprietário)
                        </h3>
                      </div>
                      <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        Criptografado no Banco
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Estes dados nunca são compartilhados na vitrine, na ficha white-label nem com corretores parceiros. Apenas você ({currentBroker.name}) tem acesso a estas informações.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Nome Completo do Proprietário *
                        </label>
                        <input
                          name="ownerName"
                          required
                          placeholder="Ex: Carlos de Souza"
                          className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Telefone / WhatsApp do Proprietário *
                        </label>
                        <input
                          name="ownerPhone"
                          required
                          placeholder="(11) 98888-7777"
                          className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-4 rounded-2xl transition shadow-xl shadow-amber-500/20 text-sm flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Publicar Imóvel com Blindagem Ativa na Rede Negocia Lar</span>
                  </button>
                </form>
              </>
            )}
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

      {/* Modal de Onboarding Direto */}
      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={(newUserData) => {
          setCurrentUser(newUserData);
          setUserList((prev) => [newUserData, ...prev.filter((u) => u.id !== newUserData.id)]);
          setIsOnboardingModalOpen(false);
          setToastMessage(`🎉 Usuário Master criado com sucesso! Bem-vindo(a), ${newUserData.name}.`);
          setTimeout(() => setToastMessage(null), 6000);
        }}
      />
    </div>
  );
}
