import assert from "node:assert/strict";
import test from "node:test";
import { addFreeDays, billingNotice, billingPopupSlot, extendPaidPeriod, hasSubscriptionAccess } from "../src/lib/subscription";
test("30 dias gratuitos expiram exatamente no limite e não concedem acesso após a data", () => {
  const start = new Date("2026-10-01T12:00:00Z");
  const end = addFreeDays(start);
  assert.equal(end.toISOString(), "2026-10-31T12:00:00.000Z");
  assert.equal(hasSubscriptionAccess("teste", end, start), true);
  assert.equal(hasSubscriptionAccess("teste", end, end), false);
  assert.equal(hasSubscriptionAccess("teste", null, start), false);
  assert.equal(hasSubscriptionAccess("cancelado", end, start), false);
  assert.equal(hasSubscriptionAccess("ativo", end, end), false);
  assert.equal(hasSubscriptionAccess("ativo", null, start), true);
});
test("renovação preserva dias restantes e ajusta fim de mês e ano bissexto", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  assert.equal(extendPaidPeriod(new Date("2026-01-31T12:00:00Z"), "monthly", now).toISOString(), "2026-02-28T12:00:00.000Z");
  assert.equal(extendPaidPeriod(new Date("2024-02-29T12:00:00Z"), "annual", new Date("2024-01-01T12:00:00Z")).toISOString(), "2025-02-28T12:00:00.000Z");
  assert.equal(extendPaidPeriod(new Date("2025-12-01T12:00:00Z"), "monthly", now).toISOString(), "2026-02-01T12:00:00.000Z");
});

const account = (changes: Partial<Parameters<typeof billingNotice>[0]> = {}) => ({
  role: "corretor", subscriptionStatus: "ativo", nextBillingDate: new Date("2026-10-13T15:00:00Z"), billingExemptAt: null,
  plan: "35", billingCycle: "monthly", hasPaid: true, pendingPix: false, ...changes,
});
test("aviso da mensalidade no sino aparece de 3 dias antes até pagar, contando o dia de Brasília", () => {
  const now = new Date("2026-10-10T15:00:00Z");
  assert.equal(billingNotice(account({ nextBillingDate: new Date("2026-10-14T15:00:00Z") }), now), null);
  assert.equal(billingNotice(account(), now)?.title, "Sua mensalidade vence em 3 dias");
  // 09/10 às 23h em Brasília (10/10 em UTC): o vencimento de 10/10 ainda é amanhã para o corretor.
  assert.equal(billingNotice(account({ nextBillingDate: new Date("2026-10-10T12:00:00Z") }), new Date("2026-10-10T02:00:00Z"))?.title, "Sua mensalidade vence amanhã");
  assert.equal(billingNotice(account({ nextBillingDate: new Date("2026-10-10T20:00:00Z") }), now)?.title, "Sua mensalidade vence hoje");
  const expired = billingNotice(account({ nextBillingDate: new Date("2026-10-01T15:00:00Z") }), now)!;
  assert.equal(expired.tone, "vencido");
  assert.equal(expired.title, "Sua assinatura venceu");
  assert.match(expired.message, /Venceu em 01\/10\/2026/);
});
test("conta isenta, administração e conta sem vencimento nunca veem cobrança", () => {
  const now = new Date("2026-10-10T15:00:00Z");
  assert.equal(billingNotice(account({ billingExemptAt: new Date("2026-10-10T12:00:00Z") }), now), null);
  assert.equal(billingNotice(account({ role: "admin" }), now), null);
  assert.equal(billingNotice(account({ nextBillingDate: null }), now), null);
});
test("primeira cobrança oferece mensal ou anual; depois cobra só o ciclo escolhido", () => {
  const now = new Date("2026-10-10T15:00:00Z");
  const first = billingNotice(account({ subscriptionStatus: "teste", hasPaid: false }), now)!;
  assert.equal(first.title, "Seu período grátis termina em 3 dias");
  assert.match(first.message, /mensal R\$\s189,90 ou anual R\$\s2\.088,90/);
  const monthly = billingNotice(account(), now)!;
  assert.match(monthly.message, /mensalidade R\$\s189,90\.$/);
  assert.doesNotMatch(monthly.message, /anual/);
  const annual = billingNotice(account({ billingCycle: "annual" }), now)!;
  assert.equal(annual.title, "Sua anuidade vence em 3 dias");
  assert.match(annual.message, /anuidade R\$\s2\.088,90\.$/);
  // 🔴 Quem já assinava (tabela v1, ⚖️ Sidney 28/10/2026) vê e paga o preço de antes.
  assert.match(billingNotice(account({ priceTable: "v1" }), now)!.message, /mensalidade R\$\s159,90\.$/);
  assert.match(billingNotice(account({ priceTable: "v1", billingCycle: "annual" }), now)!.message, /anuidade R\$\s1\.758,90\.$/);
  assert.equal(billingNotice(account({ pendingPix: true }), now)?.title, "Pix aguardando confirmação");
});

test("pop-up da cobrança: aviso 1× por dia, vencido de manhã e à tarde (Brasília), nada com Pix aguardando ou sem aviso", () => {
  const aviso = { tone: "aviso" as const, title: "t", message: "m" };
  const vencido = { tone: "vencido" as const, title: "t", message: "m" };
  assert.equal(billingPopupSlot(aviso, false, new Date("2026-10-10T13:00:00Z")), "2026-10-10");
  assert.equal(billingPopupSlot(aviso, false, new Date("2026-10-10T22:00:00Z")), "2026-10-10", "aviso não reabre à tarde");
  // 11h59 e 12h00 em Brasília (UTC−3).
  assert.equal(billingPopupSlot(vencido, false, new Date("2026-10-10T14:59:00Z")), "2026-10-10-manha");
  assert.equal(billingPopupSlot(vencido, false, new Date("2026-10-10T15:00:00Z")), "2026-10-10-tarde");
  // 23h de 09/10 em Brasília já é 10/10 em UTC.
  assert.equal(billingPopupSlot(vencido, false, new Date("2026-10-10T02:00:00Z")), "2026-10-09-tarde");
  assert.equal(billingPopupSlot(vencido, true, new Date("2026-10-10T15:00:00Z")), null);
  assert.equal(billingPopupSlot(null, false), null);
});
