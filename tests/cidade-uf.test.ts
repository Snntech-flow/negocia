// Cidade e UF da conta (28/10/2026) — Sidney, na Administração: "onde é São Paulo, Bahia?". O cadastro aceitava qualquer
// texto como cidade, com qualquer UF, e não havia como corrigir.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import MUNICIPIOS from "../src/lib/municipios-ibge.json";
import { municipioDaUf } from "../src/lib/municipios";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("🔴 a cidade tem de ser um município da UF e volta com o nome oficial", () => {
  assert.equal(municipioDaUf("BA", "São Paulo"), null, "São Paulo não é da Bahia");
  assert.equal(municipioDaUf("BA", " salvador "), "Salvador");
  assert.equal(municipioDaUf("sp", "SAO PAULO"), "São Paulo");
  assert.equal(municipioDaUf("DF", "brasilia"), "Brasília");
  assert.equal(municipioDaUf("XX", "Salvador"), null, "UF que não existe");
  assert.equal(municipioDaUf("BA", "Salvador da Bahia"), null, "nome que não é de município");
});

test("a lista oficial do IBGE está inteira: 27 UFs e 5.571 municípios", () => {
  const lista = MUNICIPIOS as Record<string, string[]>;
  assert.equal(Object.keys(lista).length, 27);
  assert.equal(Object.values(lista).reduce((total, cidades) => total + cidades.length, 0), 5571);
});

test("🔴 o cadastro só aceita cidade da UF — no servidor e na tela — e grava o nome oficial", () => {
  const conta = ler("src/lib/actions/account.ts");
  assert.match(conta, /const cidadeOficial = municipioDaUf\(userData\.state, userData\.city\);\n\s*if \(!cidadeOficial\) throw new ActionError/);
  assert.match(conta, /city: cidadeOficial,/);
  assert.doesNotMatch(conta, /city: userData\.city\.trim\(\)/);
  const tela = ler("src/components/OnboardingModal.tsx");
  assert.match(tela, /if \(stateCities\.length && !stateCities\.some\(\(cidade\) => normalizeText\(cidade\) === normalizeText\(formData\.city\)\)\)/);
});

test("🔴 a Administração corrige cidade e UF: só o administrador, com a mesma conferência do cadastro", () => {
  const admin = ler("src/lib/actions/admin.ts");
  const acao = admin.slice(admin.indexOf("export async function updateUserLocationImpl"), admin.indexOf("export async function setAdminViewAccessImpl"));
  assert.match(acao, /if \(actor\.role !== "admin"\) throw new ActionError\("Ação restrita à administração\."\);/);
  assert.match(acao, /const cidadeOficial = municipioDaUf\(sigla, cidade\);\n\s*if \(!cidadeOficial\) throw new ActionError/);
  assert.match(acao, /\.set\(\{ city: cidadeOficial, state: sigla, updatedAt: new Date\(\) \}\)/);
  const painel = ler("src/components/AdminPanel.tsx");
  assert.match(painel, /\{!somenteLeitura && <CorrigirCidadeUf user=\{user\}/, "quem só visualiza não vê o botão");
});
