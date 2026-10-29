import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { capaDasFotos, fotosComCapaNaFrente, moverFoto } from "../src/lib/photo-order";
import PhotoGrid from "../src/components/PhotoGrid";

const [a, b, c] = ["https://fotos.exemplo.test/a.jpg", "https://fotos.exemplo.test/b.jpg", "https://fotos.exemplo.test/c.jpg"];

test("mover foto para frente, para trás e para a capa — sem mexer na lista original", () => {
  const fotos = [a, b, c];
  assert.deepEqual(moverFoto(fotos, 0, 1), [b, a, c]);
  assert.deepEqual(moverFoto(fotos, 2, 1), [a, c, b]);
  assert.deepEqual(moverFoto(fotos, 2, 0), [c, a, b]);
  assert.deepEqual(moverFoto(fotos, 0, 2), [b, c, a]);
  assert.deepEqual(fotos, [a, b, c]);
});

test("posição inválida não muda a ordem nem perde foto", () => {
  for (const [de, para] of [[-1, 0], [0, 3], [3, 0], [1, 1], [0.5, 1], [Number.NaN, 0]]) {
    assert.deepEqual(moverFoto([a, b, c], de, para), [a, b, c], `de ${de} para ${para}`);
  }
});

test("a capa é a primeira foto", () => {
  assert.equal(capaDasFotos([b, a]), b);
  assert.equal(capaDasFotos([]), null);
  assert.equal(capaDasFotos(undefined), null);
});

test("🔴 a grade marca a 1ª como capa, oferece “Tornar capa” nas outras e trava as setas nas pontas", () => {
  const html = renderToStaticMarkup(createElement(PhotoGrid, { fotos: [a, b, c], onChange: () => undefined }));
  const botao = (rotulo: string) => html.match(new RegExp(`<button[^>]*aria-label="${rotulo}"[^>]*>`))?.[0];
  assert.match(botao("Mover foto 1 para trás") ?? "", /disabled=""/);
  assert.match(botao("Mover foto 3 para frente") ?? "", /disabled=""/);
  assert.doesNotMatch(botao("Mover foto 1 para frente") ?? "ausente disabled=\"\"", /disabled=""/);
  assert.doesNotMatch(botao("Mover foto 3 para trás") ?? "ausente disabled=\"\"", /disabled=""/);
  assert.equal(botao("Tornar a foto 1 a capa"), undefined);
  assert.ok(botao("Tornar a foto 2 a capa") && botao("Tornar a foto 3 a capa"));
  assert.deepEqual([...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]), [a, b, c]);
  assert.equal(html.match(/>Capa<\/span>/g)?.length, 1);
  // 29/10/2026, corretora: "aparece em todas a palavra Capa" — o botão das outras dizia só "Capa" e parecia rótulo.
  assert.equal(html.match(/>Capa</g)?.length, 1, "a palavra “Capa” sozinha só na 1ª foto");
  assert.equal(html.match(/>Tornar capa<\/button>/g)?.length, 2);
  const plantas = renderToStaticMarkup(createElement(PhotoGrid, { fotos: [a, b], onChange: () => undefined, nome: "Planta", capa: false }));
  assert.doesNotMatch(plantas, /Capa/);
  assert.match(plantas, /aria-label="Mover planta 2 para trás"/);
});

test("🔴 a edição abre com a capa gravada na frente — ninguém perde a capa que já tinha", () => {
  assert.deepEqual(fotosComCapaNaFrente([a, b, c], c), [c, a, b]);
  assert.deepEqual(fotosComCapaNaFrente([a, b], "https://fotos.exemplo.test/capa-avulsa.jpg"), ["https://fotos.exemplo.test/capa-avulsa.jpg", a, b]);
  assert.deepEqual(fotosComCapaNaFrente([a, b], null), [a, b]);
  assert.equal(fotosComCapaNaFrente(Array.from({ length: 40 }, (_, i) => `https://fotos.exemplo.test/${i}.jpg`), c).length, 40);
});

test("🔴 a edição não tem mais campo de URL da capa (ele seria ignorado: a capa é a primeira foto)", () => {
  const fonte = readFileSync(new URL("../src/components/PropertyInventory.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(fonte, /key: "coverPhoto"/);
  assert.match(fonte, /fotosComCapaNaFrente\(lista, editing\.coverPhoto/);
});
