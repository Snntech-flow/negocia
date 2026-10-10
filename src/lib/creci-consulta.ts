import type { BRAZILIAN_STATES } from "./brazil-states";

// Página pública de busca de corretores de cada CRECI regional. Não há consulta nacional nem API oficial:
// a conferência é humana, no site do conselho (o do ES diz que extração automatizada é proibida).
// Endereços conferidos em 10/10/2026: cada página abriu e se identificou como o CRECI do estado.
const conselhoNet = (uf: string) => `https://www.creci${uf}.conselho.net.br/form_pesquisa_cadastro_geral_site.php`;

export const CRECI_CONSULTA: Record<(typeof BRAZILIAN_STATES)[number], string> = {
  AC: conselhoNet("ac"), AL: conselhoNet("al"), AM: conselhoNet("am"), AP: conselhoNet("ap"), BA: conselhoNet("ba"),
  CE: conselhoNet("ce"), GO: conselhoNet("go"), MA: conselhoNet("ma"), MS: conselhoNet("ms"), MT: conselhoNet("mt"),
  PA: conselhoNet("pa"), PB: conselhoNet("pb"), PE: conselhoNet("pe"), PI: conselhoNet("pi"), RJ: conselhoNet("rj"),
  RN: conselhoNet("rn"), RO: conselhoNet("ro"), RR: conselhoNet("rr"), SC: conselhoNet("sc"), SE: conselhoNet("se"),
  TO: conselhoNet("to"),
  DF: "https://app.crecidf.gov.br/consultacorretor",
  ES: "https://area-restrita.crecies.gov.br/pesquisa-de-corretor-imobiliaria",
  MG: "https://crecimg.spiderware.com.br/spw/consultacadastral/TelaConsultaPublicaCompleta.aspx",
  PR: "https://crecipr.gov.br/pesquisa-credenciados",
  RS: "https://creci-rs.gov.br/siteNovo/pesquisaInscrito.php",
  SP: "https://www.crecisp.gov.br/cidadao/buscaporcorretores",
};

export function creciConsultaUrl(state: string): string | null {
  return (CRECI_CONSULTA as Record<string, string>)[state.toUpperCase()] ?? null;
}

// As buscas pedem só os números da inscrição (sem "CRECI", F/J ou pontos).
export function creciDigits(creci: string): string {
  return creci.replace(/\D/g, "");
}
