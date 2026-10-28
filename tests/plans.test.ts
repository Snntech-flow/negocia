import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_PRICE_TABLE, isPlanId, isPriceTable, listingLimit, photoLimit, planCharge, planMonthlyEquivalent, planName, PLANS } from "../src/lib/plans";

test("planos têm uma única tabela de preço: anual paga 11 meses", () => {
  for (const plan of Object.values(PLANS)) {
    assert.equal(Number(plan.annualTotal).toFixed(2), (Number(plan.monthly) * 11).toFixed(2), plan.id);
    assert.equal(planCharge(plan.id, "monthly"), plan.monthly);
    assert.equal(planCharge(plan.id, "annual"), plan.annualTotal);
  }
  assert.equal(planMonthlyEquivalent("12", "annual"), "73.24");
  assert.equal(planMonthlyEquivalent("50", "monthly"), "229.90");
});

// Trava o catálogo (é dinheiro): anúncios, fotos e preço mensal de cada plano. Tabela v2 (⚖️ Sidney, 28/10/2026).
test("a tabela de planos está com os valores vigentes (v2: 20, 35 e 50 sobem; nasce o de 100 com as fotos do de 50)", () => {
  assert.deepEqual(
    Object.values(PLANS).map((p) => [p.id, p.listings, p.photos, p.monthly, p.annualTotal]),
    [["12", 12, 15, "79.90", "878.90"], ["20", 20, 25, "119.90", "1318.90"], ["35", 35, 30, "189.90", "2088.90"],
     ["50", 50, 35, "229.90", "2528.90"], ["100", 100, 35, "399.90", "4398.90"]],
  );
  assert.equal(CURRENT_PRICE_TABLE, "v2");
});

// ⚖️ Sidney, 28/10/2026: "quem já assina mantém o preço atual". A conta guarda a tabela (users.price_table).
test("🔴 quem já assinava (tabela v1) mantém o preço de antes; a conta nova (v2) paga o novo", () => {
  assert.deepEqual(
    (["12", "20", "35", "50"] as const).map((p) => [p, planCharge(p, "monthly", "v1"), planCharge(p, "annual", "v1")]),
    [["12", "79.90", "878.90"], ["20", "109.90", "1208.90"], ["35", "159.90", "1758.90"], ["50", "199.90", "2198.90"]],
  );
  assert.equal(planCharge("50", "monthly", "v2"), "229.90");
  assert.equal(planCharge("50", "monthly"), "229.90", "sem tabela = a vigente (cadastro, landing)");
  assert.equal(planMonthlyEquivalent("20", "monthly", "v1"), "109.90", "a mensalidade gravada na conta segue a tabela dela");
  assert.equal(planMonthlyEquivalent("12", "annual", "v1"), "73.24");
  // O plano de 100 não existia na v1: cobra pela vigente.
  assert.equal(planCharge("100", "monthly", "v1"), "399.90");
  // Tabela desconhecida não inventa preço: cai na vigente.
  assert.equal(planCharge("35", "monthly", "v9"), "189.90");
  assert.equal(isPriceTable("v1"), true);
  assert.equal(isPriceTable("v3"), false);
});

test("limite de anúncios por plano, com contas antigas tratadas pela capacidade", () => {
  assert.equal(listingLimit("12"), 12);
  assert.equal(listingLimit("20"), 20);
  assert.equal(listingLimit("50"), 50);
  assert.equal(listingLimit("100"), 100);
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
  assert.equal(photoLimit("100"), 35); // o de 100 tem as fotos do de 50 (⚖️ Sidney, 28/10/2026)
  assert.equal(photoLimit("10"), 40); // legado mantém o teto antigo
  assert.equal(photoLimit("desconhecido"), 40);
});
