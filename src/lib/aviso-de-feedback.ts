// Aviso no sino dos administradores quando chega feedback do piloto (28/10/2026, Sidney: o feedback "aparece para a gente?"
// — aparecia só na Administração, e ninguém era avisado). Um aviso por administrador, com quem mandou, o tipo, a tela e o
// começo da mensagem; o clique abre a Administração no Feedback do piloto.

const TIPOS: Record<string, string> = { duvida: "Dúvida", erro: "Erro", ideia: "Sugestão" };
const TELAS: Record<string, string> = {
  vitrine: "Vitrine", crm: "CRM", radar: "Radar de Compradores", cadastrar: "Meus imóveis", termo: "Termo de Parceria",
  dvp: "Registro de Visita", financeiro: "Financeiro", admin: "Administração",
};
export const TAMANHO_DO_TRECHO = 140;

export function avisoDeFeedback({ nome, screen, category, message }: { nome: string; screen: string; category: string; message: string }) {
  const texto = message.replace(/\s+/g, " ").trim();
  const trecho = texto.length > TAMANHO_DO_TRECHO ? `${texto.slice(0, TAMANHO_DO_TRECHO).trimEnd()}…` : texto;
  return {
    title: `Feedback novo: ${TIPOS[category] ?? "Feedback"}`,
    message: `${nome} · ${TELAS[screen] ?? screen}: “${trecho}”`,
  };
}
