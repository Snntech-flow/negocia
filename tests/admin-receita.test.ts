import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cobravel, descricaoDoVencimento, motivoSemVencimento, diaDeBrasilia, faturamentoPorAno, faturamentoPorMes, valorDaCobranca, vencimentosPrevistos, type UsuarioCobranca } from "../src/lib/admin-receita";
import { MonthlyChart } from "../src/components/FinanceCharts";

const base: UsuarioCobranca = { id: "u1", role: "corretor", plan: "10", billingCycle: "monthly", monthlyFee: "59.90",
  nextBillingDate: "2026-10-05T15:00:00Z", billingExemptAt: null, subscriptionStatus: "ativo", verificationStatus: "aprovado" };

test("o vencimento é o dia de Brasília (gravado com hora)", () => {
  assert.equal(diaDeBrasilia("2026-11-05T02:00:00Z"), "2026-11-04");
  assert.equal(diaDeBrasilia("2026-11-05T15:00:00Z"), "2026-11-05");
});

test("🔴 a receber só de quem é cobrável: fora isentos, cancelados, suspensos, administrador e quem não tem vencimento", () => {
  assert.equal(cobravel(base), true);
  assert.equal(cobravel({ ...base, billingExemptAt: "2026-10-01T00:00:00Z" }), false);
  assert.equal(cobravel({ ...base, subscriptionStatus: "cancelado" }), false);
  assert.equal(cobravel({ ...base, verificationStatus: "suspenso" }), false);
  assert.equal(cobravel({ ...base, role: "admin" }), false);
  assert.equal(cobravel({ ...base, nextBillingDate: null }), false);
});

test("valor de cada cobrança: plano mensal, anual (o total do ano) e plano antigo pela mensalidade gravada", () => {
  // Plano antigo ("10" saiu da tabela em 26/10): pela mensalidade gravada; o anual é 12 × ela (antes este teste esperava o
  // anual do "10" vigente, 11 × 59,90 — ficou vermelho desde fdae353).
  assert.equal(valorDaCobranca(base), 5990);
  assert.equal(valorDaCobranca({ ...base, billingCycle: "annual" }), 71880);
  // Plano vigente: pela tabela DA CONTA (⚖️ Sidney 28/10/2026: quem já assinava, v1, mantém o preço).
  assert.equal(valorDaCobranca({ ...base, plan: "12", priceTable: "v1" }), 7990);
  assert.equal(valorDaCobranca({ ...base, plan: "12", priceTable: "v1", billingCycle: "annual" }), 87890);
  assert.equal(valorDaCobranca({ ...base, plan: "50", priceTable: "v1" }), 19990, "o de 50 de quem já assinava segue 199,90");
  assert.equal(valorDaCobranca({ ...base, plan: "50", priceTable: "v2" }), 22990, "o de 50 novo é 229,90");
  assert.equal(valorDaCobranca({ ...base, plan: "pro", monthlyFee: "150.00" }), 15000);
  assert.equal(valorDaCobranca({ ...base, plan: "pro", monthlyFee: "150.00", billingCycle: "annual" }), 180000);
});

test("vencimentos se repetem pelo ciclo, do próximo (mesmo vencido) até o fim do período; dia 31 vira o último do mês curto", () => {
  assert.deepEqual(vencimentosPrevistos([base], "2027-01-31").map((v) => v.dia), ["2026-10-05", "2026-11-05", "2026-12-05", "2027-01-05"]);
  assert.deepEqual(vencimentosPrevistos([{ ...base, billingCycle: "annual" }], "2028-12-31").map((v) => v.dia), ["2026-10-05", "2027-10-05", "2028-10-05"]);
  assert.deepEqual(vencimentosPrevistos([{ ...base, nextBillingDate: "2026-01-31T15:00:00Z" }], "2026-03-31").map((v) => v.dia), ["2026-01-31", "2026-02-28", "2026-03-31"]);
});

