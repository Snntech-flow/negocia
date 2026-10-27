"use client";

// Wrapper client da rota /admin: segura as listas em estado local (semeadas pelo servidor), dá os
// callbacks que o AdminPanel usa pra atualizar otimista (on*Change) e um toast simples (onMessage) —
// o mesmo contrato que o NegociaLarApp dá hoje. Header mínimo (só pra ser navegável nesta prova); o
// header/abas completos virão com o AppShell compartilhado.
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";
import type { WorkspaceUser, WorkspaceTransaction, WorkspaceFeedback } from "@/lib/workspace-types";

export default function AdminRouteClient({
  users: usuariosIniciais,
  transactions: transacoesIniciais,
  feedback: feedbackInicial,
  currentUserId,
  somenteLeitura,
}: {
  users: WorkspaceUser[];
  transactions: WorkspaceTransaction[];
  feedback: WorkspaceFeedback[];
  currentUserId: string;
  somenteLeitura: boolean;
}) {
  const [users, setUsers] = useState(usuariosIniciais);
  const [transactions, setTransactions] = useState(transacoesIniciais);
  const [feedback, setFeedback] = useState(feedbackInicial);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 6000);
  };

  return (
    <div className="negocialar-interior min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-amber-500/30">
              <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="36px" className="object-contain" />
            </div>
            <span className="text-sm font-bold text-white">Corretores e pagamentos</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-white hover:border-amber-500/40">
            <ArrowLeft className="h-4 w-4" /> Voltar ao app
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminPanel
          users={users}
          transactions={transactions}
          feedback={feedback}
          currentUserId={currentUserId}
          somenteLeitura={somenteLeitura}
          onUsersChange={setUsers}
          onTransactionsChange={setTransactions}
          onFeedbackChange={setFeedback}
          onMessage={showToast}
        />
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
