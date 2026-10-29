// Rota /atendimento: o menu "Atendimento" saiu em 28/10/2026 (era a mesma tela do CRM aberta na aba Funil). Link antigo,
// favorito ou aba guardada caem no CRM já no Funil.
import { redirect } from "next/navigation";

export default function AtendimentoPage() {
  redirect("/crm?visao=funil");
}
