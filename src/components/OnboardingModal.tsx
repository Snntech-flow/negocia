"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  Clock,
  Sparkles,
  QrCode,
  X,
  AlertCircle,
  HelpCircle,
  CreditCard,
} from "lucide-react";

import { validateCreciWithAI, registerUserWithPix } from "@/lib/actions";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userData: any) => void;
  initialPlan?: string;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  initialPlan = "40",
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [copiedPix, setCopiedPix] = useState(false);
  const [aiValidating, setAiValidating] = useState(false);
  const [aiCreciResult, setAiCreciResult] = useState<{
    isValid: boolean;
    status?: string;
    council?: string;
    message: string;
  } | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    creci: "",
    state: "SP",
    city: "São Paulo",
    accountType: "corretor", // 'corretor' ou 'imobiliaria'
    plan: initialPlan, // '10', '20', '40', 'imobiliaria'
    billingCycle: "monthly", // 'monthly' ou 'annual'
  });

  if (!isOpen) return null;

  const plansConfig: Record<string, { name: string; monthly: number; annual: number; limit: string; desc: string }> = {
    "10": {
      name: "10 Captações",
      monthly: 59.9,
      annual: 49.9,
      limit: "Até 10 captações ativas",
      desc: "Ideal para começar a girar parcerias",
    },
    "20": {
      name: "20 Captações",
      monthly: 89.9,
      annual: 74.9,
      limit: "Até 20 captações ativas",
      desc: "Com Radar de Compradores incluso",
    },
    "40": {
      name: "40 Captações",
      monthly: 150.0,
      annual: 125.0,
      limit: "Até 40 captações ativas",
      desc: "Mais escolhido por corretores ativos",
    },
    "imobiliaria": {
      name: "Imobiliária",
      monthly: 499.0,
      annual: 399.0,
      limit: "Captações ILIMITADAS (Até 5 corretores)",
      desc: "Gestão unificada com CRECI Jurídico",
    },
  };

  const currentPlanConfig = plansConfig[formData.plan] || plansConfig["40"];
  const currentPrice =
    formData.billingCycle === "monthly" ? currentPlanConfig.monthly : currentPlanConfig.annual;
  const formattedPrice =
    currentPrice % 1 === 0 ? currentPrice.toFixed(0) : currentPrice.toFixed(2).replace(".", ",");

  // Código Pix Copia e Cola Simulado (BR Code Itaú)
  const pixCode = `00020126580014br.gov.bcb.pix0136contato@snntech.com.br520400005303986540${currentPrice.toFixed(2)}5802BR5915SNNTECH TECNOL6009SAO PAULO62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleVerifyCreciAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiValidating(true);
    setAiCreciResult(null);

    const res = await validateCreciWithAI(formData.creci, formData.state, formData.name);
    setAiValidating(false);
    setAiCreciResult(res);

    if (res.isValid) {
      setTimeout(() => {
        setStep(2);
      }, 1200);
    }
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleFinishPayment = async () => {
    // Registra no banco PostgreSQL
    const res = await registerUserWithPix({
      name: formData.name,
      email: formData.email,
      whatsapp: formData.whatsapp,
      creci: formData.creci,
      state: formData.state,
      city: formData.city,
      plan: formData.plan,
      monthlyFee: currentPrice.toFixed(2),
    });
    if (res.user) {
      setRegisteredUser(res.user);
    }
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Modal */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-amber-500/40">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill className="object-cover" />
            </div>
            <div>
              <div className="text-sm font-extrabold flex items-center gap-1.5">
                <span>Negocia<span className="text-amber-500">lar</span></span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded">SNNtech</span>
              </div>
              <div className="text-[11px] text-slate-400">Onboarding & Ativação de Corretor</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso em 3 Passos */}
        {step < 4 && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-semibold">
            <div className={`flex items-center gap-1.5 ${step === 1 ? "text-amber-600 font-bold" : step > 1 ? "text-emerald-600" : "text-slate-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? "bg-amber-600 text-white" : step > 1 ? "bg-emerald-600 text-white" : "bg-slate-200"}`}>
                {step > 1 ? <Check className="w-3 h-3" /> : "1"}
              </span>
              <span>Identificação</span>
            </div>

            <div className="w-8 h-0.5 bg-slate-200"></div>

            <div className={`flex items-center gap-1.5 ${step === 2 ? "text-amber-600 font-bold" : step > 2 ? "text-emerald-600" : "text-slate-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? "bg-amber-600 text-white" : step > 2 ? "bg-emerald-600 text-white" : "bg-slate-200"}`}>
                {step > 2 ? <Check className="w-3 h-3" /> : "2"}
              </span>
              <span>Plano</span>
            </div>

            <div className="w-8 h-0.5 bg-slate-200"></div>

            <div className={`flex items-center gap-1.5 ${step === 3 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? "bg-amber-600 text-white" : "bg-slate-200"}`}>
                3
              </span>
              <span>Ativação Pix</span>
            </div>
          </div>
        )}

        {/* PASSO 1: DADOS DO CORRETOR / CRECI */}
        {step === 1 && (
          <form onSubmit={handleVerifyCreciAndProceed} className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Passo 1: Seus Dados Profissionais</h3>
              <p className="text-xs text-slate-500">
                Apenas corretores e imobiliárias com CRECI ativo têm acesso à rede.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    accountType: "corretor",
                    creci: formData.creci.includes("MASTER") ? "" : formData.creci,
                  })
                }
                className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition ${
                  formData.accountType === "corretor"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Corretor (PF)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    accountType: "imobiliaria",
                    plan: "imobiliaria",
                    creci: formData.creci.includes("MASTER") ? "" : formData.creci,
                  })
                }
                className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition ${
                  formData.accountType === "imobiliaria"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Imobiliária (PJ)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    accountType: "master",
                    creci: "MASTER-SNNTECH",
                  })
                }
                className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition flex items-center justify-center gap-1 ${
                  formData.accountType === "master"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-amber-50/80 text-amber-900 border-amber-300 hover:bg-amber-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Master SNNtech</span>
              </button>
            </div>

            {formData.accountType === "master" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 font-bold" />
                <span>
                  <strong>Acesso Fundador / Master SNNtech:</strong> Cria sua conta de Administrador Geral sem exigir CRECI de corretor. Acesso total a todas as áreas!
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sidney Nunes"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp (com DDD)</label>
                <input
                  required
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formData.accountType === "master"
                    ? "Credencial Master (Automático)"
                    : formData.accountType === "imobiliaria"
                    ? "CRECI Jurídico (CRECI-J)"
                    : "CRECI Individual"}
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={formData.creci}
                    readOnly={formData.accountType === "master"}
                    onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                    placeholder={
                      formData.accountType === "master"
                        ? "MASTER-SNNTECH"
                        : formData.accountType === "imobiliaria"
                        ? "Ex: 34980-J"
                        : "Ex: 189420-F"
                    }
                    className={`w-full border rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none ${
                      formData.accountType === "master"
                        ? "bg-amber-50 border-amber-300 font-mono font-bold text-amber-900 cursor-not-allowed"
                        : "bg-slate-50 border-slate-200 focus:border-amber-600 focus:bg-white"
                    }`}
                  />
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="SP">SP</option>
                    <option value="RJ">RJ</option>
                    <option value="MG">MG</option>
                    <option value="PR">PR</option>
                    <option value="SC">SC</option>
                    <option value="RS">RS</option>
                    <option value="DF">DF</option>
                    <option value="GO">GO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Profissional</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cidade Principal de Atuação</label>
                <input
                  required
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input required type="checkbox" className="mt-0.5 rounded text-amber-600 focus:ring-amber-500" defaultChecked />
                <span>
                  Declaro ter inscrição regular no CRECI e comprometo-me com o Código de Ética COFECI (Resolução nº 326/92).
                </span>
              </label>
            </div>

            {/* FEEDBACK DO AGENTE DE IA */}
            {aiValidating && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                <span>🤖 <strong>Agente de IA Negocia Lar:</strong> Consultando regularidade no portal oficial do CRECI-{formData.state}...</span>
              </div>
            )}

            {aiCreciResult && aiCreciResult.isValid && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">CRECI {formData.creci.toUpperCase()} Verificado pela IA!</div>
                  <div className="text-[11px] text-emerald-700">{aiCreciResult.message}</div>
                </div>
              </div>
            )}

            {aiCreciResult && !aiCreciResult.isValid && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{aiCreciResult.status || "CRECI Não Aprovado"}</div>
                  <div className="text-[11px] text-red-700">{aiCreciResult.message}</div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={aiValidating}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-70 text-xs sm:text-sm"
              >
                {aiValidating ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Verificando no CRECI-{formData.state}...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Validar CRECI com IA e Escolher Plano</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* PASSO 2: ESCOLHA DO PLANO */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Passo 2: Escolha a Capacidade de Carteira</h3>
              <p className="text-xs text-slate-500">
                Sem plano grátis. Rede exclusiva para profissionais que geram resultado.
              </p>
            </div>

            {/* Alternador Mensal / Anual */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingCycle: "monthly" })}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formData.billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingCycle: "annual" })}
                className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                  formData.billingCycle === "annual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  -20% OFF
                </span>
              </button>
            </div>

            {/* Lista dos 4 Planos */}
            <div className="space-y-2.5">
              {Object.entries(plansConfig).map(([key, p]) => {
                const isSelected = formData.plan === key;
                const price = formData.billingCycle === "monthly" ? p.monthly : p.annual;
                const formatted = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2).replace(".", ",");
                return (
                  <div
                    key={key}
                    onClick={() => setFormData({ ...formData, plan: key })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/40 ring-1 ring-amber-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-amber-600 bg-amber-600" : "border-slate-300"
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {p.name}
                          {key === "40" && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded">
                              ⭐ Mais Escolhido
                            </span>
                          )}
                          {key === "imobiliaria" && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                              Até 5 corretores
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{p.limit} • {p.desc}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">R$ {formatted}<span className="text-[10px] text-slate-500 font-normal">/mês</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SELO DE GARANTIA DE 7 DIAS COM ESTORNO INTEGRAL */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold">Garantia Incondicional de 7 Dias (Art. 49 CDC):</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Teste a plataforma por 7 dias. Se por qualquer motivo você não quiser continuar, basta solicitar pelo painel que estornamos <strong>100% do seu Pix de volta</strong> na sua conta sem burocracia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
              >
                <span>Pagar R$ {formattedPrice} no Pix Itaú</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: QR CODE PIX ITAÚ + ESTORNO 7 DIAS */}
        {step === 3 && (
          <div className="p-6 space-y-5 text-center">
            <div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Passo 3: Ativação Imediata
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                Pague via Pix Banco Itaú
              </h3>
              <p className="text-xs text-slate-500">
                Plano {currentPlanConfig.name} • Valor fixado de <strong>R$ {formattedPrice}</strong>
              </p>
            </div>

            {/* Simulação do QR Code Pix Estático com Valor */}
            <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl max-w-[280px] mx-auto flex flex-col items-center justify-center space-y-3 shadow-inner">
              {/* Mockup QR Code Visual */}
              <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative">
                <QrCode className="w-36 h-36 text-slate-900" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
                    NL
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <div className="font-bold text-slate-900">SNNtech Tecnologia</div>
                <div className="text-[11px] text-slate-500 font-mono">Banco Itaú • Chave: contato@snntech.com.br</div>
                <div className="text-base font-black text-amber-700 mt-1">R$ {formattedPrice}</div>
              </div>
            </div>

            {/* Botão Copiar Pix */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyPix}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition"
              >
                {copiedPix ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPix ? "Código Pix Copiado com Sucesso!" : "Copiar Código Pix Copia e Cola"}</span>
              </button>
            </div>

            {/* DESTAQUE DO PRAZO DE CANCELAMENTO / ESTORNO 7 DIAS */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl text-left space-y-1.5 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Prazo de 7 Dias para Pedido de Estorno (Art. 49 CDC)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Você tem <strong>7 dias corridos</strong> a partir de hoje para testar todos os recursos de co-corretagem. Caso decida não continuar dentro desse período, você pode solicitar o estorno integral de <strong>100% do valor do Pix</strong> direto no seu painel.
              </p>
            </div>

            {/* Botão de Finalização */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinishPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Já Realizei o Pagamento no App do Banco</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: SUCESSO & ATIVAÇÃO IMEDIATA */}
        {step === 4 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">
                Bem-vindo ao Negocia Lar!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Sua conta com plano <strong>{currentPlanConfig.name}</strong> foi registrada e seu acesso à rede MLS está liberado.
              </p>
            </div>

            {/* Lembrete da Garantia Ativa */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 text-left flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Garantia Ativa:</strong> Você tem 7 dias (até {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}) para solicitar estorno caso queira.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onComplete(registeredUser || formData);
                  onClose();
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Entrar na Plataforma e Cadastrar 1º Imóvel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
