// Vitrine e ficha do cliente (28/10/2026, Sidney): "a descrição tem '...' e clica e não abre o que tem escrito" · "na ficha do
// cliente que manda o link é bom ter a descrição do imóvel" · "no link, a imagem também clica e não vai".
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AVISO_CONTATO, descricaoSemContato } from "../src/lib/descricao-sem-contato";
import { whiteLabelHtml, whiteLabelText } from "../src/lib/white-label";
import DescricaoDoImovel from "../src/components/DescricaoDoImovel";
import FichaFotos from "../src/components/FichaFotos";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("🔴 a descrição na ficha white-label vai sem o contato direto do captador; preço, CEP e área ficam", () => {
  const texto = "Casa ampla. Ligue (11) 98765-4321 ou 3456-7890, joao@imob.com.br, https://imob.com/casa e wa.me/5511987654321. Valor R$ 1.200.000, CEP 01310-100, 120 m², 3 quartos.";
  const limpo = descricaoSemContato(texto);
  assert.doesNotMatch(limpo, /98765|3456-7890|joao@|imob\.com|wa\.me/);
  assert.match(limpo, new RegExp(AVISO_CONTATO.replace(/[()]/g, "\\$&")));
  assert.match(limpo, /R\$ 1\.200\.000/);
  assert.match(limpo, /01310-100/);
  assert.match(limpo, /120 m², 3 quartos/);
  assert.equal(descricaoSemContato(null), "");
});

const imovel = { title: "Casa <Jardim>", city: "Santos", neighborhood: "Gonzaga", salePrice: "900000", propertyType: "Casa", bedrooms: 3, bathrooms: 2,
  parkingSpots: 2, areaM2: "150", coverPhoto: null, photos: [], description: "Varanda gourmet & piscina.\nFale com 11 98765-4321." };
const corretor = { name: "Ana", creci: "123", whatsapp: "11911112222", avatar: "" };

test("🔴 o texto copiado e a impressão da ficha levam a descrição (sem contato; escapada no HTML)", () => {
  const texto = whiteLabelText(imovel, corretor);
  assert.match(texto, /Varanda gourmet & piscina\./);
  assert.doesNotMatch(texto, /98765/);
  const html = whiteLabelHtml(imovel, corretor);
  assert.match(html, /<p style="white-space:pre-line">Varanda gourmet &amp; piscina\./);
  assert.doesNotMatch(html, /98765/);
});

test("🔴 a descrição longa no cartão da Vitrine abre com 'Ler mais'; a curta não tem botão", () => {
  const longa = renderToStaticMarkup(createElement(DescricaoDoImovel, { texto: "x".repeat(200) }));
  assert.match(longa, /line-clamp-2/);
  assert.match(longa, /aria-expanded="false"[^>]*>Ler mais</);
  const curta = renderToStaticMarkup(createElement(DescricaoDoImovel, { texto: "Casa boa." }));
  assert.doesNotMatch(curta, /Ler mais/);
  const vitrine = ler("src/components/PropertyMarketplace.tsx");
  assert.match(vitrine, /<DescricaoDoImovel texto=\{prop\.description\} \/>/, "o cartão usa a descrição que abre");
});

test("🔴 na ficha pública todas as fotos abrem a galeria: capa e miniaturas são botões", () => {
  const html = renderToStaticMarkup(createElement(FichaFotos, { fotos: ["https://x/a.jpg", "https://x/b.jpg", "https://x/c.jpg"], titulo: "Casa" }));
  assert.equal((html.match(/<button/g) ?? []).length, 3, "capa + 2 miniaturas clicáveis");
  assert.match(html, /aria-label="Ver as fotos de Casa"/);
  assert.match(html, /3 fotos/);
  const pagina = ler("src/app/ficha/[token]/page.tsx");
  assert.match(pagina, /<FichaFotos fotos=\{fotos\} titulo=\{prop\.title\} \/>/);
  assert.match(pagina, /const assinadas = await signPhotos\(ordem\)/, "todas as fotos, assinadas numa chamada");
  assert.doesNotMatch(pagina, /\.slice\(0, 8\)/, "sem o teto antigo de 8 fotos");
  assert.match(pagina, /const descricao = descricaoSemContato\(prop\.description\)/, "a descrição vai, sem contato");
});
