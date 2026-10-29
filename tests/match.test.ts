// Botão "Match" do cabeçalho (28/10/2026) — Sidney: "toda vez que tivesse um match ele ficava vermelho, e dentro dele os
// matches; quando entrasse aparecia 'você já tem 8 matches', pro corretor ver que funciona".
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { frasePrincipalDoMatch, montarMeusMatches, type ImovelDoMatch, type PerfilDoMatch } from "../src/lib/meus-matches";
import { BotaoDoMatch, PainelDoMatch } from "../src/components/app-shell/MatchVisual";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const EU = id(1), CORRETOR_B = id(2), CORRETOR_C = id(3);

const imovel = (n: number, dono: string, nomeDoDono: string, preco: string, criado: string): ImovelDoMatch => ({
  id: id(100 + n), title: `Apartamento ${n}`, propertyType: "Apartamento", city: "Salvador", neighborhood: "Barra",
  salePrice: preco, bedrooms: 3, parkingSpots: 1, purpose: "venda", acceptsPartnership: true, status: "disponivel",
  broker: { id: dono, name: nomeDoDono, verificationStatus: "aprovado" }, foto: null, createdAt: criado,
});
const procura = (n: number, dono: string, nomeDoDono: string, cliente: string, criado: string): PerfilDoMatch => ({
  id: id(200 + n), clientInternalName: cliente, propertyType: "Apartamento", city: "Salvador", neighborhoods: ["Barra"],
  maxBudget: "500000", minBedrooms: 2, minParkingSpots: 1, broker: { id: dono, name: nomeDoDono }, createdAt: criado,
});

test("🔴 só entram os matches do corretor; o novo vem primeiro; o cliente do parceiro não tem nome", () => {
  const minhaProcura = procura(1, EU, "Eu", "Vitória Machado", "2026-10-20T10:00:00Z");
  const procuraDoB = procura(2, CORRETOR_B, "Ana", "Cliente parceiro", "2026-10-21T10:00:00Z");
  const imovelDoB = imovel(1, CORRETOR_B, "Ana", "450000", "2026-10-27T10:00:00Z");
  const imovelDoBCaro = imovel(2, CORRETOR_B, "Ana", "900000", "2026-10-27T10:00:00Z");
  const meuImovel = imovel(3, EU, "Eu", "480000", "2026-10-22T10:00:00Z");
  const imovelDoC = imovel(4, CORRETOR_C, "Bia", "400000", "2026-10-28T10:00:00Z");
  const matches = montarMeusMatches({
    meuId: EU,
    meusPerfis: [minhaProcura],
    imoveisDaRede: [imovelDoB, imovelDoBCaro, imovelDoC],
    meusImoveis: [meuImovel],
    // A procura do B também casa com o imóvel do C — esse par não é do corretor e não entra.
    perfisDaRede: [procuraDoB],
    vistos: new Set([`${procuraDoB.id}:${meuImovel.id}`]),
  });
  assert.deepEqual(matches.map((m) => [m.lado, m.cliente, m.imovel.title, m.novo]), [
    ["meu_cliente", "Vitória Machado", "Apartamento 4", true],
    ["meu_cliente", "Vitória Machado", "Apartamento 1", true],
    ["meu_imovel", "Cliente de Ana", "Apartamento 3", false],
  ]);
  assert.equal(matches[0].outroCorretor, "Bia", "no meu cliente, o outro é o captador");
  assert.equal(matches[2].outroCorretor, "Ana", "no meu imóvel, o outro é o corretor do cliente");
  assert.ok(!matches.some((m) => m.imovelId === imovelDoBCaro.id), "acima do orçamento não é match");
});

test("a frase de cima: 'Você já tem 8 matches', '1 match' e zero sem número inventado", () => {
  assert.equal(frasePrincipalDoMatch(8), "Você já tem 8 matches");
  assert.equal(frasePrincipalDoMatch(1), "Você já tem 1 match");
  assert.equal(frasePrincipalDoMatch(0), "Você ainda não tem match");
});

