import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GaleriaDeFotos, fotoVizinha } from "../src/components/PhotoViewer";

const fotos = ["https://fotos.exemplo.test/1.jpg", "https://fotos.exemplo.test/2.jpg", "https://fotos.exemplo.test/3.jpg"];

test("a galeria dá a volta: da última para a primeira e da primeira para a última", () => {
  assert.equal(fotoVizinha(2, 3, 1), 0);
  assert.equal(fotoVizinha(0, 3, -1), 2);
  assert.equal(fotoVizinha(1, 3, 1), 2);
  assert.equal(fotoVizinha(0, 0, 1), 0);
});

test("🔴 a galeria mostra a foto escolhida, o contador e as setas", () => {
  const html = renderToStaticMarkup(createElement(GaleriaDeFotos, { fotos, indice: 1, titulo: "Apto Teste", onIndice: () => undefined, onFechar: () => undefined }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /src="https:\/\/fotos\.exemplo\.test\/2\.jpg"/);
  assert.match(html, />2 \/ 3</);
  assert.match(html, /aria-label="Foto anterior"/);
  assert.match(html, /aria-label="Próxima foto"/);
  assert.match(html, /aria-label="Fechar fotos"/);
  const uma = renderToStaticMarkup(createElement(GaleriaDeFotos, { fotos: fotos.slice(0, 1), indice: 0, titulo: "Apto", onIndice: () => undefined, onFechar: () => undefined }));
  assert.doesNotMatch(uma, /Próxima foto/);
});

test("🔴 na Vitrine, a foto do cartão e o selo de fotos abrem a galeria", () => {
  const fonte = readFileSync(new URL("../src/components/PropertyMarketplace.tsx", import.meta.url), "utf8");
  assert.equal(fonte.match(/onClick=\{\(\) => abrirFotos\(prop\)\}/g)?.length, 2);
  assert.match(fonte, /<PhotoViewer /);
});
