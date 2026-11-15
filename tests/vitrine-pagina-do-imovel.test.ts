// A página do imóvel na Vitrine (/vitrine/<id>, 14/11/2026 — Sidney: "pode deixar o que temos já, mas quando clicar na foto
// abrisse em outra página"). A garantia mora no servidor: a página busca o imóvel com o MESMO recorte de acesso e os MESMOS
// campos da lista — quem não vê o imóvel na Vitrine também não o abre pelo endereço, e o que é só do dono continua escondido.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const consultas = ler("src/lib/queries/marketplace.ts");
const funcao = consultas.slice(consultas.indexOf("export async function getVitrineProperty"));

test("🔴 servidor: o imóvel da página sai com o recorte de acesso da Vitrine e o id pedido — nunca só pelo id", () => {
  assert.match(funcao, /loadWorkspaceContext\(\{ section: "vitrine" \}\)/);
  assert.match(funcao, /\.where\(and\(ctx\.filteredPropertyScope, eq\(properties\.id, id\)\)\)/);
  assert.match(funcao, /if \(!ctx\) return null;/, "sem sessão não busca nada");
  assert.match(funcao, /if \(!UUID\.test\(id\)\) return null;/, "id que não é uuid não chega ao banco");
  assert.match(funcao, /assinarFotosDeImoveis\(\[imovel\]\)/, "fotos privadas saem assinadas, depois do filtro");
});

test("🔴 servidor: a página e a lista usam os MESMOS campos — o endereço e o proprietário só para o dono", () => {
  assert.match(funcao, /select\(camposDoImovelDaVitrine\(ctx\.ownsProperty\)\)/);
  assert.match(consultas, /const propertyListQuery = includeProperties \? db\s*\.select\(camposDoImovelDaVitrine\(ownsProperty\)\)/);
  const campos = consultas.slice(consultas.indexOf("function camposDoImovelDaVitrine"), consultas.indexOf("export async function getMarketplaceData"));
  for (const campo of ["cep", "street", "streetNumber", "block", "floor", "condoName", "confidentialAddress", "ownerName", "ownerPhone"]) {
    assert.match(campos, new RegExp(`${campo}: sql<string \\| null>\`CASE WHEN \\$\\{ownsProperty\\} THEN \\$\\{properties\\.${campo}\\} ELSE NULL END\``), `${campo} só para o dono`);
  }
});

test("🔴 página: sem sessão vai à entrada; imóvel fora do alcance responde 404", () => {
  const pagina = ler("src/app/(app)/vitrine/[id]/page.tsx");
  assert.match(pagina, /if \(!\(await getCurrentUserId\(\)\)\) redirect\("\/"\);/);
  assert.match(pagina, /const achado = await getVitrineProperty\(id\);\s*if \(!achado\) notFound\(\);/);
});

test("tela: a foto do cartão leva à página do imóvel; o \"Ver N fotos\" segue abrindo a galeria", () => {
  const cartao = ler("src/components/PropertyMarketplace.tsx");
  assert.match(cartao, /<Link href=\{`\/vitrine\/\$\{prop\.id\}`\}/);
  assert.match(cartao, /<button type="button" onClick=\{\(\) => abrirFotos\(prop\)\}[^>]*>\s*<ImageIcon/);
});

test("tela: o cartão é o resumo (foto, local, título, preço, descrição); características, itens, captador e ações só na página", () => {
  // ⚖️ 14/11/2026 (Sidney, print da parte de baixo do cartão: "eu deixaria essa parte nos detalhes" → "Tudo da imagem").
  const cartao = ler("src/components/PropertyMarketplace.tsx");
  assert.match(cartao, /<Link href=\{`\/vitrine\/\$\{prop\.id\}`\} className="hover:underline">\{prop\.title\}<\/Link>/, "o título também leva à página");
  for (const fora of ["Agendar visita", "Ficha para o cliente", "Editar em Meus imóveis", "CRECI verificado", "<Avatar", "prop.bedrooms", "prop.privateAmenities"]) {
    assert.ok(!cartao.includes(fora), `"${fora}" saiu do cartão`);
  }
  const pagina = ler("src/components/ImovelDaVitrine.tsx");
  for (const dentro of ["Agendar visita", "Ficha para o cliente", "Editar em Meus imóveis", "CRECI verificado", "<Avatar", "prop.bedrooms", "prop.privateAmenities"]) {
    assert.ok(pagina.includes(dentro), `"${dentro}" está na página do imóvel`);
  }
});