// Laranja, não vermelho (Sidney, 28/10/2026: "tem como pôr o laranja ao invés do vermelho?").
test("🔴 o botão fica laranja com o número quando há match novo; sem novo, fica azul", () => {
  const laranja = renderToStaticMarkup(createElement(BotaoDoMatch, { novos: 3, aberto: false, onClick: () => {} }));
  assert.match(laranja, /bg-\[#f59e0b\] text-\[#083858\]/);
  assert.doesNotMatch(laranja, /#dc2626|#b91c1c/, "nada de vermelho no botão");
  assert.match(laranja, />3<\/span>/);
  assert.match(laranja, /aria-label="Match: 3 novos"/);
  const azul = renderToStaticMarkup(createElement(BotaoDoMatch, { novos: 0, aberto: false, onClick: () => {} }));
  assert.doesNotMatch(azul, /#f59e0b/);
});

test("🔴 o painel abre com 'Você já tem N matches', o selo NOVO e, sem match, o caminho para o primeiro", () => {
  const matches = montarMeusMatches({
    meuId: EU, meusPerfis: [procura(1, EU, "Eu", "Vitória", "2026-10-20T10:00:00Z")],
    imoveisDaRede: [imovel(1, CORRETOR_B, "Ana", "450000", "2026-10-27T10:00:00Z"), imovel(2, CORRETOR_B, "Ana", "460000", "2026-10-26T10:00:00Z")],
    meusImoveis: [], perfisDaRede: [], vistos: new Set([`${id(201)}:${id(102)}`]),
  });
  const cheio = renderToStaticMarkup(createElement(PainelDoMatch, { estado: { tipo: "pronto", podeVerARede: true, matches }, onIr: () => {} }));
  assert.match(cheio, /Você já tem 2 matches/);
  assert.equal((cheio.match(/>NOVO</g) ?? []).length, 1);
  assert.match(cheio, /Seu cliente: Vitória/);
  const vazio = renderToStaticMarkup(createElement(PainelDoMatch, { estado: { tipo: "pronto", podeVerARede: true, matches: [] }, onIr: () => {} }));
  assert.match(vazio, /Você ainda não tem match/);
  assert.match(vazio, /Cadastrar o que meu cliente procura/);
  const semRede = renderToStaticMarkup(createElement(PainelDoMatch, { estado: { tipo: "pronto", podeVerARede: false, matches: [] }, onIr: () => {} }));
  assert.match(semRede, /CRECI aprovado e a assinatura em dia/);
});

test("🔴 travas do servidor: vistos no banco com acesso só do servidor, só o match do corretor vira visto, o nome do cliente do parceiro nem é lido", () => {
  const migration = ler("supabase/migrations/20261028230000_seen_matches.sql");
  assert.match(migration, /create table if not exists public\.seen_matches/);
  assert.match(migration, /primary key \(user_id, buyer_profile_id, property_id\)/);
  assert.match(migration, /alter table public\.seen_matches enable row level security;/);
  assert.match(migration, /create policy "deny browser api access" on public\.seen_matches/);
  const acao = ler("src/lib/actions/matches.ts");
  assert.match(acao, /const \{ matches \} = await carregarMeusMatches\(actor, \{ comFotos: false \}\);/, "recalcula os matches do corretor");
  assert.match(acao, /const match = doCorretor\.get\(chave\);/, "a chave vinda da tela não basta");
  const consulta = ler("src/lib/queries/matches.ts");
  assert.match(consulta, /clientInternalName: doCorretor \? buyerProfiles\.clientInternalName : sql<string>`'Cliente parceiro'`/);
  assert.match(consulta, /usuario\.verificationStatus === "aprovado" && hasSubscriptionAccess\(/, "mesmo alcance da Vitrine");
});

test("🔴 o match sai do sino: não vira mais aviso e os antigos não aparecem", () => {
  assert.doesNotMatch(ler("src/lib/actions/property.ts"), /ai_match/);
  assert.match(ler("src/lib/queries/marketplace.ts"), /ne\(notifications\.type, "ai_match"\)/);
  const layout = ler("src/app/(app)/layout.tsx");
  assert.match(layout, /novosMatches=\{novosMatches\}/);
  assert.match(ler("src/components/app-shell/AppShellClient.tsx"), /<BotaoMatch key=\{novosMatches\} novosIniciais=\{novosMatches\} \/>/);
});
