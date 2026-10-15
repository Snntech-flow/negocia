import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { abasGuardadas, abrirAba, fecharAba } from "../src/lib/abas";

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

test("🔴 a barra de abas existe no app, com X em cada aba que não é a Vitrine", () => {
  const app = readFileSync(new URL("../src/components/NegociaLarApp.tsx", import.meta.url), "utf8");
  assert.match(app, /role="tablist" aria-label="Telas abertas"/);
  assert.match(app, /aria-label=\{`Fechar a aba \$\{TAB_LABELS\[aba\]\}`\}/);
  assert.match(app, /aba !== "vitrine" && <button/);
  assert.match(app, /window\.history\.pushState\(\{ negocialarAba: tab \}/);
});
