import assert from "node:assert/strict";
import test from "node:test";
import { dataPorExtenso, percentualDigitado, percentualPorExtenso, percentualValido, textoDoControle, valorEmReais, type DadosDoControle } from "../src/lib/visit-control";

const dados = (mudar: Partial<DadosDoControle> = {}): DadosDoControle => ({
  numero: "A1B2C3D4E5F60718",
  corretor: { nome: "Corretor do Comprador", creci: "12345-F", uf: "BA" },
  imovel: { codigo: "7B1C0D2E", tipo: "Casa Solta", titulo: "Casa com quintal", bairro: "Centro", cidade: "Salvador", valor: "500000.00" },
  cliente: { nome: "Cliente de Teste", telefone: null },
  dataDaVisita: "2026-10-11",
  ...mudar,
});

test("controle de visita: declaração com o corretor, o CRECI/UF, a comissão por extenso e a Lei 6.530/78", () => {
  const c = textoDoControle(dados(), 6);
  assert.equal(c.titulo, "CONTROLE DE VISITA A IMÓVEL N.º A1B2C3D4E5F60718");
  assert.match(c.declaracao[0], /^Declaro, na qualidade de possível comprador, .* através do corretor Corretor do Comprador, inscrito no CRECI n\.º 12345-F\/BA,/);
  assert.match(c.declaracao[1], /equivalente a 6% \(seis por cento\) sobre o valor do bem, de acordo com a tabela de honorários do CRECI\/BA, conforme a Lei 6\.530\/78\.$/);
  assert.equal(c.corretor, "Corretor do Comprador — CRECI n.º 12345-F/BA");
  assert.equal(c.localEData, "Salvador, 11 de outubro de 2026");
});

test("controle de visita: o imóvel com bairro, cidade e código (nunca endereço protegido) e linhas em branco para outros", () => {
  const c = textoDoControle(dados(), 6);
  assert.deepEqual(c.imoveis[0], { imovel: "Casa Solta “Casa com quintal” — código 7B1C0D2E", endereco: "Centro, Salvador", valor: valorEmReais("500000.00") });
  assert.equal(c.imoveis.length, 4);
  assert.ok(c.imoveis.slice(1).every((l) => !l.imovel && !l.endereco && !l.valor));
});

test("controle de visita: o cliente preenche à mão o que o sistema não guarda (CPF inteiro, endereços)", () => {
  const c = textoDoControle(dados({ cliente: { nome: "  Cliente\nde Teste ", telefone: "71 99999-0000" } }), 8);
  assert.deepEqual(c.declarante, [
    { rotulo: "Nome do declarante", valor: "Cliente de Teste" },
    { rotulo: "CPF", valor: "" },
    { rotulo: "End. residencial", valor: "" },
    { rotulo: "End. trabalho", valor: "" },
    { rotulo: "Telefones", valor: "71 99999-0000" },
  ]);
  assert.match(c.declaracao[1], /8% \(oito por cento\)/);
});

test("controle de visita: sem UF não inventa região do CRECI; percentual de 1 a 20 com uma casa decimal; data e valor", () => {
  const c = textoDoControle(dados({ corretor: { nome: "Corretor", creci: "999", uf: null } }), 6);
  assert.match(c.declaracao[0], /inscrito no CRECI n\.º 999, e que/);
  assert.match(c.declaracao[1], /tabela de honorários do CRECI, conforme/);
  assert.equal(percentualPorExtenso(20), "20% (vinte por cento)");
  // 🔴 com uma casa decimal (corretora piloto, 14/10/2026: "tenho imóveis que são 2,5%, outros 3,0%")
  assert.equal(percentualValido(2.5), true);
  assert.equal(percentualValido(1.1), true);
  assert.equal(percentualValido(2.55), false);
  assert.equal(percentualValido(0), false);
  assert.equal(percentualPorExtenso(2.5), "2,5% (dois vírgula cinco por cento)");
  assert.equal(percentualPorExtenso(3), "3% (três por cento)");
  assert.equal(percentualDigitado("2,5"), 2.5);
  assert.equal(percentualDigitado("3,0"), 3);
  assert.equal(percentualDigitado("3.0"), 3);
  assert.ok(Number.isNaN(percentualDigitado("2,55")) && Number.isNaN(percentualDigitado("abc")));
  assert.match(textoDoControle(dados({}), 2.5).declaracao[1], /2,5% \(dois vírgula cinco por cento\) sobre o valor do bem/);
  assert.throws(() => percentualPorExtenso(21), /1 a 20/);
  assert.equal(dataPorExtenso("2026-01-05"), "5 de janeiro de 2026");
  assert.equal(dataPorExtenso("lixo"), "____ de ______________ de ______");
  assert.equal(valorEmReais("0"), "");
  assert.match(valorEmReais("1234.5"), /^R\$\s1\.234,50$/);
});
