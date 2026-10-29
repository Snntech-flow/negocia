// Painel de notificações (sino), 28/10/2026 — Sidney: "essas notificações poderiam ser na cor laranja padrão do site? Estamos
// achando esse branco muito fraco. E como é notificação, tem que chamar mais a atenção e ser melhor para ler."
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/app-shell/AppShellClient.tsx", import.meta.url), "utf8");
const painel = app.slice(app.indexOf("data-painel-notificacoes"), app.indexOf('<div className="relative" data-header-popover="">\n              <button type="button" onClick={() => { setIsUserSwitcherOpen('));

test("🔴 o painel de notificações é laranja do site com texto azul-marinho", () => {
  assert.ok(painel.length > 500, "achei o painel");
  assert.match(painel, /^data-painel-notificacoes="" className="[^"]*bg-\[#f59e0b\] text-\[#083858\]/);
  assert.match(painel, /notif\.read \? "bg-\[#fcd34d\][^"]*" : "bg-\[#f59e0b\] border-l-4 border-\[#083858\]/, "lida: laranja claro; não lida: laranja forte com faixa");
  assert.match(painel, /<p className="text-\[13px\] font-medium text-\[#083858\] leading-relaxed">\{notif\.message\}<\/p>/);
});

test("🔴 nada no painel usa as classes que o tema do cabeçalho repinta de branco, nem transparência", () => {
  // globals.css: no cabeçalho, [class*="text-slate-"] e .text-white viram branco e [class*="bg-slate-"] vira azul.
  assert.doesNotMatch(painel, /(?:text|bg|border|divide)-slate-|text-white|text-amber-|bg-amber-|opacity-\d/);
});
