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
