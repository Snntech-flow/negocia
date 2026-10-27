"use client";

// Toast simples para as rotas sob o AppShell (o mesmo visual do monólito/AdminRouteClient), para os
// componentes de tela que usam onMessage. Evita repetir o markup em cada rota.
import { useCallback, useRef, useState } from "react";

export function useRouteToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const showToast = useCallback((text: string) => {
    setToast(text);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);
  const toastNode = toast ? (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white shadow-2xl">{toast}</div>
  ) : null;
  return { showToast, toastNode };
}
