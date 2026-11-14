"use client";

// Rota /meus-imoveis: a carteira (PropertyInventory) com o botão que leva ao cadastro.
// ?imovel=<id> abre a edição daquele imóvel (veio do "Editar" da vitrine); ?publicado=1 avisa do cadastro recém-feito.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle } from "lucide-react";
import PropertyInventory from "@/components/PropertyInventory";
import { useI18n } from "../I18nProvider";
import { useRouteToast } from "./useRouteToast";

export default function MeusImoveisRouteClient() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const abrirImovelId = searchParams.get("imovel");
  const publicado = searchParams.get("publicado") === "1";
  const [reloadKey, setReloadKey] = useState(0);
  const { showToast, toastNode } = useRouteToast();

  useEffect(() => {
    if (!publicado) return;
    showToast("Imóvel publicado na vitrine da rede.");
    router.replace("/meus-imoveis");
  }, [publicado, showToast, router]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-end">
        <Link href="/cadastrar" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950"><PlusCircle className="h-4 w-4" />{t("Cadastrar imóvel")}</Link>
      </div>
      <PropertyInventory reloadKey={reloadKey} onChanged={() => setReloadKey((v) => v + 1)}
        abrirImovelId={abrirImovelId} aoAbrir={() => { if (abrirImovelId) router.replace("/meus-imoveis"); }} />
      {toastNode}
    </div>
  );
}