test("🔴 faturado = Pix confirmado, no mês da confirmação (Brasília); estornado e pendente não contam; a receber pelos vencimentos", () => {
  const pagamentos = [
    { status: "pago", amount: "59.90", confirmedAt: "2026-09-01T02:00:00Z", createdAt: "2026-08-30T12:00:00Z" }, // 31/08 em Brasília
    { status: "pago", amount: "150.00", confirmedAt: null, createdAt: "2026-09-10T12:00:00Z" },
    { status: "estornado", amount: "99.00", confirmedAt: "2026-09-10T12:00:00Z", createdAt: "2026-09-10T12:00:00Z" },
    { status: "pendente", amount: "59.90", confirmedAt: null, createdAt: "2026-10-02T12:00:00Z" },
  ];
  const meses = faturamentoPorMes([base], pagamentos, "2026-08", "2026-11");
  assert.deepEqual(meses, [
    { chave: "2026-08", pago: 5990, aReceber: 0 },
    { chave: "2026-09", pago: 15000, aReceber: 0 },
    { chave: "2026-10", pago: 0, aReceber: 5990 },
    { chave: "2026-11", pago: 0, aReceber: 5990 },
  ]);
  const anos = faturamentoPorAno([base], pagamentos, 2026, 2027);
  assert.deepEqual(anos, [{ chave: "2026", pago: 20990, aReceber: 5990 * 3 }, { chave: "2027", pago: 0, aReceber: 5990 * 12 }]);
});

test("texto do vencimento: dia do mês, vencido e anual; sem cobrança, nada", () => {
  assert.deepEqual(descricaoDoVencimento({ ...base, nextBillingDate: "2026-11-05T15:00:00Z" }, "2026-10-15"), { texto: "Vence em 05/11/2026 · todo dia 5", vencido: false });
  assert.deepEqual(descricaoDoVencimento(base, "2026-10-15"), { texto: "Venceu em 05/10/2026 · todo dia 5", vencido: true });
  assert.equal(descricaoDoVencimento({ ...base, billingCycle: "annual", nextBillingDate: "2027-03-10T15:00:00Z" }, "2026-10-15")?.texto, "Vence em 10/03/2027 · anual");
  assert.equal(descricaoDoVencimento({ ...base, billingExemptAt: "2026-10-01T00:00:00Z" }, "2026-10-15"), null);
});

test("o gráfico do Financeiro continua com os mesmos textos; a Administração usa os seus", () => {
  const linhas = [{ month: "2026-10", receita: 100, despesa: 50, receitaRealizada: 0, despesaRealizada: 0 }];
  const financeiro = renderToStaticMarkup(createElement(MonthlyChart, { rows: linhas, from: "2026-10", to: "2026-10" }));
  assert.match(financeiro, /Receitas × despesas por mês/);
  assert.match(financeiro, />Receitas</);
  const admin = renderToStaticMarkup(createElement(MonthlyChart, { rows: linhas, from: "2026", to: "2026", xLabel: (k: string) => k,
    labels: { titulo: "Faturado × a receber por ano", periodo: "Ano", a: "Faturado", b: "A receber", diferenca: null, realizadoA: null, realizadoB: null, vazio: "Nada de {de} a {ate}." } }));
  assert.match(admin, /Faturado × a receber por ano/);
  assert.doesNotMatch(admin, /Receitas/);
});

test("sem vencimento, a coluna diz o motivo (nunca fica em branco)", () => {
  assert.equal(motivoSemVencimento({ ...base, billingExemptAt: "2026-10-10T00:00:00Z", nextBillingDate: null }), "Sem cobrança (isento)");
  assert.equal(motivoSemVencimento({ ...base, subscriptionStatus: "cancelado" }), "Assinatura cancelada");
  assert.equal(motivoSemVencimento({ ...base, verificationStatus: "suspenso" }), "Conta suspensa");
  assert.equal(motivoSemVencimento({ ...base, role: "admin" }), "Administração");
  assert.equal(motivoSemVencimento({ ...base, nextBillingDate: null }), "Sem vencimento definido");
});
