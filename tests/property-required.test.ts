import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { camposQueFaltam, type Obrigatorios } from "../src/lib/property-required";

const vazio: Obrigatorios = { propertyType: null, condition: null, bedrooms: null, suites: null, bathrooms: null, parkingSpots: null,
  acceptsFinancing: null, usefulAreaM2: "", totalAreaM2: "", state: "" };
const cheio: Obrigatorios = { propertyType: "Apartamento", condition: "usado", bedrooms: 0, suites: 0, bathrooms: 1, parkingSpots: 0,
  acceptsFinancing: false, usefulAreaM2: "", totalAreaM2: "120", state: "BA" };

test("🔴 a condição do IMÓVEL vai por extenso — nunca só \"condição\" (confundia com a condição de parceria)", () => {
  const rotulos = camposQueFaltam(vazio).map((item) => item.rotulo);
  assert.ok(rotulos.includes("condição do imóvel (novo, usado, em construção ou na planta)"));
  assert.ok(!rotulos.includes("condição"));
  assert.deepEqual(camposQueFaltam({ ...cheio, condition: null }).map((item) => item.campo), ["pc-condicao"]);
});

test("tudo preenchido → nada falta; zero quartos/vagas e financiamento \"não\" contam como preenchidos", () => {
  assert.deepEqual(camposQueFaltam(cheio), []);
  assert.deepEqual(camposQueFaltam({ ...cheio, totalAreaM2: "", usefulAreaM2: "" }).map((item) => item.campo), ["pc-useful"]);
});

test("🔴 todo campo para onde a tela rola existe no formulário de cadastro", () => {
  const fonte = readFileSync(new URL("../src/components/PropertyCreateForm.tsx", import.meta.url), "utf8");
  for (const { campo } of camposQueFaltam(vazio)) assert.match(fonte, new RegExp(`id="${campo}"`), `id="${campo}" sumiu do formulário`);
});
