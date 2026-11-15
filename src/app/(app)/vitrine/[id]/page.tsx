// Rota /vitrine/<id>: a página do imóvel (14/11/2026). O servidor busca o imóvel com o MESMO recorte de acesso da Vitrine
// (getVitrineProperty); fora dele — ou sem sessão — responde 404/entrada, sem dizer se o imóvel existe.
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getVitrineProperty } from "@/lib/queries/marketplace";
import { blockedReasonFor } from "@/lib/workspace-access";
import ImovelDaVitrine from "@/components/ImovelDaVitrine";

export const dynamic = "force-dynamic";

export default async function ImovelDaVitrinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCurrentUserId())) redirect("/");
  const achado = await getVitrineProperty(id);
  if (!achado) notFound();
  const user = achado.currentUser;
  const broker = { name: user.name ?? "", creci: user.creci ?? "", whatsapp: user.whatsapp ?? "", avatar: user.avatarUrl ?? "" };
  return <ImovelDaVitrine property={achado.property} broker={broker} currentUserId={user.id} blockedReason={blockedReasonFor(user)} />;
}
