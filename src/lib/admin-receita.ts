// Faturamento da plataforma na Administração (pedido do Sidney, 15/10/2026: "o dia que vence a mensalidade, um gráfico
// de pago e a receber por período, faturado por mês, por ano"). Contas em centavos e no dia de Brasília.
import { addMonthsKeepingDay } from "./finance";
import { isPlanId, planCharge, type BillingCycle } from "./plans";

export type UsuarioCobranca = {
  id: string; role: string; plan: string; billingCycle: string; monthlyFee: string | number;
  nextBillingDate: Date | string | null; billingExemptAt: Date | string | null; subscriptionStatus: string; verificationStatus: string;
};
export type PagamentoDaPlataforma = { status: string; amount: string | number; confirmedAt: Date | string | null; createdAt: Date | string };
export type Faixa = { chave: string; pago: number; aReceber: number };

const centavos = (valor: string | number) => Math.round(Number(valor) * 100);

/** Dia de Brasília (AAAA-MM-DD) de um instante. */
export function diaDeBrasilia(valor: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(valor));
}

/** Quem tem mensalidade a receber: com vencimento, sem isenção, sem cancelamento nem suspensão, e não administrador. */
export function cobravel(u: UsuarioCobranca): boolean {
  return u.role !== "admin" && !u.billingExemptAt && !!u.nextBillingDate && u.subscriptionStatus !== "cancelado" && u.verificationStatus !== "suspenso";
}

/** Valor de cada cobrança: o preço do plano no ciclo (anual = o total do ano); plano antigo usa a mensalidade gravada. */
export function valorDaCobranca(u: UsuarioCobranca): number {
  const ciclo: BillingCycle = u.billingCycle === "annual" ? "annual" : "monthly";
  if (isPlanId(u.plan)) return centavos(planCharge(u.plan, ciclo));
  return centavos(u.monthlyFee) * (ciclo === "annual" ? 12 : 1);
}

/** Vencimentos de cada conta cobrável, do próximo (mesmo vencido) até o fim do período: mensal ou anual. */
export function vencimentosPrevistos(usuarios: readonly UsuarioCobranca[], ateDia: string): { userId: string; dia: string; cents: number }[] {
  const lista: { userId: string; dia: string; cents: number }[] = [];
  for (const u of usuarios) {
    if (!cobravel(u)) continue;
    const passo = u.billingCycle === "annual" ? 12 : 1;
    const valor = valorDaCobranca(u);
    if (valor <= 0) continue;
    const primeiro = diaDeBrasilia(u.nextBillingDate!);
    for (let i = 0; i < 240; i++) {
      const dia = addMonthsKeepingDay(primeiro, i * passo);
      if (dia > ateDia) break;
      lista.push({ userId: u.id, dia, cents: valor });
    }
  }
  return lista;
}

const proximoMes = (mes: string) => addMonthsKeepingDay(`${mes}-01`, 1).slice(0, 7);

/** Por mês, de `deMes` a `ateMes` (AAAA-MM): faturado (pago confirmado, pela data da confirmação) e a receber. */
export function faturamentoPorMes(usuarios: readonly UsuarioCobranca[], pagamentos: readonly PagamentoDaPlataforma[], deMes: string, ateMes: string): Faixa[] {
  const faixas: Faixa[] = [];
  for (let mes = deMes, i = 0; mes <= ateMes && i < 600; mes = proximoMes(mes), i++) faixas.push({ chave: mes, pago: 0, aReceber: 0 });
  const porChave = new Map(faixas.map((f) => [f.chave, f]));
  for (const p of pagamentos) {
    if (p.status !== "pago") continue;
    const faixa = porChave.get(diaDeBrasilia(p.confirmedAt ?? p.createdAt).slice(0, 7));
    if (faixa) faixa.pago += centavos(p.amount);
  }
  for (const v of vencimentosPrevistos(usuarios, `${ateMes}-31`)) {
    const faixa = porChave.get(v.dia.slice(0, 7));
    if (faixa) faixa.aReceber += v.cents;
  }
  return faixas;
}

/** Por ano: soma dos meses. */
export function faturamentoPorAno(usuarios: readonly UsuarioCobranca[], pagamentos: readonly PagamentoDaPlataforma[], deAno: number, ateAno: number): Faixa[] {
  const meses = faturamentoPorMes(usuarios, pagamentos, `${deAno}-01`, `${ateAno}-12`);
  const anos: Faixa[] = [];
  for (let ano = deAno; ano <= ateAno; ano++) {
    const doAno = meses.filter((m) => m.chave.startsWith(`${ano}-`));
    anos.push({ chave: String(ano), pago: doAno.reduce((t, m) => t + m.pago, 0), aReceber: doAno.reduce((t, m) => t + m.aReceber, 0) });
  }
  return anos;
}

/** "Vence em 05/11/2026 · todo dia 5" (ou "Venceu em …" / "anual"). Null quando não há cobrança. */
export function descricaoDoVencimento(u: UsuarioCobranca, hoje: string): { texto: string; vencido: boolean } | null {
  if (!cobravel(u)) return null;
  const dia = diaDeBrasilia(u.nextBillingDate!);
  const [ano, mes, d] = dia.split("-");
  const data = `${d}/${mes}/${ano}`;
  const vencido = dia < hoje;
  const ciclo = u.billingCycle === "annual" ? "anual" : `todo dia ${Number(d)}`;
  return { texto: `${vencido ? "Venceu em" : "Vence em"} ${data} · ${ciclo}`, vencido };
}
