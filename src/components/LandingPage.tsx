"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
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
} from "lucide-react";
import OnboardingModal from "./OnboardingModal";

export default function LandingPage({
  onAccessPlatform,
}: {
  onAccessPlatform: () => void;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState("40");

  const plans = [
    {
      name: "10 Captações",
      tagline: "Para o corretor que está iniciando sua carteira de parcerias",
      monthlyPrice: 59.9,
      annualPrice: 49.9,
      highlight: false,
      cta: "Assinar 10 Captações",
      features: [
        "Até 10 captações ativas simultâneas",
        "Acesso à vitrine de imóveis de todos os parceiros",
        "Endereço e proprietário 100% blindados",
        "Fichas White-Label para enviar a clientes",
        "Termos de Co-corretagem 50/50 em 1 clique",
        "Emissão de DVP Digital com Trava de 180 dias",
      ],
    },
    {
      name: "20 Captações",
      tagline: "Para corretores atuantes que querem dobrar o giro de vendas",
      monthlyPrice: 89.9,
      annualPrice: 74.9,
      highlight: false,
      cta: "Assinar 20 Captações",
      features: [
        "Até 20 captações ativas simultâneas",
        "Radar de Compradores (Match Reverso ativo)",
        "Fichas White-Label ilimitadas (Web + WhatsApp)",
        "Endereço e proprietário 100% blindados",
        "Termos de Co-corretagem 50/50 e DVPs ilimitados",
        "Alertas de novos imóveis compatíveis",
      ],
    },
    {
      name: "40 Captações",
      tagline: "O plano favorito dos corretores de alta performance",
      monthlyPrice: 150.0,
      annualPrice: 125.0,
      highlight: true,
      badge: "Mais Escolhido ⭐",
      cta: "Assinar 40 Captações",
      features: [
        "Até 40 captações ativas simultâneas",
        "Radar de Compradores prioritário com notificações",
        "Fichas White-Label em Web e PDF com seu WhatsApp e CRECI",
        "Selo de Corretor Verificado Negocia Lar",
        "Termos 50/50 com Cláusula Penal de 100% anti-bypass",
        "Suporte direto e prioritário via WhatsApp",
      ],
    },
    {
      name: "Imobiliária",
      tagline: "Para imobiliárias e gestores com equipes de vendas",
      monthlyPrice: 499.0,
      annualPrice: 399.0,
      highlight: false,
      badge: "CRECI Jurídico",
      cta: "Assinar Imobiliária",
      features: [
        "SEM LIMITES de captação (Ilimitadas)",
        "Até 5 corretores da equipe sob o mesmo CRECI-J",
        "Painel do gestor para acompanhar captações da equipe",
        "Fichas White-Label com o logotipo da sua Imobiliária",
        "Radar compartilhado de clientes da imobiliária",
        "Suporte a corretores adicionais sob demanda",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans antialiased">
      {/* Barra Superior Institucional */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 text-center font-medium">
        <span className="text-amber-400 font-bold">Atenção corretor:</span> Em conformidade com a Resolução COFECI nº 326/92 e Código Civil Brasileiro (Arts. 725-728).
      </div>

      {/* Header Limpo & Autoritário */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill className="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                  Negocia<span className="text-amber-600">lar</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">
                  REDE MLS
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Um produto <span className="font-extrabold text-slate-800 tracking-tight">SNNtech</span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#dor" className="hover:text-amber-600 transition">O Problema</a>
            <a href="#como-funciona" className="hover:text-amber-600 transition">Como Funciona</a>
            <a href="#seguranca" className="hover:text-amber-600 transition">Segurança Jurídica</a>
            <a href="#planos" className="text-amber-600 font-bold">Planos & Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onAccessPlatform}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 sm:px-5 rounded-lg transition shadow-sm flex items-center gap-2"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Humanizado e Realista */}
      <section className="pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Texto Principal */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Blindagem Real Contra "Atravessadores"
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                Chega de perder comissão ou captação em grupos de WhatsApp.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                O <strong>Negocia Lar</strong> é a rede de parcerias onde você compartilha carteira com outros corretores com <strong>endereço e proprietário 100% blindados</strong>, links limpos para seus clientes e <strong>contrato 50/50 respaldado pelo COFECI</strong>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="#planos"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base py-3.5 px-7 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-center"
                >
                  <span>Ver Planos a partir de R$ 0</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </a>
                <button
                  onClick={onAccessPlatform}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base py-3.5 px-6 rounded-xl transition border border-slate-300 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Ver Imóveis Disponíveis (Demo)</span>
                </button>
              </div>

              {/* Prova Social Rápida */}
              <div className="pt-4 flex items-center gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Sem taxa oculta
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Art. 727 Código Civil
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Cancele quando quiser
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
                  <span className="text-[11px] text-amber-400 font-mono">100% White-Label</span>
                </div>

                {/* Corpo do Cartão que o cliente vê */}
                <div className="p-4 space-y-3 bg-slate-50/50">
                  {/* Dados do Corretor Parceiro */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120"
                        alt="Mariana"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Mariana Costa Ramos</div>
                        <div className="text-[11px] text-slate-500">CRECI 204112-F • Sua Corretora</div>
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
                      alt="Apartamento em Moema"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                      Moema, São Paulo
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900">Apto 3 Quartos (2 Suítes) com Varanda Gourmet</div>
                    <div className="text-base font-extrabold text-amber-700 mt-0.5">R$ 1.280.000</div>
                  </div>

                  {/* Botão de WhatsApp direto com Mariana */}
                  <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Falar com Mariana no WhatsApp</span>
                  </div>

                  {/* Aviso do Captador Oculto */}
                  <div className="text-[11px] text-center text-slate-500 pt-1 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    O cliente nunca descobre quem foi o captador nem o endereço exato.
                  </div>
                </div>
              </div>
            </div>

          </div>
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
              <h3 className="font-bold text-slate-900 text-sm">O "Parceiro Laranja Podre"</h3>
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
                Centenas de mensagens por dia, fotos com marca d'água de concorrentes, fichas sem endereço e zero histórico ou garantia formal de comissão.
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

      {/* Seção Como Funciona (A Solução Prática) */}
      <section id="como-funciona" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest">O Jeito Profissional</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Como o Negocia Lar protege você do início ao fim
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Captação com Cadeado</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você cadastra fotos e características. O endereço completo e o telefone do proprietário ficam guardados a sete chaves.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Divulgação White-Label</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seu parceiro gera um link limpo com o WhatsApp e CRECI DELE para mandar ao cliente comprador dele, com total segurança.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">DVP Digital na Visita</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Antes de entrar no imóvel, vocês emitem o DVP pelo celular com GPS e data/hora. A trava de anterioridade de 180 dias fica ativa.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Honorários Garantidos</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Negócio fechado, comissão dividida 50/50 com termo registrado e validade jurídica plena (Art. 728 do Código Civil).
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
              Acesso exclusivo para corretores e imobiliárias verificadas. Escolha a capacidade ideal para sua carteira.
            </p>

            {/* Alternador Mensal / Anual */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-500"}`}>
                Mensal
              </span>
              <button
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
                  -20% OFF
                </span>
              </span>
            </div>
          </div>

          {/* Cards dos 4 Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
            {plans.map((p, idx) => {
              const price = billingCycle === "monthly" ? p.monthlyPrice : p.annualPrice;
              const formattedPrice = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2).replace(".", ",");
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition border ${
                    p.highlight
                      ? "border-amber-500 bg-amber-50/25 shadow-xl relative xl:-translate-y-2 ring-1 ring-amber-500"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                      {p.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.tagline}</p>
                    </div>

                    <div className="py-2 border-y border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-slate-500">R$</span>
                        <span className="text-3xl font-extrabold text-slate-950">{formattedPrice}</span>
                        <span className="text-xs text-slate-500">/mês</span>
                      </div>
                      {billingCycle === "annual" && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Cobrado anualmente (R$ {(price * 12).toFixed(2).replace(".", ",")}/ano)
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                        Recursos inclusos:
                      </div>
                      {p.features.map((f, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => {
                        const planKey = p.name.includes("10")
                          ? "10"
                          : p.name.includes("20")
                          ? "20"
                          : p.name.includes("40")
                          ? "40"
                          : "imobiliaria";
                        setSelectedPlanForOnboarding(planKey);
                        setIsOnboardingOpen(true);
                      }}
                      className={`w-full py-3 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                        p.highlight
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>{p.cta}</span>
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
                <TrendingUp className="w-4 h-4" /> A Conta Matemática do Corretor
              </div>
              <h4 className="text-base sm:text-lg font-bold">1 única parceria cobre 13 anos de mensalidade.</h4>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Em um imóvel de R$ 800.000, sua fatia de 50% de comissão é de <strong>R$ 24.000</strong>. O Plano Pro custa R$ 149/mês. Não é custo, é alavancagem de vendas.
              </p>
            </div>
            <button
              onClick={onAccessPlatform}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl transition whitespace-nowrap"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </section>

      {/* Seção FAQ Rápida */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dúvidas Frequentes</h2>
            <p className="text-2xl font-extrabold text-slate-950">Perguntas Diretas dos Corretores</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Como o sistema garante que meu parceiro não vai direto ao proprietário?",
                a: "O endereço exato e os dados do proprietário ficam criptografados e inacessíveis para os outros corretores. E antes de qualquer visita, vocês emitem o DVP Digital que gera a trava jurídica de 180 dias.",
              },
              {
                q: "O cliente final descobre quem é o captador do imóvel?",
                a: "Nunca. Ao compartilhar a ficha White-Label, todos os dados exibidos na tela e no PDF (nome, CRECI, telefone e botão de WhatsApp) são exclusivamente seus.",
              },
              {
                q: "Preciso ter CRECI ativo para participar?",
                a: "Sim. O Negocia Lar é uma rede B2B exclusiva para corretores e imobiliárias devidamente inscritos no CRECI. Todas as contas passam por moderação.",
              },
              {
                q: "Existe taxa de cancelamento ou contrato de fidelidade?",
                a: "Não. No plano mensal você pode cancelar a qualquer momento direto pelo painel com 1 clique.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
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
            © 2026 SNNtech. Todos os direitos reservados. Em conformidade com a Res. COFECI 326/92 e Código Civil.
          </div>
        </div>
      </footer>

      {/* Modal de Onboarding */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => {
          setIsOnboardingOpen(false);
          onAccessPlatform();
        }}
        initialPlan={selectedPlanForOnboarding}
      />
    </div>
  );
}
