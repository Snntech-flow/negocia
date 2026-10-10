"use client";

import { type FormEvent, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { answerDialog, currentDialog, subscribeDialogs, textDialogError, type DialogRequest } from "@/lib/dialogs";

// Mostra os pedidos de askConfirm/askText, um de cada vez, na frente da tela (ver src/lib/dialogs.ts).
export default function DialogHost() {
  const request = useSyncExternalStore(subscribeDialogs, currentDialog, () => null);
  if (!request) return null;
  return <DialogWindow key={request.id} request={request} />;
}

function DialogWindow({ request }: { request: DialogRequest }) {
  const [text, setText] = useState(request.kind === "text" ? request.defaultValue ?? "" : "");
  const [tried, setTried] = useState(false);
  const focusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();
  const danger = !!request.danger;
  const error = request.kind === "text" ? textDialogError(text, request) : null;
  const cancel = () => answerDialog(request.id, request.kind === "confirm" ? false : null);

  // Foco no campo; na confirmação perigosa, em Cancelar (Enter sem querer não apaga nada). Esc cancela.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      answerDialog(request.id, request.kind === "confirm" ? false : null);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [request]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (request.kind === "confirm") { answerDialog(request.id, true); return; }
    if (error) { setTried(true); return; }
    answerDialog(request.id, text);
  }

  const field = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white";
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={request.message ? messageId : undefined} onSubmit={submit}
      className={`w-full max-w-md space-y-4 rounded-2xl border-2 bg-slate-900 p-6 shadow-2xl ${danger ? "border-red-500/60" : "border-amber-500/60"}`}>
      <div className="flex items-start gap-3">
        <span className={`rounded-xl p-2 ${danger ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{danger ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <HelpCircle className="h-5 w-5" aria-hidden="true" />}</span>
        <div>
          <h2 id={titleId} className="text-lg font-bold text-white">{request.title}</h2>
          {request.message && <p id={messageId} className="mt-1 text-sm leading-relaxed text-slate-300">{request.message}</p>}
        </div>
      </div>
      {request.kind === "text" && <label className="block text-xs font-semibold text-slate-300">
        {request.label}
        {request.multiline
          ? <textarea ref={(element) => { focusRef.current = element; }} rows={3} value={text} onChange={(event) => setText(event.target.value)} aria-invalid={tried && !!error} className={`${field} resize-y`} />
          : <input ref={(element) => { focusRef.current = element; }} value={text} onChange={(event) => setText(event.target.value)} aria-invalid={tried && !!error} className={field} />}
        {tried && error && <span role="alert" className="mt-1 block text-[11px] font-semibold text-red-400">{error}</span>}
        {request.maxLength && <span className="mt-1 block text-right text-[10px] font-normal text-slate-500">{text.trim().length}/{request.maxLength}</span>}
      </label>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" ref={(element) => { if (request.kind === "confirm" && !danger) focusRef.current = element; }}
          className={danger ? "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700" : "rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"}>{request.confirmLabel || "Confirmar"}</button>
        <button type="button" onClick={cancel} ref={(element) => { if (request.kind === "confirm" && danger) focusRef.current = element; }}
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Cancelar</button>
      </div>
    </form>
  </div>;
}
