"use client";

// Rota /cadastrar: só o cadastro de imóvel (PropertyCreateForm), já no topo da tela. A carteira fica em /meus-imoveis
// (14/11/2026). Ao cadastrar, vai para Meus imóveis, onde o anúncio novo aparece.
import { useRouter } from "next/navigation";
import PropertyCreateForm from "@/components/PropertyCreateForm";
import { useRouteToast } from "./useRouteToast";

export default function CadastrarRouteClient({ broker, blockedReason, photoLimit }: {
  broker: { name: string; city: string; state: string };
  blockedReason: string | null;
  photoLimit: number;
}) {
  const router = useRouter();
  const { showToast, toastNode } = useRouteToast();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PropertyCreateForm broker={broker} blockedReason={blockedReason} photoLimit={photoLimit} onMessage={showToast}
        onCreated={() => router.push("/meus-imoveis?publicado=1")} />
      {toastNode}
    </div>
  );
}
