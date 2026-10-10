import assert from "node:assert/strict";
import test from "node:test";
import { isPlanId, listingLimit, planCharge, planMonthlyEquivalent, planName, PLANS } from "../src/lib/plans";

test("planos têm uma única tabela de preço: anual paga 11 meses", () => {
  for (const plan of Object.values(PLANS)) {
    assert.equal(Number(plan.annualTotal).toFixed(2), (Number(plan.monthly) * 11).toFixed(2), plan.id);
    assert.equal(planCharge(plan.id, "monthly"), plan.monthly);
    assert.equal(planCharge(plan.id, "annual"), plan.annualTotal);
  }
  assert.equal(planMonthlyEquivalent("10", "annual"), "54.91");
  assert.equal(planMonthlyEquivalent("40", "monthly"), "150.00");
});

test("limite de anúncios por plano, com contas antigas tratadas como 40", () => {
  assert.equal(listingLimit("10"), 10);
  assert.equal(listingLimit("20"), 20);
  assert.equal(listingLimit("40"), 40);
  assert.equal(listingLimit("pro"), 40);
  assert.equal(listingLimit("enterprise"), 40);
  assert.equal(listingLimit("free"), 10);
  assert.equal(planName("pro"), "40 anúncios");
  assert.equal(isPlanId("20"), true);
  assert.equal(isPlanId("pro"), false);
});
