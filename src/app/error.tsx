"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-xl font-bold">Não foi possível carregar a plataforma</h1>
        <p className="mt-3 text-sm text-slate-300">Tente novamente em alguns instantes. Se o problema continuar, avise o suporte.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
