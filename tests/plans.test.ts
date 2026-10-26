import assert from "node:assert/strict";
import test from "node:test";
import { isPlanId, listingLimit, photoLimit, planCharge, planMonthlyEquivalent, planName, PLANS } from "../src/lib/plans";

test("planos têm uma única tabela de preço: anual paga 11 meses", () => {
  for (const plan of Object.values(PLANS)) {
    assert.equal(Number(plan.annualTotal).toFixed(2), (Number(plan.monthly) * 11).toFixed(2), plan.id);
    assert.equal(planCharge(plan.id, "monthly"), plan.monthly);
    assert.equal(planCharge(plan.id, "annual"), plan.annualTotal);
  }
  assert.equal(planMonthlyEquivalent("12", "annual"), "73.24");
  assert.equal(planMonthlyEquivalent("50", "monthly"), "199.90");
});

// Trava o catálogo (é dinheiro): anúncios, fotos e preço mensal de cada plano.
test("a tabela de planos está com os valores vigentes", () => {
  assert.deepEqual(
    Object.values(PLANS).map((p) => [p.id, p.listings, p.photos, p.monthly]),
    [["12", 12, 15, "79.90"], ["20", 20, 25, "109.90"], ["35", 35, 30, "159.90"], ["50", 50, 35, "199.90"]],
  );
});

test("limite de anúncios por plano, com contas antigas tratadas pela capacidade", () => {
  assert.equal(listingLimit("12"), 12);
  assert.equal(listingLimit("20"), 20);
  assert.equal(listingLimit("50"), 50);
  // Ids antigos ("10"/"40") e planos de nome viram legado, pela capacidade.
  assert.equal(listingLimit("10"), 10);
  assert.equal(listingLimit("40"), 40);
  assert.equal(listingLimit("pro"), 40);
  assert.equal(listingLimit("enterprise"), 40);
  assert.equal(listingLimit("free"), 12); // desconhecido cai no menor plano vigente
  assert.equal(planName("pro"), "40 anúncios");
  assert.equal(isPlanId("20"), true);
  assert.equal(isPlanId("40"), false); // "40" deixou de ser um plano vigente
  assert.equal(isPlanId("pro"), false);
});

test("limite de fotos por plano; conta antiga mantém o teto de 40", () => {
  assert.equal(photoLimit("12"), 15);
  assert.equal(photoLimit("35"), 30);
  assert.equal(photoLimit("50"), 35);
  assert.equal(photoLimit("10"), 40); // legado mantém o teto antigo
  assert.equal(photoLimit("desconhecido"), 40);
});
