"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Check,
  Building2,
  Clock,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";

import { validateCreciWithAI, registerUserWithPix, loginUser } from "@/lib/actions";

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
  const [mode, setMode] = useState<"register" | "login">("register");
  const [aiValidating, setAiValidating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
    password: "",
    whatsapp: "",
    creci: "",
    state: "SP",
    city: "São Paulo",
    plan: initialPlan === "imobiliaria" ? "40" : (initialPlan || "40"), // '10', '20', '40'
    billingCycle: "monthly", // 'monthly' ou 'annual'
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setMode("register");
    setActionError(null);
    setAiCreciResult(null);
    setRegisteredUser(null);
    setFormData((current) => ({
      ...current,
      name: "", email: "", password: "", whatsapp: "", creci: "",
      state: "SP", city: "São Paulo", plan: initialPlan === "imobiliaria" ? "40" : initialPlan,
      billingCycle: "monthly",
    }));
  }, [isOpen, initialPlan]);

  if (!isOpen) return null;

  const plansConfig: Record<string, { name: string; monthly: number; annual: number; annualTotal: number; limit: string; desc: string }> = {
    "10": {
      name: "10 Anúncios",
      monthly: 59.9,
      annual: 54.91,
      annualTotal: 658.9,
      limit: "Até 10 anúncios ativos",
      desc: "Ideal para começar a girar parcerias",
    },
    "20": {
      name: "20 Anúncios",
      monthly: 89.9,
      annual: 82.41,
      annualTotal: 988.9,
      limit: "Até 20 anúncios ativos",
      desc: "Com Radar de Compradores incluso",
    },
    "40": {
      name: "40 Anúncios",
      monthly: 150.0,
      annual: 137.5,
      annualTotal: 1650.0,
      limit: "Até 40 anúncios ativos",
      desc: "Mais escolhido por corretores ativos",
    },
  };

  const currentPlanConfig = plansConfig[formData.plan] || plansConfig["40"];
  const currentPrice =
    formData.billingCycle === "monthly" ? currentPlanConfig.monthly : currentPlanConfig.annual;
  const formattedPrice =
    currentPrice % 1 === 0 ? currentPrice.toFixed(0) : currentPrice.toFixed(2).replace(".", ",");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const result = await loginUser(formData.email, formData.password);
      onComplete(result.user);
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  };

  const handleVerifyCreciAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiValidating(true);
    setAiCreciResult(null);

    try {
      const res = await validateCreciWithAI(formData.creci, formData.state, formData.name);
      setAiCreciResult(res);

      if (res.isValid) setStep(2);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível validar o formato.");
    } finally {
      setAiValidating(false);
    }
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleFinishPayment = async () => {
    setActionError(null);
    try {
      const res = await registerUserWithPix({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        whatsapp: formData.whatsapp,
        creci: formData.creci,
        state: formData.state,
        city: formData.city,
        plan: formData.plan,
        billingCycle: formData.billingCycle as "monthly" | "annual",
      });
      if (res.user) setRegisteredUser(res.user);
      setStep(4);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível criar seu cadastro.");
    }
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
        {step < 4 && mode === "register" && (
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
              <span>Cadastro</span>
            </div>
          </div>
        )}

        {/* PASSO 1: DADOS DO CORRETOR / CRECI */}
        {step === 1 && mode === "login" && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Entrar no Negocia Lar</h3>
              <p className="text-xs text-slate-500">Use o e-mail e a senha do seu cadastro.</p>
            </div>
            <label className="block text-xs font-bold text-slate-700">E-mail
              <input required type="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Senha
              <input required type="password" autoComplete="current-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            </label>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
            <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Entrar</button>
            <button type="button" onClick={() => { setMode("register"); setActionError(null); }} className="w-full text-xs text-amber-700 font-semibold">Criar uma conta</button>
          </form>
        )}

        {step === 1 && mode === "register" && (
          <form onSubmit={handleVerifyCreciAndProceed} className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Passo 1: Seus Dados Profissionais</h3>
              <p className="text-xs text-slate-500">
                Informe seus dados; o formato do CRECI será conferido e a situação ficará pendente de validação.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">CRECI</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={formData.creci}
                    onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                    placeholder="Ex: 189420-F"
                    className="w-full border rounded-xl px-3 py-2 text-sm text-slate-900 bg-slate-50 border-slate-200 focus:border-amber-600 focus:bg-white"
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

            <label className="block text-xs font-bold text-slate-700">Senha (mínimo 12 caracteres)
              <input required minLength={12} maxLength={200} type="password" autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            </label>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}

            <p className="text-[11px] text-slate-500">O número será salvo como pendente; este formulário não consulta o CRECI nem registra aceite contratual.</p>

            {/* FEEDBACK DO AGENTE DE IA */}
            {aiValidating && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                <span>Conferindo apenas o formato do número. A situação do CRECI não é consultada automaticamente.</span>
              </div>
            )}

            {aiCreciResult && aiCreciResult.isValid && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Formato do CRECI aceito; situação ainda pendente</div>
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
                    <span>Conferindo formato...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Continuar para escolher o plano</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </div>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-amber-700 font-semibold">Já tem conta? Entrar</button>
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
                  1 Mês Grátis (Use 12, Pague 11)
                </span>
              </button>
            </div>

            {/* Lista dos 3 Planos */}
            <div className="space-y-2.5">
              {Object.entries(plansConfig).map(([key, p]) => {
                const isSelected = formData.plan === key;
                const price = formData.billingCycle === "monthly" ? p.monthly : p.annual;
                const formatted = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2).replace(".", ",");
                const annualTotalFormatted = p.annualTotal.toFixed(2).replace(".", ",");
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
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.limit} • {formData.billingCycle === "annual" ? `Usa 12, paga 11 (R$ ${annualTotalFormatted}/ano)` : p.desc}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">R$ {formatted}<span className="text-[10px] text-slate-500 font-normal">/mês</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* O gateway ainda não está configurado; não prometer nem coletar pagamento aqui. */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold">Pagamento ainda não integrado</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Seu cadastro e plano ficarão pendentes até a validação do CRECI e a confirmação de pagamento.
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
                <span>Continuar • plano {currentPlanConfig.name}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: CADASTRO PENDENTE */}
        {step === 3 && (
          <div className="p-6 space-y-5 text-center">
            <div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Passo 3: Cadastro
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                Pagamento não integrado
              </h3>
              <p className="text-xs text-slate-500">
                Plano {currentPlanConfig.name} • {formData.billingCycle === "annual" ? `R$ ${currentPlanConfig.annualTotal.toFixed(2).replace(".", ",")} cobrado anualmente (Use 12 meses, pague 11)` : `R$ ${formattedPrice}/mês`}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left text-xs text-amber-900">
              Não há QR Code nem confirmação automática de pagamento configurados. Você pode criar o cadastro, mas o acesso à rede ficará bloqueado até a equipe validar o CRECI e confirmar o pagamento.
            </div>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}

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
                <span>Criar cadastro pendente</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: CADASTRO RECEBIDO */}
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
                Seu cadastro do plano <strong>{currentPlanConfig.name}</strong> foi criado. A conta aguarda validação do CRECI e confirmação do pagamento.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 text-left flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Status pendente. O acesso à rede será liberado após as validações.</span>
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
                <span>Acessar a plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
