// Painel de notificações (sino), 28/10/2026 — Sidney: "essas notificações poderiam ser na cor laranja padrão do site? Estamos
// achando esse branco muito fraco. E como é notificação, tem que chamar mais a atenção e ser melhor para ler." Depois, a
// corretora piloto: o quadro laranja "ficou muito chamativo" — volta o azul de antes e a letra, que era branca, fica laranja.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
const painel = app.slice(app.indexOf("data-painel-notificacoes"), app.indexOf('<div className="relative" data-header-popover="">\n              <button type="button" onClick={() => { setIsUserSwitcherOpen('));

test("🔴 o painel de notificações é azul-marinho com a letra laranja", () => {
  assert.ok(painel.length > 500, "achei o painel");
  assert.match(painel, /^data-painel-notificacoes="" className="[^"]*bg-\[#083858\] text-\[#f59e0b\]/);
  assert.match(painel, /notif\.read \? "bg-\[#083858\][^"]*" : "bg-\[#0d4a72\] border-l-4 border-\[#f59e0b\]/, "lida: azul; não lida: azul um tom acima com faixa laranja");
  assert.match(painel, /<span className="text-sm font-bold text-\[#f59e0b\] flex items-center gap-1\.5">\{!notif\.read/, "título laranja");
  assert.match(painel, /<p className="text-\[13px\] font-medium text-\[#fbbf24\] leading-relaxed">\{notif\.message\}<\/p>/, "mensagem laranja-claro");
  assert.doesNotMatch(painel, /bg-\[#f59e0b\] text-\[#083858\]|bg-\[#fcd34d\]/, "o quadro laranja saiu");
});

test("🔴 nada no painel usa as classes que o tema do cabeçalho repinta de branco, nem transparência", () => {
  // globals.css: no cabeçalho, [class*="text-slate-"] e .text-white viram branco e [class*="bg-slate-"] vira azul.
  assert.doesNotMatch(painel, /(?:text|bg|border|divide)-slate-|text-white|text-amber-|bg-amber-|opacity-\d/);
});
