import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cpfParcial } from "../src/lib/cpf-parcial";
import CpfParcialInput from "../src/components/CpfParcialInput";

test("🔴 o CPF inteiro digitado vira a forma mascarada (o caso da corretora, 14/10/2026)", () => {
  assert.equal(cpfParcial("01605812415"), "***.058.124-**");
  assert.equal(cpfParcial("016.058.124-15"), "***.058.124-**");
});

test("aceita só os 6 números do meio ou a forma já mascarada", () => {
  assert.equal(cpfParcial("058124"), "***.058.124-**");
  assert.equal(cpfParcial("058.124"), "***.058.124-**");
  assert.equal(cpfParcial("***.058.124-**"), "***.058.124-**");
  assert.equal(cpfParcial(" ***058124** "), "***.058.124-**");
});

test("o que não é CPF volta nulo", () => {
  for (const texto of ["", "123", "1234567", "0160581241", "016058124155", "abc.058.124-15", "***.05.124-**"]) assert.equal(cpfParcial(texto), null, JSON.stringify(texto));
});

test("🔴 o campo manda só a forma mascarada — o CPF inteiro não vai ao formulário", () => {
  const html = renderToStaticMarkup(createElement(CpfParcialInput, { id: "dvp-cpf", name: "clientCpf", inicial: "01605812415" }));
  assert.match(html, /<input type="hidden" name="clientCpf" value="\*\*\*\.058\.124-\*\*"\/>/);
  // os 11 dígitos só ficam no campo visível, que não tem nome (não vai no formulário)
  const comNome = [...html.matchAll(/<input[^>]*name="[^"]*"[^>]*>/g)].map((m) => m[0]).join("");
  assert.doesNotMatch(comNome, /01605812415/);
  assert.match(html, /<input id="dvp-cpf" type="text" inputMode="numeric"(?![^>]*name=)[^>]*value="01605812415"/);
  assert.match(renderToStaticMarkup(createElement(CpfParcialInput, { id: "x", name: "clientCpf" })), /name="clientCpf" value=""/);
});

test("🔴 os dois formulários de visita (Registro de Visita e CRM) usam o campo novo, sem o formato obrigatório antigo", () => {
  for (const arquivo of ["NegociaLarApp.tsx", "LeadCRM.tsx"]) {
    const fonte = readFileSync(new URL(`../src/components/${arquivo}`, import.meta.url), "utf8");
    assert.match(fonte, /<CpfParcialInput /, arquivo);
    assert.doesNotMatch(fonte, /placeholder="\*\*\*\./, arquivo);
  }
});
