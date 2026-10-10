import assert from "node:assert/strict";
import test from "node:test";
import { normalizeText } from "../src/lib/text-match";

test("cidade e bairro casam sem diferenciar acento, caixa e espaços", () => {
  assert.equal(normalizeText(" São Paulo "), normalizeText("sao paulo"));
  assert.equal(normalizeText("JOÃO PESSOA"), "joao pessoa");
  assert.equal(normalizeText("Vitória da Conquista"), "vitoria da conquista");
  assert.notEqual(normalizeText("Santos"), normalizeText("Santo André"));
});
