import assert from "node:assert/strict";
import test from "node:test";
import { addMonthsKeepingDay, brasiliaToday, financeStatus, isIsoDate, monthRange, summarizeFinance, validateFinanceEntryInput } from "../src/lib/finance";

test("repetir todo mês mantém o dia e usa o último dia do mês curto", () => {
  assert.equal(addMonthsKeepingDay("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsKeepingDay("2026-01-31", 2), "2026-03-31");
  assert.equal(addMonthsKeepingDay("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsKeepingDay("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonthsKeepingDay("2026-03-01", -1), "2026-02-01");
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
});

test("datas: só dia que existe e o 'hoje' é o de Brasília", () => {
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("28/02/2026"), false);
  // 23h de 09/10 em Brasília já é 10/10 em UTC.
  assert.equal(brasiliaToday(new Date("2026-10-10T02:00:00Z")), "2026-10-09");
});

test("contas do mês somam em centavos e separam realizado, previsto e vencido", () => {
  const entries = [
    { kind: "receita", amount: "1000.10", paidAt: "2026-10-05", dueDate: "2026-10-05" },
    { kind: "receita", amount: "500.20", paidAt: null, dueDate: "2026-10-02" },
    { kind: "receita", amount: "0.10", paidAt: null, dueDate: "2026-10-20" },
    { kind: "despesa", amount: "200.30", paidAt: "2026-10-01", dueDate: "2026-10-01" },
    { kind: "despesa", amount: "99.99", paidAt: null, dueDate: "2026-10-09" },
  ];
  const summary = summarizeFinance(entries, "2026-10-10");
  assert.equal(summary.received, 100010);
  assert.equal(summary.receivable, 50030);
  assert.equal(summary.paid, 20030);
  assert.equal(summary.payable, 9999);
  assert.equal(summary.overdueReceivable, 50020);
  assert.equal(summary.overduePayable, 9999);
  assert.equal(summary.balance, 79980);
  assert.equal(summary.forecast, 100010 + 50030 - 20030 - 9999);
  assert.equal(financeStatus(entries[1], "2026-10-10"), "vencido");
  assert.equal(financeStatus(entries[2], "2026-10-10"), "a_receber");
  assert.equal(financeStatus(entries[3], "2026-10-10"), "pago");
});

test("lançamento exige tipo, categoria da lista, valor positivo e data válida", () => {
  const base = { kind: "despesa", description: "Anúncio no portal", category: "anuncios_portais", amount: "89,90", dueDate: "2026-10-10" };
  assert.deepEqual(validateFinanceEntryInput(base), { ...base, amount: "89.90", paidAt: null, notes: null, leadId: null, repeatMonths: 1 });
  assert.throws(() => validateFinanceEntryInput({ ...base, kind: "transferencia" }), /receita ou despesa/);
  assert.throws(() => validateFinanceEntryInput({ ...base, category: "comissao_venda" }), /categoria/);
  assert.throws(() => validateFinanceEntryInput({ ...base, amount: "0" }), /maior que zero/);
  assert.throws(() => validateFinanceEntryInput({ ...base, amount: "-10" }), /maior que zero/);
  assert.throws(() => validateFinanceEntryInput({ ...base, amount: "1.234,56" }), /maior que zero/);
  assert.throws(() => validateFinanceEntryInput({ ...base, dueDate: "2026-02-30" }), /data prevista/);
  assert.throws(() => validateFinanceEntryInput({ ...base, paidAt: "ontem" }), /pagou/);
  assert.throws(() => validateFinanceEntryInput({ ...base, repeatMonths: 13 }), /1 a 12/);
  assert.throws(() => validateFinanceEntryInput({ ...base, leadId: "1; drop table" }), /Cliente inválido/);
});
