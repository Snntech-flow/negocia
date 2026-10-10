import assert from "node:assert/strict";
import test from "node:test";
import { THEME_BOOT_SCRIPT } from "../src/lib/theme";

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

test("script do tema: claro por padrão, escuro escolhido, automático segue o aparelho e falha sem quebrar", () => {
  assert.equal(boot(null), "claro");
  assert.equal(boot("qualquer coisa"), "claro");
  assert.equal(boot("escuro"), "escuro");
  assert.equal(boot("claro", true), "claro");
  assert.equal(boot("automatico", true), "escuro");
  assert.equal(boot("automatico", false), "claro");
  assert.equal(boot(new Error("armazenamento bloqueado")), undefined, "sem acesso ao armazenamento, a página segue no claro (CSS padrão)");
});
