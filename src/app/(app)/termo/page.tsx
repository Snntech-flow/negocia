// Rota /termo: Termo de Parceria. O componente é autossuficiente (carrega as parcerias por conta própria);
// a chrome vem do (app)/layout e a guia da tela do ScreenGuidance.
import PartnershipTerms from "@/components/PartnershipTerms";
import ScreenGuidance from "@/components/app-shell/ScreenGuidance";

export const dynamic = "force-dynamic";

export default function TermoPage() {
  return (
    <>
      <ScreenGuidance screen="termo" />
      <PartnershipTerms />
    </>
  );
}
