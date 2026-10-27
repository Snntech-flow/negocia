"use client";

import React, { useEffect, useState } from "react";
import BotaoFechar from "./BotaoFechar";
import { useVoltarFecha } from "@/lib/use-voltar-fecha";
import Image from "next/image";
import { ShieldCheck, CheckCircle2, ArrowRight, Check, Building2, Clock, AlertCircle } from "lucide-react";

import { validateCreciFormat, registerUserWithPix, loginUser } from "@/lib/actions";
import { unwrap, type ActionData } from "@/lib/action-result";
import { BRAZILIAN_STATES } from "@/lib/brazil-states";
import { loadStateCities } from "@/lib/cities";
import { isPlanId, PLAN_IDS, PLANS, planCharge, planMonthlyEquivalent, type BillingCycle, type PlanId } from "@/lib/plans";

import { RequestPasswordRecovery } from "./PasswordRecovery";
import { PasswordInput } from "./PasswordInput";

type AuthUser = ActionData<Awaited<ReturnType<typeof loginUser>>>["user"];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userData: AuthUser) => void;
  initialPlan?: string;
  initialMode?: "register" | "login";
}

const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white";
const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

export default function OnboardingModal({ isOpen, onClose, onComplete, initialPlan = "20", initialMode = "register" }: OnboardingModalProps) {
  const fechar = useVoltarFecha(onClose, isOpen); // X visível, Esc e voltar fecham (15/10/2026)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<"register" | "login" | "recovery">(initialMode);
  const [checkingFormat, setCheckingFormat] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creciResult, setCreciResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);
  const [registering, setRegistering] = useState(false);
  const [busyLogin, setBusyLogin] = useState(false);
  const [stateCities, setStateCities] = useState<string[]>([]);

  const [formData, setFormData] = useState<{ name: string; email: string; password: string; whatsapp: string; creci: string; state: string; city: string; plan: PlanId; billingCycle: BillingCycle }>({
    name: "", email: "", password: "", whatsapp: "", creci: "", state: "SP", city: "",
    plan: isPlanId(initialPlan) ? initialPlan : "20",
    billingCycle: "monthly",
  });
  const [referralCode, setReferralCode] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("ref") || "");

  useEffect(() => {
    let cancelled = false;
    void loadStateCities(formData.state).then((cities) => { if (!cancelled) setStateCities(cities); });
    return () => { cancelled = true; };
  }, [formData.state]);

  if (!isOpen) return null;

  const selectedPlan = PLANS[formData.plan];
  const paymentAmount = money(planCharge(formData.plan, formData.billingCycle));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setBusyLogin(true);
    try {
      const result = unwrap(await loginUser(formData.email, formData.password));
      onComplete(result.user);
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusyLogin(false);
    }
  };

  const handleVerifyCreciAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingFormat(true);
    setCreciResult(null);
    setActionError(null);
    try {
      const res = unwrap(await validateCreciFormat(formData.creci, formData.state));
      setCreciResult(res);
      if (res.isValid) setStep(2);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível conferir o formato.");
    } finally {
      setCheckingFormat(false);
    }
  };

  const handleFinishRegistration = async () => {
    if (registering) return;
    setRegistering(true);
    setActionError(null);
    try {
      const res = unwrap(await registerUserWithPix({ referralCode, ...formData }));
      setRegisteredUser(res.user);
      setStep(4);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível criar seu cadastro.");
    } finally { setRegistering(false); }
  };

  const stepClass = (target: number) => step === target ? "text-amber-600 font-bold" : step > target ? "text-emerald-600" : "text-slate-400";
  const bulletClass = (target: number) => step === target ? "bg-amber-700 text-white" : step > target ? "bg-emerald-700 text-white" : "bg-slate-200";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-amber-500/40">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="32px" className="object-contain" />
            </div>
            <div>
              <div className="text-sm font-extrabold flex items-center gap-1.5">
                <span className="rounded-md bg-white px-2 py-0.5 text-slate-900">Negocia<span className="text-amber-600">lar</span></span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 rounded">SNNtech</span>
              </div>
              <div id="onboarding-title" className="text-[11px] text-slate-400">{mode === "login" ? "Entrar na sua conta" : mode === "recovery" ? "Recuperar senha" : "Cadastro do corretor"}</div>
            </div>
          </div>
          <BotaoFechar onClick={fechar} />
        </div>

        {step < 4 && mode === "register" && (
          <ol className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-semibold" aria-label="Etapas do cadastro">
            {["Seus dados", "Plano", "Confirmação"].map((label, index) => (
              <li key={label} className={`flex items-center gap-1.5 ${stepClass(index + 1)}`} aria-current={step === index + 1 ? "step" : undefined}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${bulletClass(index + 1)}`}>{step > index + 1 ? <Check className="w-3 h-3" /> : index + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        )}

        {step === 1 && mode === "recovery" && <div className="p-6"><RequestPasswordRecovery onBack={() => { setMode("login"); setActionError(null); }} /></div>}

        {step === 1 && mode === "login" && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Entrar no Negocia <span className="text-amber-600">Lar</span></h3>
              <p className="text-xs text-slate-500">Use o e-mail e a senha do seu cadastro.</p>
            </div>
            <label className="block text-xs font-bold text-slate-700">E-mail
              <input required type="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">Senha</label>
              <PasswordInput id="login-password" required autoComplete="current-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} wrapperClassName="mt-1" />
            </div>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
            <button disabled={busyLogin} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-60">{busyLogin ? "Entrando…" : "Entrar"}</button>
            <button type="button" onClick={() => { setMode("recovery"); setActionError(null); }} className="w-full text-xs text-amber-700 font-semibold">Esqueci minha senha</button>
            <button type="button" onClick={() => { setMode("register"); setActionError(null); }} className="w-full text-xs text-amber-700 font-semibold">Criar uma conta</button>
          </form>
        )}

        {step === 1 && mode === "register" && (
          <form onSubmit={handleVerifyCreciAndProceed} className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Seus dados profissionais</h3>
              <p className="text-xs text-slate-500">Conferimos o formato do CRECI agora; a situação no conselho é conferida pela equipe e o cadastro fica pendente até lá.</p>
            </div>

            <div>
              <label htmlFor="onboarding-name" className="block text-xs font-bold text-slate-700 mb-1">Nome completo</label>
              <input id="onboarding-name" required autoComplete="name" type="text" maxLength={120} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome completo" className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="onboarding-whatsapp" className="block text-xs font-bold text-slate-700 mb-1">WhatsApp (com DDD)</label>
                <input id="onboarding-whatsapp" required autoComplete="tel" inputMode="tel" type="text" maxLength={30} value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="(DDD) número" className={inputClass} />
              </div>
              <div>
                <label htmlFor="onboarding-creci" className="block text-xs font-bold text-slate-700 mb-1">CRECI e UF</label>
                <div className="flex gap-2">
                  <input id="onboarding-creci" required type="text" maxLength={10} value={formData.creci} onChange={(e) => setFormData({ ...formData, creci: e.target.value })} placeholder="Número do CRECI" aria-describedby="onboarding-creci-help" className={inputClass} />
                  <select aria-label="UF do CRECI" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value, city: "" })} className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800">
                    {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <p id="onboarding-creci-help" className="mt-1 text-[11px] text-slate-500">Número com F (pessoa física) ou J (jurídica), se houver.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="onboarding-email" className="block text-xs font-bold text-slate-700 mb-1">E-mail profissional</label>
                <input id="onboarding-email" required autoComplete="email" type="email" maxLength={254} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="seu.email@exemplo.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="onboarding-city" className="block text-xs font-bold text-slate-700 mb-1">Cidade principal de atuação</label>
                <input id="onboarding-city" required list="onboarding-city-options" autoComplete="off" type="text" maxLength={120} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder={stateCities.length ? `Digite para ver as cidades de ${formData.state}` : "Sua cidade"} className={inputClass} />
                <datalist id="onboarding-city-options">{stateCities.map((city) => <option key={city} value={city} />)}</datalist>
              </div>
            </div>

            <div>
              <label htmlFor="onboarding-password" className="block text-xs font-bold text-slate-700 mb-1">Senha (mínimo 12 caracteres)</label>
              <PasswordInput id="onboarding-password" required minLength={12} maxLength={200} autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} />
            </div>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}

            {creciResult && !creciResult.isValid && (
              <div role="alert" className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div><div className="font-bold">Confira o número do CRECI</div><div className="text-[11px] text-red-700">{creciResult.message}</div></div>
              </div>
            )}

            <button type="submit" disabled={checkingFormat} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-70 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{checkingFormat ? "Conferindo o formato…" : "Continuar para escolher o plano"}</span>
              {!checkingFormat && <ArrowRight className="w-4 h-4 text-amber-400" />}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-amber-700 font-semibold">Já tem conta? Entrar</button>
          </form>
        )}

        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Escolha a capacidade de anúncios</h3>
              <p className="text-xs text-slate-500">Os 30 primeiros dias são grátis em qualquer plano. O plano define quantos anúncios você mantém ativos ao mesmo tempo.</p>
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold" role="radiogroup" aria-label="Ciclo de cobrança">
              {(["monthly", "annual"] as const).map((cycle) => (
                <button key={cycle} type="button" role="radio" aria-checked={formData.billingCycle === cycle} onClick={() => setFormData({ ...formData, billingCycle: cycle })}
                  className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${formData.billingCycle === cycle ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                  <span>{cycle === "monthly" ? "Mensal" : "Anual"}</span>
                  {cycle === "annual" && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded">use 12, pague 11</span>}
                </button>
              ))}
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Plano">
              {PLAN_IDS.map((id) => {
                const plan = PLANS[id];
                const isSelected = formData.plan === id;
                return (
                  <button key={id} type="button" role="radio" aria-checked={isSelected} onClick={() => setFormData({ ...formData, plan: id })}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${isSelected ? "border-amber-600 bg-amber-50/40 ring-1 ring-amber-600" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                    <span className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-amber-600 bg-amber-600" : "border-slate-300"}`}>{isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>
                      <span>
                        <span className="block text-xs font-bold text-slate-900">{plan.name}</span>
                        <span className="block text-[11px] text-slate-500">{plan.photos} fotos por anúncio · {formData.billingCycle === "annual" ? `${money(plan.annualTotal)} por ano` : plan.description}</span>
                      </span>
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">{money(planMonthlyEquivalent(id, formData.billingCycle))}<span className="text-[10px] text-slate-500 font-normal">/mês</span></span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">Todos os planos incluem vitrine de parcerias, Radar de compradores, CRM e registro de visitas. As fotos por anúncio acompanham o plano.</p>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold">Pagamento via Pix</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">Você começa com 30 dias grátis. Depois, solicite a renovação em Minha assinatura e pague via Pix. Não há débito automático.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition">Voltar</button>
              <button type="button" onClick={() => setStep(3)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm">
                <span>Continuar com {selectedPlan.name}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-5 text-center">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Comece seus 30 dias grátis</h3>
              <p className="text-xs text-slate-500">Plano {selectedPlan.name} · depois do período grátis, {formData.billingCycle === "annual" ? `${paymentAmount} por ano` : `${paymentAmount} por mês`}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-900">
              <p className="font-bold">30 dias grátis, sem pagamento no cadastro</p>
              <p className="mt-2 text-xs leading-relaxed">O período começa ao concluir seu cadastro. O uso da rede depende da aprovação do CRECI pela equipe. Ao terminar os 30 dias, renove via Pix em Minha assinatura.</p>
            </div>
            <label className="block text-left text-xs font-semibold text-slate-600">Código de quem indicou (opcional)
              <input value={referralCode} onChange={(event) => setReferralCode(event.target.value)} maxLength={36} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Cole o código recebido do corretor" />
              <span className="mt-1 block text-[11px] font-normal">Quem indicou ganha 30 dias após a confirmação do seu primeiro pagamento.</span>
            </label>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
            <div className="pt-2 flex items-center gap-3">
              <button type="button" onClick={() => setStep(2)} className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition">Voltar</button>
              <button type="button" onClick={handleFinishRegistration} disabled={registering} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm disabled:opacity-70">
                <CheckCircle2 className="w-4 h-4" />
                <span>{registering ? "Criando cadastro…" : "Criar cadastro e começar grátis"}</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-10 h-10" /></div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">Bem-vindo ao Negocia <span className="text-amber-600">Lar</span>!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Seu cadastro no plano <strong>{selectedPlan.name}</strong> foi criado e os 30 dias grátis já começaram. A equipe confere o CRECI para liberar o uso da rede.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 text-left flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>CRECI em análise. Os dias restantes ficam em Minha assinatura.</span>
            </div>
            <button type="button" onClick={() => { if (!registeredUser) return; onComplete(registeredUser); onClose(); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-sm">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Acessar a plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
