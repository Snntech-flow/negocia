// Repasses dos sócios (pedido do Sidney, 15/10/2026): % de cada sócio e da empresa sobre o faturamento das assinaturas.
// Cada versão vale a partir de um mês; os meses anteriores ficam com o % da época. Contas em centavos.
import type { Faixa } from "./admin-receita";

export type TipoDaParte = "socio" | "empresa";
export type ParteDoRepasse = { position: number; name: string; kind: TipoDaParte; percent: string | number };
export type VersaoDoRepasse = { validFromMonth: string; shares: readonly ParteDoRepasse[] };
export type ValorDaParte = { name: string; kind: TipoDaParte; pago: number; aReceber: number };
export type RepasseDaFaixa = { chave: string; semRegra: boolean; total: { pago: number; aReceber: number }; partes: ValorDaParte[] };

const centesimos = (percent: string | number) => Math.round(Number(percent) * 100); // 30.25% → 3025

/** Confere as partes antes de gravar (o banco confere de novo): 1 a 10 linhas, nome, tipo, % com até 2 casas, soma 100. */
export function problemaNasPartes(partes: readonly { name: string; kind: string; percent: string | number }[]): string | null {
  if (partes.length < 1 || partes.length > 10) return "Informe de 1 a 10 participantes.";
  for (const [i, parte] of partes.entries()) {
    if (!parte.name.trim() || parte.name.trim().length > 80) return `Dê um nome à linha ${i + 1} (até 80 letras).`;
    if (parte.kind !== "socio" && parte.kind !== "empresa") return `Escolha sócio ou empresa na linha ${i + 1}.`;
    const valor = Number(String(parte.percent).replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0 || valor > 100 || Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-9) return `O % da linha ${i + 1} vai de 0,01 a 100, com até 2 casas.`;
  }
  const nomes = partes.map((parte) => parte.name.trim().toLocaleLowerCase("pt-BR"));
  if (new Set(nomes).size !== nomes.length) return "Cada participante aparece uma vez só.";
  const soma = partes.reduce((total, parte) => total + centesimos(String(parte.percent).replace(",", ".")), 0);
  if (soma !== 10000) return `Os % precisam somar 100% (estão somando ${(soma / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%).`;
  return null;
}

/** A versão que vale no mês (AAAA-MM): a mais recente que começou até ele. */
export function versaoDoMes(versoes: readonly VersaoDoRepasse[], mes: string): VersaoDoRepasse | null {
  let vigente: VersaoDoRepasse | null = null;
  for (const versao of versoes) if (versao.validFromMonth.slice(0, 7) <= mes && (!vigente || versao.validFromMonth > vigente.validFromMonth)) vigente = versao;
  return vigente;
}

/** Divide os centavos pelos %: cada um leva o inteiro; os centavos que sobram vão para as maiores frações (soma exata). */
export function dividir(cents: number, partes: readonly ParteDoRepasse[]): number[] {
  const ordenadas = [...partes].sort((a, b) => a.position - b.position);
  const brutos = ordenadas.map((parte) => (cents * centesimos(parte.percent)) / 10000);
  const inteiros = brutos.map(Math.floor);
  let sobra = cents - inteiros.reduce((t, v) => t + v, 0);
  const porFracao = brutos.map((valor, i) => ({ i, fracao: valor - Math.floor(valor) })).sort((a, b) => b.fracao - a.fracao || a.i - b.i);
  for (const { i } of porFracao) { if (sobra <= 0) break; inteiros[i] += 1; sobra -= 1; }
  return inteiros;
}

/** Participantes do período, na ordem em que aparecem (por versão e posição). */
function participantes(versoes: readonly (VersaoDoRepasse | null)[]): { name: string; kind: TipoDaParte }[] {
  const lista: { name: string; kind: TipoDaParte }[] = [];
  for (const versao of versoes) for (const parte of [...(versao?.shares ?? [])].sort((a, b) => a.position - b.position)) {
    if (!lista.some((item) => item.name === parte.name)) lista.push({ name: parte.name, kind: parte.kind });
  }
  return lista;
}

/** Repasse de cada participante por mês: o faturado e o a receber do mês divididos pela versão daquele mês. */
export function repassesPorMes(faixasMensais: readonly Faixa[], versoes: readonly VersaoDoRepasse[]): RepasseDaFaixa[] {
  const vigentes = faixasMensais.map((faixa) => versaoDoMes(versoes, faixa.chave));
  const todos = participantes(vigentes);
  return faixasMensais.map((faixa, i) => {
    const versao = vigentes[i];
    const partes: ValorDaParte[] = todos.map((p) => ({ ...p, pago: 0, aReceber: 0 }));
    if (versao) {
      const ordenadas = [...versao.shares].sort((a, b) => a.position - b.position);
      const pagos = dividir(faixa.pago, ordenadas), aReceber = dividir(faixa.aReceber, ordenadas);
      ordenadas.forEach((parte, j) => { const alvo = partes.find((p) => p.name === parte.name)!; alvo.pago += pagos[j]; alvo.aReceber += aReceber[j]; });
    }
    return { chave: faixa.chave, semRegra: !versao, total: { pago: faixa.pago, aReceber: faixa.aReceber }, partes };
  });
}

/** Por ano: soma dos meses (o % pode mudar dentro do ano — cada mês usa o seu). */
export function repassesPorAno(faixasMensais: readonly Faixa[], versoes: readonly VersaoDoRepasse[]): RepasseDaFaixa[] {
  const meses = repassesPorMes(faixasMensais, versoes);
  const anos = [...new Set(meses.map((m) => m.chave.slice(0, 4)))];
  return anos.map((ano) => {
    const doAno = meses.filter((m) => m.chave.startsWith(ano));
    const partes = (doAno[0]?.partes ?? []).map((p) => ({ ...p, pago: 0, aReceber: 0 }));
    for (const mes of doAno) mes.partes.forEach((p, j) => { partes[j].pago += p.pago; partes[j].aReceber += p.aReceber; });
    const total = { pago: doAno.reduce((t, m) => t + m.total.pago, 0), aReceber: doAno.reduce((t, m) => t + m.total.aReceber, 0) };
    return { chave: ano, semRegra: doAno.every((m) => m.semRegra), total, partes };
  });
}
