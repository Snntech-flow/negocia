import assert from "node:assert/strict";
import test from "node:test";
import { conferirDivisao, divisoesPermitidas, ehCondicaoValida, percentualDoCaptador, rotuloDaCondicao } from "../src/lib/partnership-models";

test("cada condição libera só as divisões dela; valor desconhecido mantém as duas (o que o sistema sempre permitiu)", () => {
  assert.deepEqual(divisoesPermitidas("50_50"), ["two_party_50_50"]);
  assert.deepEqual(divisoesPermitidas("40_40_20"), ["three_party_referral_40_40_20"]);
  assert.deepEqual(divisoesPermitidas("ambos"), ["two_party_50_50", "three_party_referral_40_40_20"]);
  assert.deepEqual(divisoesPermitidas(null), ["two_party_50_50", "three_party_referral_40_40_20"]);
});

test("🔴 a divisão fora da condição é recusada com a frase certa", () => {
  assert.throws(() => conferirDivisao("50_50", "three_party_referral_40_40_20"), /só faz parceria 50\/50/);
  assert.throws(() => conferirDivisao("40_40_20", "two_party_50_50"), /só faz parceria 40\/40\/20/);
  assert.doesNotThrow(() => conferirDivisao("ambos", "three_party_referral_40_40_20"));
  assert.doesNotThrow(() => conferirDivisao("50_50", "two_party_50_50"));
});

test("rótulo da vitrine, percentual do captador e valores aceitos", () => {
  assert.equal(rotuloDaCondicao("50_50"), "Parceria só 50/50");
  assert.equal(rotuloDaCondicao("40_40_20"), "Parceria só 40/40/20");
  assert.equal(rotuloDaCondicao("ambos"), "Parceria 50/50 ou 40/40/20");
  assert.equal(percentualDoCaptador("40_40_20"), "40.00");
  assert.equal(percentualDoCaptador("ambos"), "50.00");
  assert.equal(ehCondicaoValida("ambos"), true);
  assert.equal(ehCondicaoValida("60_40"), false);
});
