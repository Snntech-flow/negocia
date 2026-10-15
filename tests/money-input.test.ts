import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { avisoDeValorBaixo, campoDeReais, lerReais, reaisParaServidor } from "../src/lib/money-input";
import MoneyInput from "../src/components/MoneyInput";

test("🔴 \"720.000\" é setecentos e vinte mil — não R$ 720,00 (o anúncio de 14/10/2026)", () => {
  assert.equal(lerReais("720.000"), 720000);
  assert.equal(reaisParaServidor(lerReais("720.000")!), "720000.00");
});

test("lê o dinheiro do jeito que se escreve no Brasil, com ou sem ponto", () => {
  const casos: [string, number][] = [
    ["720000", 720000], ["720.000,00", 720000], ["720.000,5", 720000.5], ["720000,50", 720000.5], ["1.447", 1447],
    ["R$ 1.447,00", 1447], [" 650 ", 650], ["15.000.000", 15000000], ["0,5", 0.5], ["1.50", 1.5], ["180", 180],
  ];
  for (const [texto, valor] of casos) assert.equal(lerReais(texto), valor, texto);
});

test("o que não dá para entender volta nulo (o campo avisa e o formulário não segue)", () => {
  for (const texto of ["", "abc", "7.20.0", "1,2,3", "720.0000", "12,345", "-50", "1.2345,00"]) assert.equal(lerReais(texto), null, JSON.stringify(texto));
});

test("valor gravado aparece formatado na edição", () => {
  assert.equal(campoDeReais("720000.00"), "720.000,00");
  assert.equal(campoDeReais("0"), "0,00");
  assert.equal(campoDeReais(null), "");
});

test("🔴 valor baixo demais para a finalidade pede confirmação (venda < 10 mil, aluguel < 100, diária < 30)", () => {
  assert.match(avisoDeValorBaixo("venda", 720) ?? "", /R\$ 720,00.*R\$ 720\.000,00/);
  assert.equal(avisoDeValorBaixo("venda", 720000), null);
  assert.ok(avisoDeValorBaixo("aluguel", 25));
  assert.equal(avisoDeValorBaixo("aluguel", 2500), null);
  assert.equal(avisoDeValorBaixo("temporada", 350), null);
  assert.equal(avisoDeValorBaixo("venda", 0), null);
});

test("🔴 o campo manda ao formulário o valor do servidor e mostra o formato brasileiro", () => {
  const html = renderToStaticMarkup(createElement(MoneyInput, { id: "pc-price", name: "salePrice", defaultValue: "720000.00" }));
  assert.match(html, /<input type="hidden" name="salePrice" value="720000.00"\/>/);
  assert.match(html, /id="pc-price" type="text" inputMode="decimal"[^>]*value="720.000,00"/);
  assert.doesNotMatch(html, /type="number"/);
});

test("🔴 valor, condomínio e IPTU usam o campo de dinheiro no cadastro e na edição", () => {
  const cadastro = readFileSync(new URL("../src/components/PropertyCreateForm.tsx", import.meta.url), "utf8");
  const edicao = readFileSync(new URL("../src/components/PropertyInventory.tsx", import.meta.url), "utf8");
  for (const campo of ["salePrice", "condoFee", "iptu"]) {
    assert.doesNotMatch(cadastro, new RegExp(`<input[^>]*name="${campo}"`), `cadastro: ${campo} voltou a ser input comum`);
    assert.match(cadastro, new RegExp(`<MoneyInput[^>]*name="${campo}"`), `cadastro: ${campo}`);
    assert.match(edicao, new RegExp(`key: "${campo}", label: "[^"]+", kind: "money"`), `edição: ${campo}`);
  }
});
