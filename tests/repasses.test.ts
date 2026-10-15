import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dividir, problemaNasPartes, repassesPorAno, repassesPorMes, versaoDoMes, type VersaoDoRepasse } from "../src/lib/repasses";
import RepassesDosSocios from "../src/components/RepassesDosSocios";

const parte = (position: number, name: string, percent: string, kind: "socio" | "empresa" = "socio") => ({ position, name, kind, percent });
const v1: VersaoDoRepasse = { validFromMonth: "2026-08", shares: [parte(1, "Sócio 1", "30.00"), parte(2, "Sócio 2", "30.00"), parte(3, "Sócio 3", "20.00"), parte(4, "Empresa", "20.00", "empresa")] };
const v2: VersaoDoRepasse = { validFromMonth: "2026-10", shares: [parte(1, "Sócio 1", "25.00"), parte(2, "Sócio 2", "25.00"), parte(3, "Sócio 3", "25.00"), parte(4, "Empresa", "25.00", "empresa")] };

test("🔴 confere as partes: soma 100%, nomes, tipo, % com até 2 casas (vírgula vale)", () => {
  assert.equal(problemaNasPartes(v1.shares), null);
  assert.match(problemaNasPartes([parte(1, "A", "50"), parte(2, "B", "40")]) ?? "", /somar 100% \(estão somando 90%\)/);
  assert.equal(problemaNasPartes([parte(1, "A", "33,33"), parte(2, "B", "33,33"), parte(3, "C", "33,34")]), null);
  assert.match(problemaNasPartes([parte(1, "A", "33.333"), parte(2, "B", "66.667")]) ?? "", /até 2 casas/);
  assert.match(problemaNasPartes([parte(1, "A", "50"), parte(2, "a", "50")]) ?? "", /uma vez só/);
  assert.match(problemaNasPartes([parte(1, " ", "100")]) ?? "", /nome/);
  assert.match(problemaNasPartes([]) ?? "", /1 a 10/);
});

test("a regra de cada mês é a mais recente que começou até ele; antes da primeira, nenhuma", () => {
  assert.equal(versaoDoMes([v1, v2], "2026-07"), null);
  assert.equal(versaoDoMes([v1, v2], "2026-09"), v1);
  assert.equal(versaoDoMes([v2, v1], "2026-10"), v2);
  assert.equal(versaoDoMes([v1, v2], "2027-03"), v2);
});

test("🔴 a divisão fecha com o total em centavos (as sobras vão para as maiores frações)", () => {
  const terços = [parte(1, "A", "33.33"), parte(2, "B", "33.33"), parte(3, "C", "33.34")];
  assert.deepEqual(dividir(1000, terços), [333, 333, 334]);
  assert.deepEqual(dividir(1, terços), [0, 0, 1]);
  const v = dividir(5990, v1.shares);
  assert.deepEqual(v, [1797, 1797, 1198, 1198]);
  assert.equal(v.reduce((a, b) => a + b, 0), 5990);
});

test("🔴 mudança de % vale do mês dela em diante — os meses anteriores ficam com o % da época", () => {
  const faixas = [{ chave: "2026-07", pago: 10000, aReceber: 0 }, { chave: "2026-09", pago: 10000, aReceber: 0 }, { chave: "2026-10", pago: 10000, aReceber: 20000 }];
  const meses = repassesPorMes(faixas, [v1, v2]);
  assert.equal(meses[0].semRegra, true);
  assert.deepEqual(meses[0].total, { pago: 10000, aReceber: 0 }); // o faturado do mês sem regra continua aparecendo
  assert.deepEqual(meses[1].partes.map((p) => p.pago), [3000, 3000, 2000, 2000]);
  assert.deepEqual(meses[2].partes.map((p) => p.pago), [2500, 2500, 2500, 2500]);
  assert.deepEqual(meses[2].partes.map((p) => p.aReceber), [5000, 5000, 5000, 5000]);
  const anos = repassesPorAno(faixas, [v1, v2]);
  assert.deepEqual(anos.map((a) => a.partes.map((p) => p.pago)), [[5500, 5500, 4500, 4500]]);
});

test("🔴 tela: quem só visualiza vê os repasses sem o botão de mudar; o administrador vê o botão", () => {
  const versoes = [{ id: "x", validFromMonth: "2026-01", createdAt: new Date("2026-01-02"), createdByName: "Administração", shares: v2.shares }];
  const props = { faixasMensais: [{ chave: "2026-10", pago: 10000, aReceber: 0 }], modo: "mes" as const, onMessage: () => undefined, versoesIniciais: versoes as never };
  const leitura = renderToStaticMarkup(createElement(RepassesDosSocios, { ...props, somenteLeitura: true }));
  assert.match(leitura, /Repasses aos sócios/);
  assert.match(leitura, /Sócio 1 25%/);
  assert.match(leitura, /R\$\s*25,00/);
  assert.doesNotMatch(leitura, /Mudar os %|Definir os %/);
  const admin = renderToStaticMarkup(createElement(RepassesDosSocios, { ...props, somenteLeitura: false }));
  assert.match(admin, /Mudar os %/);
});
