// Banner de abertura da página inicial (31/10/2026, Sidney: "tem como colocar essa imagem no Negocialar? vai ficar parecido com
// essa"). O texto está dentro da imagem.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pagina = readFileSync(new URL("../src/components/LandingPage.tsx", import.meta.url), "utf8");

test("🔴 o banner fica logo abaixo do menu, de ponta a ponta, antes da abertura", () => {
  const banner = pagina.indexOf('<Image src="/banner-parcerias.webp"');
  assert.ok(banner > pagina.indexOf('id="menu-celular"') && banner < pagina.indexOf("<h1"), "entre o menu e o título da abertura");
  assert.match(pagina, /<Image src="\/banner-parcerias\.webp" width=\{1600\} height=\{639\} priority/);
  assert.match(pagina, /alt="Encontre o imóvel ideal para seu cliente\. Mais do que uma rede de parcerias, uma decolagem em suas vendas\. Venda muito mais!/, "o texto da imagem também vai no alt");
});

test("🔴 no celular o banner é cortado no lado do texto, numa altura em que a letra dá para ler", () => {
  assert.match(pagina, /className="h-\[260px\] w-full object-cover object-left sm:h-auto"/);
});

test("a imagem está no projeto (WebP, 1600 × 639)", () => {
  const arquivo = readFileSync(new URL("../public/banner-parcerias.webp", import.meta.url));
  assert.equal(arquivo.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(arquivo.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(arquivo.length > 50_000);
});
