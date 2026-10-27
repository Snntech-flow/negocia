"use client";

// Wrapper client da rota /admin: segura as listas em estado local (semeadas pelo servidor), dá os
// callbacks que o AdminPanel usa pra atualizar otimista (on*Change) e um toast simples (onMessage) —
// o mesmo contrato que o NegociaLarApp dá hoje. Header, abas e modais vêm do (app)/layout (AppShell).
import { useState } from "react";
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
    <>
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
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}
