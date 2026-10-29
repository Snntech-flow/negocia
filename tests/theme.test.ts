import assert from "node:assert/strict";
import test from "node:test";
import { THEME_BOOT_SCRIPT, THEME_CHOICES } from "../src/lib/theme";

// Roda o script do <head> com um navegador de mentira: ele decide o tema antes de a página aparecer.
function boot(stored: string | null | Error, systemDark = false) {
  const attributes: Record<string, string> = {};
  const window = {
    localStorage: { getItem: () => { if (stored instanceof Error) throw stored; return stored; } },
    matchMedia: () => ({ matches: systemDark }),
  };
  const document = { documentElement: { setAttribute: (name: string, value: string) => { attributes[name] = value; } } };
  new Function("window", "document", "localStorage", THEME_BOOT_SCRIPT)(window, document, window.localStorage);
  return attributes["data-tema"];
}

test("script do tema: claro por padrão, escuro escolhido, e falha sem quebrar", () => {
  assert.equal(boot(null), "claro");
  assert.equal(boot("qualquer coisa"), "claro");
  assert.equal(boot("escuro"), "escuro");
  assert.equal(boot("claro", true), "claro");
  assert.equal(boot(new Error("armazenamento bloqueado")), undefined, "sem acesso ao armazenamento, a página segue no claro (CSS padrão)");
});

// 28/10/2026, Sidney: "tirar esse Automático, 97% das vezes vai ser claro". Quem o tinha escolhido vê o claro, mesmo com o
// aparelho no escuro, e o seletor só oferece Claro e Escuro.
test("🔴 sem o tema Automático: só Claro e Escuro, e a escolha antiga 'automatico' vira claro", () => {
  assert.equal(boot("automatico", true), "claro");
  assert.equal(boot(null, true), "claro", "aparelho no escuro não muda nada");
  assert.deepEqual(THEME_CHOICES.map((opcao) => opcao.label), ["Claro", "Escuro"]);
});

// Vídeo da corretora piloto (11/10/2026), simulador de amortização: a área logada pinta bg-slate-900 de BRANCO e text-white
// de azul-escuro (globals.css) — a opção escolhida ("Reduzir prazo") ficava branca, igual à não escolhida, e parecia que o
// clique marcava a outra. Botão de escolha (aria-pressed) não pode depender dessas classes para mostrar o que está marcado.
test("botões de escolha (aria-pressed) não usam as classes que o tema da área logada reescreve", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dir = join(__dirname, "..", "src", "components");
  const culpados: string[] = [];
  for (const nome of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    for (const trecho of readFileSync(join(dir, nome), "utf8").split(/<button\b/).slice(1)) {
      // A tag de abertura termina no ">" FORA de chaves: o "=>" de onClick={() => …} não fecha a tag (o guard lia só até
      // ali e passava por sorte, sem ver o className — sabotado em 11/10).
      let fim = 0;
      for (let i = 0, prof = 0; i < trecho.length; i++) {
        const c = trecho[i];
        if (c === "{") prof++;
        else if (c === "}") prof--;
        else if (c === ">" && prof === 0) { fim = i; break; }
      }
      const tag = trecho.slice(0, fim + 1);
      // Só as classes PURAS que o tema reescreve: "hover:text-white" o tema trata (texto azul no hover) e não é o problema.
      if (/aria-pressed/.test(tag) && /(^|[\s"'`{])(bg-slate-900|text-white)(?=[\s"'`}]|$)/.test(tag)) culpados.push(nome);
    }
  }
  assert.deepEqual(culpados, []);
});
