import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { capaDasFotos, moverFoto } from "../src/lib/photo-order";
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

test("🔴 a grade marca a 1ª como capa, oferece “Capa” nas outras e trava as setas nas pontas", () => {
  const html = renderToStaticMarkup(createElement(PhotoGrid, { fotos: [a, b, c], onChange: () => undefined }));
  const botao = (rotulo: string) => html.match(new RegExp(`<button[^>]*aria-label="${rotulo}"[^>]*>`))?.[0];
  assert.match(botao("Mover foto 1 para trás") ?? "", /disabled=""/);
  assert.match(botao("Mover foto 3 para frente") ?? "", /disabled=""/);
  assert.doesNotMatch(botao("Mover foto 1 para frente") ?? "ausente disabled=\"\"", /disabled=""/);
  assert.doesNotMatch(botao("Mover foto 3 para trás") ?? "ausente disabled=\"\"", /disabled=""/);
  assert.equal(botao("Usar foto 1 como capa"), undefined);
  assert.ok(botao("Usar foto 2 como capa") && botao("Usar foto 3 como capa"));
  assert.deepEqual([...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]), [a, b, c]);
  assert.equal(html.match(/>Capa<\/span>/g)?.length, 1);
  const plantas = renderToStaticMarkup(createElement(PhotoGrid, { fotos: [a, b], onChange: () => undefined, nome: "Planta", capa: false }));
  assert.doesNotMatch(plantas, /Capa/);
  assert.match(plantas, /aria-label="Mover planta 2 para trás"/);
});
