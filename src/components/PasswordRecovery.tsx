"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordResetForm, resetPasswordForm } from "@/lib/actions/password-recovery";

export function RequestPasswordRecovery({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { const result = await requestPasswordResetForm(email); if (result.success) setMessage(result.message); else setError(result.error); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <h3 className="text-lg font-extrabold text-slate-900">Recuperar senha</h3>
    <p className="text-sm text-slate-600">Informe o e-mail do seu cadastro. O link para criar uma nova senha vale por 30 minutos.</p>
    <label className="block text-sm font-semibold text-slate-700">E-mail
      <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900" />
    </label>
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-slate-900 p-3 font-bold text-white disabled:opacity-60">{busy ? "Solicitando…" : "Enviar link de recuperação"}</button>
    <button type="button" onClick={onBack} className="w-full text-sm font-semibold text-amber-700">Voltar para entrar</button>
  </form>;
}

export default function PasswordRecovery() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
    const secret = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    setToken(/^[a-f0-9]{64}$/.test(secret) ? secret : null);
    setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !token) return;
    if (password !== confirmation) { setError("As senhas precisam ser iguais."); return; }
    setBusy(true); setError("");
    try { const result = await resetPasswordForm(token, password); if (!result.success) { setError(result.error); return; } setSuccess(true); setToken(null); setPassword(""); setConfirmation(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível alterar sua senha."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <Link href="/" className="text-xl font-extrabold text-slate-900">Negocia<span className="text-amber-600">Lar</span></Link>
      {!ready ? <p role="status">Carregando…</p> : success ? <>
        <h1 className="text-xl font-bold text-slate-900">Senha atualizada</h1>
        <p role="status" className="text-sm text-slate-600">Entre com sua nova senha. Os acessos anteriores foram encerrados.</p>
        <Link href="/" className="block rounded-xl bg-slate-900 p-3 text-center font-bold text-white">Voltar para entrar</Link>
      </> : token ? <form onSubmit={submit} className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Crie sua nova senha</h1>
        <p className="text-sm text-slate-600">Use entre 12 e 200 caracteres.</p>
        <label className="block text-sm font-semibold text-slate-700">Nova senha
          <input required type="password" autoComplete="new-password" minLength={12} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Confirme a nova senha
          <input required type="password" autoComplete="new-password" minLength={12} maxLength={200} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-slate-900 p-3 font-bold text-white disabled:opacity-60">{busy ? "Salvando…" : "Salvar nova senha"}</button>
        <button type="button" disabled={busy} onClick={() => { setToken(null); setError(""); setPassword(""); setConfirmation(""); }} className="w-full text-sm font-semibold text-amber-700">Solicitar outro link</button>
      </form> : <RequestPasswordRecovery onBack={() => { router.push("/"); }} />}
    </div>
  </main>;
}
