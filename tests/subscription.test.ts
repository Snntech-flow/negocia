import assert from "node:assert/strict";
import test from "node:test";
import { addFreeDays, extendPaidPeriod, hasSubscriptionAccess } from "../src/lib/subscription";
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
