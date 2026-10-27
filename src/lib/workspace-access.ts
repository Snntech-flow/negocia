import { hasSubscriptionAccess } from "./subscription";
import type { WorkspaceSessionUser } from "./workspace-types";

// Aviso de bloqueio da área logada: CRECI em análise ou acesso vencido tiram o cadastro de imóveis/clientes/visitas.
// A garantia é do servidor; aqui só avisamos antes. Usado pelo AppShell (banner) e pelas rotas (gating da tela).
export function blockedReasonFor(user: Pick<WorkspaceSessionUser, "role" | "verificationStatus" | "subscriptionStatus" | "nextBillingDate">): string | null {
  if (user.role === "admin") return null;
  if (user.verificationStatus !== "aprovado")
    return "Seu CRECI está em análise pela equipe. Enquanto isso você pode conhecer a plataforma; cadastrar imóveis, clientes, procuras e visitas fica liberado assim que ele for aprovado.";
  const accessExpiresAt = user.nextBillingDate ? new Date(user.nextBillingDate) : null;
  if (!hasSubscriptionAccess(user.subscriptionStatus, accessExpiresAt))
    return `Seu acesso ${accessExpiresAt ? `venceu em ${accessExpiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "não está ativo"}. Renove via Pix em Minha assinatura para voltar a cadastrar e usar a rede.`;
  return null;
}
