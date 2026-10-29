// Miniatura da foto recém-enviada (29/10/2026) — corretora piloto: "erro ao carregar foto". Fotos e planta apareciam quebradas
// no formulário logo depois do envio: o envio devolve o CAMINHO no bucket privado, e a grade usava o caminho como endereço.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PhotoGrid from "../src/components/PhotoGrid";
import { enderecoParaExibir, registrarPrevia } from "../src/lib/foto-previa";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("🔴 a foto recém-enviada aparece pela prévia assinada; foto já assinada e link externo passam direto", () => {
  const caminho = "11111111-1111-4111-8111-111111111111/abc.jpg";
  const assinada = "https://x.supabase.co/storage/v1/object/sign/imoveis/11111111-1111-4111-8111-111111111111/abc.jpg?token=t";
  registrarPrevia(caminho, assinada);
  assert.equal(enderecoParaExibir(caminho), assinada);
  assert.equal(enderecoParaExibir("https://exemplo.com/foto.jpg"), "https://exemplo.com/foto.jpg");
  const html = renderToStaticMarkup(createElement(PhotoGrid, { fotos: [caminho, "https://exemplo.com/foto.jpg"], onChange: () => {} }));
  assert.match(html, /<img src="https:\/\/x\.supabase\.co\/storage\/v1\/object\/sign\/imoveis\/[^"]+token=t"/);
  assert.doesNotMatch(html, /<img src="11111111-/, "o caminho cru não vai para a <img>");
});

test("🔴 o envio devolve o caminho para gravar e a prévia assinada para mostrar; o envio registra a prévia", () => {
  const acao = ler("src/lib/actions/photos.ts");
  assert.match(acao, /const previa = \(await signPhotos\(\[caminho\]\)\.catch\(\(\) => new Map<string, string>\(\)\)\)\.get\(caminho\) \?\? null;\n\s*return \{ url: caminho, previa \};/);
  const envio = ler("src/components/PhotoUploader.tsx");
  assert.match(envio, /if \(enviada\.previa\) registrarPrevia\(enviada\.url, enviada\.previa\);\n\s*urls\.push\(enviada\.url\);/);
});
