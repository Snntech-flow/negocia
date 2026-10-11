import assert from "node:assert/strict";
import test from "node:test";
import { chaveDosFiltros, filtrosAtivos, filtrosPadrao, lerFiltros } from "../src/lib/lead-filters";

test("filtros do Funil: a escolha guardada volta, campo a campo; lixo volta ao padrão", () => {
  const padrao = filtrosPadrao("BA");
  const guardado = JSON.stringify({ month: "2026-10", stage: "qualificado", type: "comprador", source: "indicacao", followUp: "agendados" });
  assert.deepEqual(lerFiltros(guardado, padrao), { ...padrao, month: "2026-10", stage: "qualificado", type: "comprador", source: "indicacao", followUp: "agendados" });
  assert.deepEqual(lerFiltros("{quebrado", padrao), padrao);
  assert.deepEqual(lerFiltros(JSON.stringify({ stage: 42, month: "outubro" }), padrao), padrao);
  assert.deepEqual(lerFiltros(null, padrao), padrao);
});

test("filtros do Funil: um por corretor; ativos quando algo foi escolhido", () => {
  assert.equal(chaveDosFiltros("u1"), "negocialar:funil-filtros:u1");
  assert.equal(chaveDosFiltros(null), null);
  assert.equal(filtrosAtivos(filtrosPadrao("BA")), false);
  assert.equal(filtrosAtivos({ ...filtrosPadrao("BA"), stage: "qualificado" }), true);
});
