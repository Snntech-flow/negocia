// `/`: logado vai para o AppShell (/vitrine); deslogado vê a landing pública. `?site=1` mostra a landing mesmo logado
// (link "Ver o site" do shell). O monólito NegociaLarApp foi aposentado — a Fase 1 virou rotas sob (app)/.
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import LandingRouteClient from "@/components/app-shell/LandingRouteClient";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  if (!site && (await getCurrentUserId())) redirect("/vitrine");
  return <LandingRouteClient />;
}
