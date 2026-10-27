"use client";

// A landing pública no `/`: ao entrar/cadastrar com sucesso, a sessão já está no cookie; navega para o shell.
import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";

export default function LandingRouteClient() {
  const router = useRouter();
  return <LandingPage onAccessPlatform={() => { router.push("/vitrine"); router.refresh(); }} />;
}
