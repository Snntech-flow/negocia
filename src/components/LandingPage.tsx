"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  ShieldCheck,
  Share2,
  FileText,
  Radar,
  Building2,
  CheckCircle2,
  Lock,
  Phone,
  ArrowRight,
  Scale,
  Users,
  Stamp,
  Check,
  TrendingUp,
  X,
  MessageSquare,
  MapPin,
  Clock,
  AlertOctagon,
  ChevronDown,
  Menu,
} from "lucide-react";
import OnboardingModal from "./OnboardingModal";
import { PLAN_IDS, PLANS, planMonthlyEquivalent } from "@/lib/plans";

export default function LandingPage({
  onAccessPlatform,
}: {
  onAccessPlatform: (userData?: Parameters<React.ComponentProps<typeof OnboardingModal>["onComplete"]>[0]) => void;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState("40");
  const [onboardingMode, setOnboardingMode] = useState<"register" | "login">("register");
  const [menuOpen, setMenuOpen] = useState(false);

  const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  const planFeatures = [
    "Até 40 fotos por imóvel",
    "Vitrine de imóveis para parcerias",
    "Endereço e proprietário visíveis só para o captador",
    "Radar de compradores e CRM",
    "Registro interno de visitas",
  ];
  const navLinks = [
    { href: "#sistema", label: "CRM e Radar" },
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#planos", label: "Planos e preços" },
    { href: "#duvidas", label: "Dúvidas" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans antialiased">
      {/* Barra Superior Institucional */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 text-center font-medium">
        <span className="text-amber-400 font-bold">Experimente por 30 dias grátis.</span> Sem pagamento no cadastro. Depois, renove seu plano via Pix.
      </div>

      {/* Header Limpo & Autoritário */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="56px" className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl leading-none tracking-tight text-slate-900">
                  Negocia<span className="text-amber-600">lar</span>
                </span>
              </div>
              <div className="mt-0.5 sm:mt-1.5 flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] sm:text-[11px] leading-3 sm:leading-4 font-bold text-amber-800">
                <ShieldCheck className="h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="hidden sm:inline">Rede de parcerias para corretores</span>
                <span className="sm:hidden">Parcerias para corretores</span>
              </div>
            </div>
          </div>

          <nav aria-label="Seções" className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            {navLinks.map((link) => <a key={link.href} href={link.href} className={link.href === "#planos" ? "text-amber-700 font-bold" : "hover:text-amber-700 transition"}>{link.label}</a>)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="menu-celular" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden rounded-lg border border-slate-300 p-2 text-slate-700"><Menu className="h-5 w-5" /></button>
            <button
              onClick={() => {
                setOnboardingMode("login");
                setSelectedPlanForOnboarding("40");
                setIsOnboardingOpen(true);
              }}
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg transition border border-slate-300"
            >
              Entrar
            </button>
          </div>
        </div>
        {menuOpen && <nav id="menu-celular" aria-label="Seções" className="md:hidden border-t border-slate-200 bg-white px-4 py-2">
          {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-semibold text-slate-700">{link.label}</a>)}
        </nav>}
      </header>

      {/* Hero Humanizado e Realista */}
      <section className="pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Texto Principal */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-center">
                <Radar className="mx-auto h-8 w-8 text-orange-500" aria-hidden="true" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-amber-700">Match automático no Radar</p>
                <p className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950">O “<span className="text-orange-500">Tinder</span>” dos corretores</p>
                <p className="mt-2 text-sm text-slate-600">Você cadastra o que seu cliente procura. Se outro corretor tem o imóvel, a plataforma dá o Match e avisa você.</p>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                Chega de perder comissão e captação.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Cansado de perder tempo procurando o imóvel do seu cliente? Um corretor tem o imóvel, outro tem o cliente. O Negocia Lar cruza os dois, organiza sua carteira e acompanha a negociação do primeiro contato à documentação.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingMode("register");
                    setSelectedPlanForOnboarding("40");
                    setIsOnboardingOpen(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base py-3.5 px-7 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Começar 30 dias grátis</span>
                </button>
                <a
                  href="#planos"
                  className="bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base py-3.5 px-6 rounded-xl transition border border-slate-300 flex items-center justify-center gap-2 shadow-sm text-center"
                >
                  <span>Ver planos e preços</span>
                  <ArrowRight className="w-4 h-4 text-amber-600" />
                </a>
              </div>

              {/* Prova Social Rápida */}
              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Sem taxa oculta
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  30 dias grátis para conhecer a plataforma
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Pagamento via Pix
                </div>
              </div>
            </div>

            {/* Mockup Realista da Situação (Lado Direito) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Header Mockup */}
                <div className="bg-slate-900 text-white px-4 py-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold">Como seu cliente recebe o imóvel</span>
                  </div>
                  <span className="text-[11px] text-amber-400">Exemplo ilustrativo</span>
                </div>

                {/* Corpo do Cartão que o cliente vê */}
                <div className="p-4 space-y-3 bg-slate-50/50">
                  {/* Dados do Corretor Parceiro */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-sm font-bold text-amber-900">VC</span>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Você, corretor parceiro</div>
                        <div className="text-[11px] text-slate-500">Seu nome e seu CRECI</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      Atendimento Direto
                    </span>
                  </div>

                  {/* Foto do Imóvel */}
                  <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
                      alt="Imagem ilustrativa de imóvel"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                      Bairro, cidade
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900">Título do anúncio do captador</div>
                    <div className="text-base font-extrabold text-amber-700 mt-0.5">Valor do imóvel</div>
                  </div>

                  {/* Botão de WhatsApp do corretor parceiro */}
                  <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Falar com você no WhatsApp</span>
                  </div>

                  {/* Aviso do Captador Oculto */}
                  <div className="text-[11px] text-center text-slate-500 pt-1 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    A ficha mostra o seu contato e o bairro, sem o captador e sem o endereço.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="sistema" className="border-b border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Muito além de uma vitrine de imóveis</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-slate-950 sm:text-3xl">O Match certo para seus imóveis.<br className="hidden sm:block" /> Um CRM para organizar seus negócios.</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">Encontre oportunidades de parceria, organize seus clientes e prepare a documentação da negociação em um só lugar.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">

              <Radar className="h-8 w-8 text-orange-500" aria-hidden="true" />
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-amber-700">Match automático no Radar</p>
              <h3 className="mt-2 text-lg font-extrabold text-slate-950">Quem tem o imóvel encontra quem tem o cliente</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Um corretor tem o imóvel. Outro tem o cliente. Cadastre a busca no Radar e o sistema cruza os critérios com os imóveis para parceria, avisando o corretor que procura quando encontra compatibilidade.</p>
            </article>
            <article className="rounded-2xl border border-sky-300 bg-sky-200 p-6">
              <LayoutDashboard className="h-8 w-8 text-sky-700" aria-hidden="true" />
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-sky-700">Sua carteira organizada</p>
              <h3 className="mt-2 text-lg font-extrabold text-slate-950">Seu CRM integrado</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Organize clientes, acompanhe cada etapa da negociação e agende os próximos contatos. Sua agenda, suas anotações e seu histórico ficam privados na sua conta.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <FileText className="h-8 w-8 text-slate-900" aria-hidden="true" />
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">Agilidade no atendimento</p>
              <h3 className="mt-2 text-lg font-extrabold text-slate-950">Da oportunidade à documentação</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Personalize a lista de documentos e os custos da operação, acompanhe pendências e compartilhe a lista com o cliente pelo WhatsApp ou PDF. Salve seu modelo para reutilizar.</p>
            </article>
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">O cruzamento acontece ao cadastrar uma busca no Radar ou um novo imóvel de venda para parceria. O Match indica compatibilidade; os corretores confirmam os detalhes e combinam a parceria.</p>
          <div className="mt-6 text-center"><button onClick={() => { setSelectedPlanForOnboarding("40"); setOnboardingMode("register"); setIsOnboardingOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400">Conhecer o sistema por 30 dias grátis <ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>
        </div>
      </section>

      {/* Seção O PROBLEMA REAL (A Dor do Corretor) */}
      <section id="dor" className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">A Realidade do Mercado</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Você já passou por alguma dessas situações?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-red-100 bg-red-50/30 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                ✕
              </div>
              <h3 className="font-bold text-slate-900 text-sm">O corretor atravessador</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você leva o corretor parceiro para visitar o imóvel com o cliente dele. Dias depois, descobre que ele foi direto no proprietário para tirar você da jogada.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-red-100 bg-red-50/30 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                ✕
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Grupos de WhatsApp Caóticos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centenas de mensagens por dia, fotos com marca d&apos;água de concorrentes, fichas sem endereço e zero histórico ou garantia formal de comissão.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-red-100 bg-red-50/30 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                ✕
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Cliente Desviado Sem Provas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você atende o cliente, mostra o imóvel, mas a venda é concretizada depois por outro intermediário e você fica sem provas documentais da mediação.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-5xl space-y-3 px-4 sm:px-6">
          <Radar className="h-8 w-8 text-amber-600" aria-hidden="true" />
          <h2 className="text-2xl font-extrabold text-slate-950">Radar de compradores: encontre oportunidades para seus imóveis</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">Cadastre o que seu cliente procura e compare com os imóveis disponíveis. O Match indica a compatibilidade entre as preferências do comprador e as características do imóvel, ajudando você a encontrar possíveis parcerias. Confira os critérios e converse com o corretor responsável para confirmar os detalhes.</p>
        </div>
      </section>

      {/* Seção Como Funciona (A Solução Prática) */}
      <section id="como-funciona" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest">O Jeito Profissional</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Como o Negocia Lar<br />
              organiza a parceria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Endereço e proprietário só com você</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você cadastra fotos e características. O endereço completo e o telefone do proprietário ficam visíveis apenas para você.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Ficha para o cliente</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O corretor parceiro envia ao cliente dele uma ficha com o próprio WhatsApp e CRECI, sem o seu contato e sem o endereço.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">DVP — Documento de Visita Presencial</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                DVP significa Documento de Visita Presencial: um registro de quem visitou o imóvel, quando e com qual corretor. Nesta versão, o sistema salva esses dados em rascunho. O registro não coleta assinatura nem produz sozinho uma garantia jurídica.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Termo de Parceria</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Os dois corretores confirmam a divisão da comissão e a plataforma gera o Termo de Parceria, com cláusula de não atravessamento. Cada um aceita na NegociaLar, que registra data, hora e IP; depois é só imprimir ou salvar em PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção TABELA DE PLANOS & PREÇOS (Limpa, Editorial e Direta) */}
      <section id="planos" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest">Planos & Capacidade</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-950">
              Investimento transparente. Sem pegadinhas.
            </p>
            <p className="text-sm text-slate-600">
              Para corretores com CRECI verificado pela equipe. O plano define quantos anúncios você mantém ativos ao mesmo tempo.
            </p>

            {/* Alternador Mensal / Anual */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-500"}`}>
                Mensal
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={billingCycle === "annual"}
                aria-label="Cobrança anual"
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-12 h-6 bg-slate-200 rounded-full p-0.5 transition relative flex items-center"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-900 shadow transition transform ${
                    billingCycle === "annual" ? "translate-x-6 bg-amber-600" : "translate-x-0"
                  }`}
                ></div>
              </button>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingCycle === "annual" ? "text-slate-900" : "text-slate-500"}`}>
                Anual
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  use 12, pague 11
                </span>
              </span>
            </div>
          </div>

          {/* Cards dos 3 Planos Individuais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const highlight = id === "40";
              return (
                <div
                  key={id}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition border ${
                    highlight ? "border-amber-500 bg-amber-50/25 shadow-xl relative ring-1 ring-amber-500" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                  }`}
                >
                  {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">Maior capacidade</div>}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>
                    </div>
                    <div className="py-2 border-y border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-950">{money(planMonthlyEquivalent(id, billingCycle))}</span>
                        <span className="text-xs text-slate-500">/mês</span>
                      </div>
                      {billingCycle === "annual" && <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Cobrado no ano: {money(plan.annualTotal)} (use 12, pague 11)</div>}
                    </div>
                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">Em todos os planos:</div>
                      {planFeatures.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => { setOnboardingMode("register"); setSelectedPlanForOnboarding(id); setIsOnboardingOpen(true); }}
                      className={`w-full py-3 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${highlight ? "bg-amber-700 hover:bg-amber-800 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}
                    >
                      <span>Começar 30 dias grátis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparativo Prático de ROI */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="space-y-1 text-left">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Comece sem pagar
              </div>
              <h4 className="text-base sm:text-lg font-bold">Organize oportunidades e parcerias imobiliárias.</h4>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                30 dias grátis em qualquer plano. Depois, renovação via Pix, sem débito automático.
              </p>
            </div>
            <button
              onClick={() => {
                setOnboardingMode("register");
                setSelectedPlanForOnboarding("40");
                setIsOnboardingOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl transition whitespace-nowrap shadow"
            >
              Criar Minha Conta
            </button>
          </div>
        </div>
      </section>

      {/* Seção FAQ Rápida */}
      <section id="duvidas" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dúvidas Frequentes</h2>
            <p className="text-2xl font-extrabold text-slate-950">Perguntas Diretas dos Corretores</p>
          </div>

          <div className="space-y-3">
            {[
              {"q": "Como funcionam os 30 dias grátis?", "a": "Cada corretor tem 30 dias gratuitos a partir do cadastro, sem pagamento inicial. Use esse período para conhecer a plataforma. A verificação do CRECI é feita pela equipe e é necessária para acessar as funções restritas."},
              {"q": "Preciso pagar ou informar cartão para começar?", "a": "Não. O cadastro inicia o período gratuito sem cobrança e sem cartão. Após os 30 dias, você pode renovar o plano via Pix."},
              {"q": "O que acontece depois do período gratuito?", "a": "Para continuar usando as funções do plano, faça a renovação. Em Minha assinatura você consulta o prazo de acesso, o plano e o histórico de pagamentos. A cobrança não é automática."},
              {"q": "Qual plano devo escolher?", "a": "O plano define quantos anúncios você mantém ativos ao mesmo tempo: 10, 20 ou 40. Imóveis vendidos, alugados ou arquivados não contam. Todos os planos têm até 40 fotos por imóvel e os mesmos recursos."},
              {"q": "Como ganho um mês grátis por indicação?", "a": "Compartilhe seu link ou código de indicação, disponível em Minha assinatura. Quando a pessoa indicada tiver seu primeiro pagamento confirmado, você recebe mais 30 dias de acesso. O cadastro gratuito sozinho não gera a recompensa."},
              {"q": "Quem consegue ver os dados do proprietário?", "a": "O endereço completo e os dados de contato do proprietário ficam restritos ao corretor que cadastrou o imóvel. Confira as informações da ficha antes de compartilhar com um cliente."},
              {"q": "O que é a ficha para o cliente?", "a": "É uma apresentação do imóvel com o seu nome, CRECI e WhatsApp, para enviar ao seu cliente. Mostra bairro e cidade, sem o endereço completo e sem os dados do captador. Confira antes de enviar."},
              {"q": "Meus clientes ficam visíveis para outros corretores?", "a": "Sua carteira do CRM, contatos e histórico são privados. No Radar, preferências de busca podem ajudar a encontrar parcerias, sem expor o nome interno e as observações particulares do cliente."},
              {"q": "O que posso fazer no CRM?", "a": "Cadastrar clientes, organizar oportunidades no funil, registrar contatos, agendar retornos, filtrar a carteira e importar ou exportar contatos em CSV. Acesse CRM → Minha carteira."},
              {"q": "O que é importar CSV?", "a": "É trazer contatos de uma planilha para o CRM. CSV é um formato de arquivo que você pode salvar no Excel ou Google Planilhas. Na opção Importar contatos de uma planilha, confira as instruções e o modelo antes de enviar."},
              {"q": "Como funciona o Radar de compradores?", "a": "Ao cadastrar uma busca no Radar ou um novo imóvel de venda para parceria, o sistema cruza cidade, tipo, bairros, orçamento, quartos e vagas. Quando encontra compatibilidade, gera um aviso dentro do sistema para o corretor que procura. O Match não fecha a venda nem envia documentos automaticamente; os corretores confirmam os detalhes e combinam a parceria."},
              {"q": "O Bartolomeu pode ajudar com financiamento?", "a": "Sim. Ele ajuda com atendimento, organização do CRM e dúvidas sobre MCMV, SBPE, FGTS e financiamento. Pode pesquisar e apresentar fontes consultadas. Confirme regras e valores com o banco; a IA não aprova crédito nem garante subsídio. Não envie documentos ou dados pessoais de clientes."},
              {"q": "A simulação de amortização é uma proposta do banco?", "a": "Não. É uma estimativa matemática em SAC ou Price para comparar aportes que reduzem o prazo ou a parcela. Não inclui seguros, tarifas, TR/IPCA ou regras específicas da instituição. Confirme as condições no contrato e no banco."},
              {"q": "O que é DVP? Ele vale como contrato assinado?", "a": "DVP significa Documento de Visita Presencial. Na plataforma, ele registra os dados da visita como rascunho para acompanhamento. Esse registro não é assinatura eletrônica nem garante comissão; formalize os acordos entre as partes."},
              {"q": "Como pedir ajuda ou sugerir melhorias?", "a": "Depois de entrar, use o botão Ajuda no topo da tela. Sua mensagem vai para a equipe do Negocia Lar."},
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-slate-900">Negocia<span className="text-amber-600">lar</span></span>
              <span className="text-slate-300 hidden sm:inline">•</span>
            </div>
          </div>
          <div>
            © 2026 SNNtech. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Modal de Onboarding */}
      {isOnboardingOpen && <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={(userData) => {
          setIsOnboardingOpen(false);
          onAccessPlatform(userData);
        }}
        initialPlan={selectedPlanForOnboarding}
        initialMode={onboardingMode}
      />}
    </div>
  );
}
