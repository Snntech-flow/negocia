"use client";

// Rota /cadastrar (Meus imóveis): a carteira (PropertyInventory) + o cadastro de imóvel (PropertyCreateForm).
// ?imovel=<id> abre a edição daquele imóvel (veio do "Editar" da vitrine). Ao cadastrar, vai pra vitrine.
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle } from "lucide-react";
import PropertyInventory from "@/components/PropertyInventory";
import PropertyCreateForm from "@/components/PropertyCreateForm";
import { useRouteToast } from "./useRouteToast";

export default function CadastrarRouteClient({ broker, blockedReason, photoLimit }: {
  broker: { name: string; city: string; state: string };
  blockedReason: string | null;
  photoLimit: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abrirImovelId = searchParams.get("imovel");
  const [reloadKey, setReloadKey] = useState(0);
  const { showToast, toastNode } = useRouteToast();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PropertyInventory reloadKey={reloadKey} onChanged={() => setReloadKey((v) => v + 1)}
        abrirImovelId={abrirImovelId} aoAbrir={() => { if (abrirImovelId) router.replace("/cadastrar"); }} />
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><PlusCircle className="w-5 h-5 text-amber-500" />Cadastrar imóvel</h2>
        <p className="text-sm text-slate-400">Endereço completo e dados do proprietário ficam visíveis só para você. Campos com * são obrigatórios.</p>
      </div>
      <PropertyCreateForm key={reloadKey} broker={broker} blockedReason={blockedReason} photoLimit={photoLimit} onMessage={showToast}
        onCreated={(property) => {
          showToast(property.acceptsPartnership ? "Imóvel publicado na vitrine da rede." : "Imóvel salvo na sua carteira.");
          router.push("/vitrine");
        }} />
      {toastNode}
    </div>
  );
}
