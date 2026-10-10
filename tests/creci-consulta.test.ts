import assert from "node:assert/strict";
import test from "node:test";
import { BRAZILIAN_STATES } from "../src/lib/brazil-states";
import { CRECI_CONSULTA, creciConsultaUrl, creciDigits } from "../src/lib/creci-consulta";

test("conferir CRECI: os 27 estados têm a busca do conselho, sempre em https e em domínio do conselho", () => {
  for (const uf of BRAZILIAN_STATES) {
    const url = creciConsultaUrl(uf);
    assert.ok(url, `sem busca do CRECI-${uf}`);
    const { protocol, hostname } = new URL(url);
    assert.equal(protocol, "https:", uf);
    // O de MG fica no sistema do fornecedor, ligado pelo próprio site crecimg.gov.br.
    assert.ok(hostname.endsWith(".gov.br") || hostname === `www.creci${uf.toLowerCase()}.conselho.net.br` || hostname === "crecimg.spiderware.com.br", `${uf}: ${hostname}`);
  }
  assert.equal(Object.keys(CRECI_CONSULTA).length, 27);
  assert.equal(creciConsultaUrl("ba"), creciConsultaUrl("BA"), "sigla em minúscula também serve");
  assert.equal(creciConsultaUrl("XX"), null);
});

test("conferir CRECI: copia só os dígitos da inscrição", () => {
  assert.equal(creciDigits("16952"), "16952");
  assert.equal(creciDigits("CRECI 16952-F"), "16952");
  assert.equal(creciDigits("12.345-J"), "12345");
  assert.equal(creciDigits("PILOTO"), "", "sem número: a tela pede busca por nome ou CPF");
});
