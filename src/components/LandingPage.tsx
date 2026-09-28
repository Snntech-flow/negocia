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
  onAccessPlatform: (userData?: any) => void;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState("40");
  const [onboardingMode, setOnboardingMode] = useState<"register" | "login">("register");

  const plans = [
    {
      name: "10 Anúncios",
      tagline: "Para o corretor que está iniciando sua carteira de parcerias",
      monthlyPrice: 59.9,
      annualPrice: 54.91,
      highlight: false,
      cta: "Criar cadastro",
      features: [
        "Até 10 anúncios ativos simultâneos",
        "Vitrine de imóveis em versão inicial",
        "Dados de contato do proprietário restritos ao captador",
        "Perfis de busca de compradores",
        "Registro interno de visita em rascunho",
      ],
    },
    {
      name: "20 Anúncios",
      tagline: "Para corretores atuantes que querem dobrar o giro de vendas",
      monthlyPrice: 89.9,
      annualPrice: 82.41,
      highlight: false,
      cta: "Criar cadastro",
      features: [
        "Vitrine de imóveis em versão inicial",
        "Dados de contato do proprietário restritos ao captador",
        "Perfis de busca de compradores",
        "Registro interno de visita em rascunho",
      ],
    },
    {
      name: "40 Anúncios",
      tagline: "O plano favorito dos corretores de alta performance",
      monthlyPrice: 150.0,
      annualPrice: 137.5,
      highlight: true,
      badge: "Mais Escolhido ⭐",
      cta: "Criar cadastro",
      features: [
        "Vitrine de imóveis em versão inicial",
        "Dados de contato do proprietário restritos ao captador",
        "Perfis de busca de compradores",
        "Registro interno de visita em rascunho",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans antialiased">
      {/* Barra Superior Institucional */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 text-center font-medium">
        <span className="text-amber-400 font-bold">Versão inicial:</span> pagamento e assinatura eletrônica ainda não estão integrados.
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
                  REDE DE IMÓVEIS
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

          <div className="flex items-center gap-2 sm:gap-3">
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
      </header>

      {/* Hero Humanizado e Realista */}
      <section className="pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Texto Principal */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Rede de parcerias em versão inicial
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                Chega de perder comissão ou captação em grupos de WhatsApp.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                O <strong>Negocia Lar</strong> está em desenvolvimento para ajudar corretores a organizar imóveis e oportunidades de parceria. Dados de contato do proprietário aparecem apenas para o corretor que cadastrou o imóvel; aceite eletrônico e pagamentos ainda não estão disponíveis.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="#planos"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base py-3.5 px-7 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-center"
                >
                  <span>Conhecer Planos & Preços</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </a>
                <button
                  onClick={() => {
                    setOnboardingMode("register");
                    setSelectedPlanForOnboarding("40");
                    setIsOnboardingOpen(true);
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base py-3.5 px-6 rounded-xl transition border border-slate-300 flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cadastrar Corretor (CRECI)</span>
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
                  Plataforma em desenvolvimento
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Piloto sem cobrança integrada
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
                O sistema registra os dados da visita em rascunho. O registro não coleta assinatura nem produz sozinho uma garantia jurídica.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Formalização em desenvolvimento</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                A divisão e os termos da parceria precisam ser acordados e formalizados pelas partes. O sistema ainda não produz esse contrato.
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
                  1 Mês Grátis (Use 12, Pague 11)
                </span>
              </span>
            </div>
          </div>

          {/* Cards dos 3 Planos Individuais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {plans.map((p, idx) => {
              const price = billingCycle === "monthly" ? p.monthlyPrice : p.annualPrice;
              const annualTotal = (p.monthlyPrice * 11).toFixed(2).replace(".", ",");
              const formattedPrice = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2).replace(".", ",");
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition border ${
                    p.highlight
                      ? "border-amber-500 bg-amber-50/25 shadow-xl relative md:-translate-y-2 ring-1 ring-amber-500"
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
                          Cobrado anualmente: R$ {annualTotal}/ano (Usa 12, paga 11)
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
                        setOnboardingMode("register");
                        const planKey = p.name.includes("10")
                          ? "10"
                          : p.name.includes("20")
                          ? "20"
                          : "40";
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
              <h4 className="text-base sm:text-lg font-bold">Organize oportunidades e parcerias imobiliárias.</h4>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Registre seus imóveis e acompanhe as oportunidades com seus clientes. Os valores dos planos são apenas uma referência enquanto o pagamento não está integrado.
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
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dúvidas Frequentes</h2>
            <p className="text-2xl font-extrabold text-slate-950">Perguntas Diretas dos Corretores</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Quem consegue ver os dados do proprietário?",
                a: "Os dados do proprietário são restritos ao corretor que cadastrou o imóvel. A versão atual não oferece assinatura eletrônica ou garantia jurídica automática; o registro de visita fica como rascunho.",
              },
              {
                q: "O cliente final descobre quem é o captador do imóvel?",
                a: "Os dados completos do proprietário são exibidos somente para o corretor que cadastrou o imóvel. A ficha pública e o PDF ainda estão em desenvolvimento.",
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
            © 2026 SNNtech. Todos os direitos reservados. Plataforma em desenvolvimento.
          </div>
        </div>
      </footer>

      {/* Modal de Onboarding */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={(userData) => {
          setIsOnboardingOpen(false);
          onAccessPlatform(userData);
        }}
        initialPlan={selectedPlanForOnboarding}
        initialMode={onboardingMode}
      />
    </div>
  );
}
