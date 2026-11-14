import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Menu da área logada (28/10/2026). A barra de abas abertas (estilo Flow, 15/10) saiu — pedido das corretoras: "por ser tão
// pouco não precisaria ter". O menu leva a cada tela e o voltar do navegador volta para a anterior.
test("🔴 sem a barra de abas: nada de abas abertas, X de fechar aba ou memória de abas", () => {
  const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /role="tablist"|Telas abertas|Fechar a aba|abasAbertas|negocialar-abas/);
  assert.match(app, /const pathname = usePathname\(\)/, "a tela atual (laranja no menu) vem da URL");
});

// 28/10/2026, Sidney: "clico em Documentos e a Vitrine continua laranja".
test("🔴 laranja só na tela atual: o menu aberto de outra seção não é pintado de laranja (claro e escuro)", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const regrasDoMenuAberto = css.split("\n").filter((linha) => linha.includes("details[open]"));
  assert.equal(regrasDoMenuAberto.length, 2, "uma regra no claro, uma no escuro");
  for (const regra of regrasDoMenuAberto) {
    assert.match(regra, /details\[open\]:not\(\[data-ativa\]\) > summary/, "a regra vale só para o menu de OUTRA seção");
    assert.doesNotMatch(regra, /background-color: #f59e0b/, "o fundo do menu aberto não é laranja");
    assert.match(regra, /box-shadow: inset 0 0 0 2px #f59e0b/, "o menu aberto ganha só um contorno laranja");
  }
  const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
  assert.match(app, /data-ativa=\{activeTab && menu\.active\.includes\(activeTab\) \? "" : undefined\}/, "o menu da seção atual é marcado");
});

// 28/10/2026, Sidney: "a aba CRM tem o funil e o Atendimento tem o mesmo funil, então o módulo de Atendimento não se faz
// necessário". Era a mesma tela do CRM aberta na aba Funil; o endereço antigo leva ao CRM já no Funil.
test("🔴 sem o menu Atendimento: o endereço antigo cai no CRM já no Funil", () => {
  const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /title: "Atendimento"|"atendimento"/, "nenhum menu, aba ou rótulo de Atendimento");
  const antiga = readFileSync(new URL("../src/app/(app)/atendimento/page.tsx", import.meta.url), "utf8");
  assert.match(antiga, /redirect\("\/crm\?visao=funil"\)/);
  const crm = readFileSync(new URL("../src/app/(app)/crm/page.tsx", import.meta.url), "utf8");
  assert.match(crm, /initialView=\{visao === "funil" \? "pipeline" : "overview"\}/);
});

// 28/10/2026, Sidney: "esse Editar, Disponível e Arquivar pode se manter alinhado aos outros" — no imóvel de título comprido
// os botões desciam para a linha de baixo (flex-wrap) e saíam do alinhamento dos outros cartões.
test("🔴 em Meus imóveis os botões ficam à direita em todo cartão; o título comprido quebra linha", () => {
  const inventario = readFileSync(new URL("../src/components/PropertyInventory.tsx", import.meta.url), "utf8");
  assert.match(inventario, /<article key=\{property\.id\} className="flex flex-col gap-3 [^"]*sm:flex-row sm:items-center sm:justify-between">/);
  assert.match(inventario, /<div className="min-w-0 flex-1"><h3 className="font-bold text-slate-900">\{property\.title\}<\/h3>/);
  assert.match(inventario, /<div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap"><button disabled=\{busy\} type="button" onClick=\{\(\) => \{ setEditing\(property\);/);
});

test("🔴 o seletor da situação em Meus imóveis abraça a opção escolhida, sem a largura de 'Em negociação'", () => {
  const inventario = readFileSync(new URL("../src/components/PropertyInventory.tsx", import.meta.url), "utf8");
  const inicio = inventario.indexOf('aria-label={t("Status: {0}", [property.title])}');
  assert.ok(inicio > 0, "achei o seletor da situação");
  const seletor = inventario.slice(inicio, inventario.indexOf("{PROPERTY_STATUSES.map(value =>", inicio));
  assert.match(seletor, /className="rounded-lg border border-slate-300 py-2 pl-2\.5 pr-1\.5 text-sm \[field-sizing:content\]">$/);
});

// 14/11/2026, corretoras: "para os desatentos… tem que descer para cadastrar o imóvel" — o cadastro vinha abaixo da carteira.
test("🔴 Imóveis tem duas telas: Cadastrar imóvel abre no formulário e Meus imóveis mostra só a carteira", () => {
  const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const app = ler("src/components/app-shell/AppShellClient.tsx");
  assert.match(app, /title: "Imóveis", active: \["cadastrar", "meus-imoveis"\], items: \[\{ id: "cadastrar", label: "Cadastrar imóvel"[^}]*\}, \{ id: "meus-imoveis", label: "Meus imóveis"/, "Cadastrar vem primeiro no menu");
  const cadastro = ler("src/components/app-shell/CadastrarRouteClient.tsx");
  assert.match(cadastro, /<PropertyCreateForm /);
  assert.doesNotMatch(cadastro, /PropertyInventory/, "nada de carteira em cima do formulário");
  assert.match(cadastro, /router\.push\("\/meus-imoveis\?publicado=1"\)/, "depois de cadastrar, a corretora vê o anúncio na carteira");
  const carteira = ler("src/components/app-shell/MeusImoveisRouteClient.tsx");
  assert.match(carteira, /<PropertyInventory /);
  assert.doesNotMatch(carteira, /PropertyCreateForm/);
  assert.match(carteira, /<Link href="\/cadastrar"/, "a carteira leva ao cadastro por um botão no topo");
  assert.match(ler("src/app/(app)/cadastrar/page.tsx"), /redirect\(`\/meus-imoveis\?imovel=\$\{imovel\}`\)/, "o endereço antigo de edição segue valendo");
  assert.match(ler("src/components/app-shell/VitrineRouteClient.tsx"), /router\.push\(`\/meus-imoveis\?imovel=\$\{property\.id\}`\)/);
});
