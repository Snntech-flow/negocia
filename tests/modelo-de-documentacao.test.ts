// "Usar meu modelo" / "Salvar como meu modelo" (CRM › documentação da negociação), 28/10/2026 — corretora piloto: "aparece a
// mãozinha, mas clico e não sai do lugar, não aparece nada". Os botões funcionavam; a resposta deles ia para o aviso único do
// FIM da seção, depois da lista inteira e dos custos. Agora o aviso do modelo fica logo abaixo dos botões.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fonte = readFileSync(new URL("../src/components/NegotiationDocumentation.tsx", import.meta.url), "utf8");

test("🔴 a resposta dos botões do modelo aparece logo abaixo deles, antes do resto do formulário", () => {
  const botoes = fonte.indexOf(">Salvar como meu modelo</button>");
  const aviso = fonte.indexOf("{avisoDoModelo && <p role=\"status\"");
  const imovel = fonte.indexOf("Imóvel vinculado");
  assert.ok(botoes > 0 && aviso > 0 && imovel > 0, "achei os botões, o aviso e o campo do imóvel");
  assert.ok(botoes < aviso && aviso < imovel, "o aviso fica entre os botões e o formulário");
  const funcao = fonte.slice(fonte.indexOf("async function template("), fonte.indexOf("const text = "));
  assert.doesNotMatch(funcao, /setMessage\(/, "os botões do modelo não escrevem no aviso do fim da seção");
  assert.match(funcao, /setAvisoDoModelo\('Modelo pessoal salvo para reutilizar\.'\)/);
  assert.match(funcao, /clique em “Salvar como meu modelo”/, "sem modelo, o aviso diz o que fazer");
});

test("cada botão do modelo diz o que faz ao passar o mouse e aparece ocupado enquanto trabalha", () => {
  assert.match(fonte, /title="Carrega a lista e os custos que você salvou como seu modelo"/);
  assert.match(fonte, /title="Guarda esta lista e os custos para reaproveitar em outros clientes/);
  assert.equal((fonte.match(/onClick=\{\(\) => template\((true|false)\)\} className="[^"]*disabled:opacity-50/g) ?? []).length, 2);
});
