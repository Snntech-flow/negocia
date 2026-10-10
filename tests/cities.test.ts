import assert from "node:assert/strict";
import test from "node:test";
import { cityFilterOptions, loadStateCities, uniqueCities } from "../src/lib/cities";

test("filtro do funil lista cada cidade dos clientes uma vez, sem duplicar por acento ou caixa", () => {
  assert.deepEqual(uniqueCities(["São Paulo", " sao paulo ", "Salvador", null, "", "SÃO PAULO", "Feira de Santana"]),
    ["Feira de Santana", "Salvador", "São Paulo"]);
  assert.deepEqual(uniqueCities([]), []);
});

test("sugestões de cidade vêm do IBGE pela UF do corretor e falha não quebra o cadastro", async () => {
  const requested: string[] = [];
  const ibge = (async (url: string | URL | Request) => {
    requested.push(String(url));
    return new Response(JSON.stringify([{ nome: "Salvador" }, { nome: "Abaré" }, { nome: 42 }, null]), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await loadStateCities("ba", ibge), ["Abaré", "Salvador"]);
  assert.equal(requested.length, 1);
  assert.match(requested[0], /localidades\/estados\/BA\/municipios/);
  await loadStateCities("BA", ibge);
  assert.equal(requested.length, 1, "a mesma UF não consulta o IBGE duas vezes");

  assert.deepEqual(await loadStateCities("XX", ibge), []);
  assert.equal(requested.length, 1, "UF inexistente não consulta o IBGE");

  const offline = (async () => new Response("erro", { status: 503 })) as typeof fetch;
  assert.deepEqual(await loadStateCities("PE", offline), []);
  assert.deepEqual(await loadStateCities("PE", ibge), ["Abaré", "Salvador"], "depois de uma falha, tenta de novo");
});

test("filtro de cidade do CRM: cidades com cliente primeiro, depois as do estado escolhido, sem repetir", () => {
  const options = cityFilterOptions(["salvador", "Feira de Santana", null, "Recife"], ["Camaçari", "Salvador", "Feira de Santana", "Ilhéus"]);
  assert.deepEqual(options.withClients, ["Feira de Santana", "Recife", "salvador"]);
  assert.deepEqual(options.others, ["Camaçari", "Ilhéus"], "Salvador já está nas com cliente, mesmo grafada diferente");
  assert.deepEqual(cityFilterOptions([], ["Ilhéus", "Camaçari"]), { withClients: [], others: ["Camaçari", "Ilhéus"] }, "carteira vazia ainda mostra as cidades do estado");
});
