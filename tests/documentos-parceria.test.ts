// Documentos › Registro de Visita e Termo de Parceria (28/10/2026, Sidney): "o 1, 2 e 3 poderiam ser quadrados separados" ·
// "'Divisão a confirmar' era para ser clicável? Estou clicando e nada acontece" · "como assim, comissão se comprar por fora?".
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("🔴 os três passos do Registro de Visita ficam cada um no seu quadro", () => {
  const dvp = ler("src/components/app-shell/DvpRouteClient.tsx");
  const lista = dvp.slice(dvp.indexOf('<ol className="mt-4 grid'), dvp.indexOf("</ol>", dvp.indexOf('<ol className="mt-4 grid')));
  assert.doesNotMatch(lista.slice(0, lista.indexOf(">")), /border|bg-/, "a lista não é mais um quadro só");
  assert.equal((lista.match(/<li className="rounded-xl border border-sky-500\/20 bg-sky-950\/20 p-4">/g) ?? []).length, 3);
});

test("🔴 no termo sem divisão confirmada, um botão leva à parceria certa no Registro de Visita", () => {
  const termo = ler("src/components/PartnershipTerms.tsx");
  assert.match(termo, /\{item\.status !== "recusado" && <Link href=\{`\/dvp#parceria-\$\{item\.id\}`\}[^>]*>Ver e confirmar a divisão da comissão<\/Link>\}/);
  const dvp = ler("src/components/app-shell/DvpRouteClient.tsx");
  assert.match(dvp, /<article key=\{partnership\.id\} id=\{`parceria-\$\{partnership\.id\}`\} className="scroll-mt-28 /, "a parceria tem a âncora que o botão usa");
});

test("🔴 o campo da comissão no controle de visita diz o que é", () => {
  const controle = ler("src/components/VisitControlPrint.tsx");
  assert.doesNotMatch(controle, />Comissão se comprar por fora/);
  assert.match(controle, />Comissão da declaração \(%\)/);
  assert.match(controle, /se compromete a pagar esta comissão, sobre o valor do imóvel, se comprar sem você/);
});
