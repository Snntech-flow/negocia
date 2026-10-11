import assert from "node:assert/strict";
import test from "node:test";
import { previsaoParaBanco, previsaoParaTela, temPrevisaoDeEntrega, mesAnoValido } from "../src/lib/delivery-forecast";

test("previsão de entrega: só em construção ou na planta, guardada no dia 1 do mês", () => {
  assert.equal(previsaoParaBanco("na_planta", "2027-12"), "2027-12-01");
  assert.equal(previsaoParaBanco("em_construcao", "2026-03"), "2026-03-01");
  // Pronto ou usado não tem previsão: mesmo que a tela mande, o banco recebe vazio.
  assert.equal(previsaoParaBanco("usado", "2027-12"), null);
  assert.equal(previsaoParaBanco("novo", "2027-12"), null);
  assert.equal(previsaoParaBanco("na_planta", ""), null);
  assert.equal(previsaoParaBanco("na_planta", "2027-13"), null);
  assert.equal(temPrevisaoDeEntrega("na_planta"), true);
  assert.equal(temPrevisaoDeEntrega(null), false);
});

test("previsão de entrega: mês/ano na tela", () => {
  assert.equal(previsaoParaTela("2027-12-01"), "12/2027");
  assert.equal(previsaoParaTela(null), "");
  assert.equal(mesAnoValido("1999-12"), false);
  assert.equal(mesAnoValido("2027-02"), true);
});
