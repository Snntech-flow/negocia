import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { janelaSaiuDoHistorico } from "../src/lib/use-voltar-fecha";
import BotaoFechar from "../src/components/BotaoFechar";

test("voltar no histórico fecha a janela cuja entrada saiu — e só ela (janelas empilhadas)", () => {
  assert.equal(janelaSaiuDoHistorico(undefined, 1), true);   // voltou para a tela sem janela
  assert.equal(janelaSaiuDoHistorico(3, 4), true);           // a de cima (4) saiu
  assert.equal(janelaSaiuDoHistorico(3, 3), false);          // a de baixo (3) continua aberta
  assert.equal(janelaSaiuDoHistorico(5, 3), false);          // ir para frente não fecha
});

test("🔴 o X de fechar tem cores fixas (o tema não apaga) e nome para o leitor de tela", () => {
  const html = renderToStaticMarkup(createElement(BotaoFechar, { onClick: () => undefined, rotulo: "Fechar ficha" }));
  assert.match(html, /aria-label="Fechar ficha"/);
  assert.match(html, /text-\[#083858\]/);
  assert.match(html, /bg-\[#ffffff\]/);
  assert.doesNotMatch(html, /text-slate-/);
});

test("🔴 toda janela (fixed inset-0) tem o X padrão e fecha com voltar/Esc", () => {
  const pasta = new URL("../src/components/", import.meta.url);
  // Galeria: X próprio em cores fixas sobre fundo preto. Confirmação e aviso de cobrança: X, mas sem entrada no
  // histórico (a confirmação é uma pergunta; o aviso abre sozinho no login).
  const xProprio = new Set(["PhotoViewer.tsx"]);
  const semHistorico = new Set(["DialogHost.tsx", "BillingPopup.tsx"]);
  const janelas = readdirSync(pasta).filter((f) => f.endsWith(".tsx") && readFileSync(new URL(f, pasta), "utf8").includes("fixed inset-0"));
  assert.ok(janelas.length >= 9, `janelas achadas: ${janelas.join(", ")}`);
  for (const arquivo of janelas) {
    const fonte = readFileSync(new URL(arquivo, pasta), "utf8");
    const qtd = fonte.split("fixed inset-0").length - 1;
    if (!xProprio.has(arquivo)) assert.ok((fonte.split("<BotaoFechar").length - 1) >= qtd, `${arquivo}: ${qtd} janela(s) sem o X padrão`);
    if (!semHistorico.has(arquivo)) assert.ok((fonte.split("useVoltarFecha(").length - 1) >= qtd, `${arquivo}: janela sem voltar/Esc`);
  }
});

test("🔴 janela que rola não corta o topo: centralizar com items-center exige my-auto no conteúdo (a ficha perdia o topo)", () => {
  const pasta = new URL("../src/components/", import.meta.url);
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith(".tsx"))) {
    const fonte = readFileSync(new URL(arquivo, pasta), "utf8");
    for (const m of fonte.matchAll(/className="fixed inset-0[^"]*overflow-y-auto[^"]*"/g)) {
      if (!/\bitems-center\b/.test(m[0])) continue;
      const seguinte = fonte.slice(m.index! + m[0].length, m.index! + m[0].length + 600);
      assert.match(seguinte, /className="[^"]*\bmy-auto\b/, `${arquivo}: janela centralizada sem my-auto no conteúdo`);
    }
  }
  const ficha = readFileSync(new URL("WhiteLabelSheet.tsx", pasta), "utf8");
  assert.match(ficha, /className="my-auto w-full max-w-xl/);
});
