import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { abasGuardadas, abrirAba, fecharAba, mostrarBarraDeAbas } from "../src/lib/abas";

test("abrir aba: entra no fim, sem repetir", () => {
  assert.deepEqual(abrirAba(["vitrine"], "crm"), ["vitrine", "crm"]);
  assert.deepEqual(abrirAba(["vitrine", "crm"], "crm"), ["vitrine", "crm"]);
});

test("🔴 fechar aba: a ativa leva para a última que sobrou; outra aba não muda a ativa; a Vitrine não fecha", () => {
  assert.deepEqual(fecharAba(["vitrine", "crm", "dvp"], "dvp", "dvp", "vitrine"), { abertas: ["vitrine", "crm"], ativa: "crm" });
  assert.deepEqual(fecharAba(["vitrine", "crm", "dvp"], "crm", "dvp", "vitrine"), { abertas: ["vitrine", "dvp"], ativa: "dvp" });
  assert.deepEqual(fecharAba(["vitrine", "crm"], "crm", "crm", "vitrine"), { abertas: ["vitrine"], ativa: "vitrine" });
  assert.deepEqual(fecharAba(["vitrine", "crm"], "vitrine", "vitrine", "vitrine"), { abertas: ["vitrine", "crm"], ativa: "vitrine" });
  assert.deepEqual(fecharAba(["vitrine"], "crm", "vitrine", "vitrine"), { abertas: ["vitrine"], ativa: "vitrine" });
});

test("abas guardadas (recarregar a página): só as permitidas, sem repetir, Vitrine na frente; lixo vira só a Vitrine", () => {
  const permitidas = ["vitrine", "crm", "dvp"] as const;
  assert.deepEqual(abasGuardadas(["dvp", "admin", "crm", "dvp", "vitrine"], permitidas, "vitrine"), ["vitrine", "dvp", "crm"]);
  assert.deepEqual(abasGuardadas("lixo", permitidas, "vitrine"), ["vitrine"]);
  assert.deepEqual(abasGuardadas(null, permitidas, "vitrine"), ["vitrine"]);
});

// 28/10/2026: lia o NegociaLarApp.tsx, aposentado em 26/10 (0c33834) — o teste dava ENOENT e não conferia mais nada. A barra
// mora no AppShellClient; cada aba é uma ROTA (a ativa vem da URL), então o pushState próprio da aba saiu.
test("🔴 a barra de abas existe no app, com X em cada aba que não é a Vitrine, e cada aba é uma rota", () => {
  const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
  assert.match(app, /role="tablist" aria-label="Telas abertas"/);
  assert.match(app, /aria-label=\{`Fechar a aba \$\{TAB_LABELS\[aba\]\}`\}/);
  assert.match(app, /aba !== "vitrine" && <button/);
  assert.match(app, /href=\{href\(aba\)\}/, "a aba leva à rota dela");
  assert.match(app, /const pathname = usePathname\(\)/, "a aba ativa vem da URL");
});

// 28/10/2026, Sidney: "por que aparece duas vezes o nome Vitrine?" · "clico em Documentos e a Vitrine continua laranja".
test("🔴 a barra de abas só aparece com 2 telas abertas ou mais (a Vitrine sozinha repetia o menu)", () => {
  assert.equal(mostrarBarraDeAbas(["vitrine"]), false);
  assert.equal(mostrarBarraDeAbas(["vitrine", "crm"]), true);
  const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
  assert.match(app, /\{mostrarBarraDeAbas\(abasAbertas\) && <div role="tablist" aria-label="Telas abertas"/);
});

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
