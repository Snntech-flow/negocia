// 29/10/2026, corretora piloto: "as fotos estão dando inválidas". Desde o bucket privado (28/10) o envio devolve o CAMINHO
// do objeto, e o cadastro só aceitava link https — todo imóvel com foto enviada voltava "Fotos inválido.".
import assert from "node:assert/strict";
import test from "node:test";
import { validatePropertyInput } from "../src/lib/input-validation";
import { fotosParaGravar } from "../src/lib/photo-sign";

const eu = "11111111-1111-4111-8111-111111111111";
const outro = "22222222-2222-4222-8222-222222222222";
const minha = `${eu}/33333333-3333-4333-8333-333333333333.jpg`;
const alheia = `${outro}/44444444-4444-4444-8444-444444444444.jpg`;
const externa = "https://fotos.exemplo.test/sala.jpg";
const origem = "https://projeto.supabase.co";
const assinada = (caminho: string) => `${origem}/storage/v1/object/sign/imoveis/${caminho}?token=abc.def.ghi`;
const publica = (caminho: string) => `${origem}/storage/v1/object/public/imoveis/${caminho}`;

const imovel = {
  title: "Apartamento", propertyType: "Apartamento", salePrice: "500000.00", areaM2: "80.00", city: "Salvador", neighborhood: "Centro",
  description: "Imóvel de teste.", confidentialAddress: "Rua de teste, 1", ownerName: "Pessoa de teste", ownerPhone: "71999999999",
  bedrooms: 2, suites: 1, bathrooms: 2, parkingSpots: 1,
};

function comSupabase(fn: () => void) {
  const anterior = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = origem; process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  try { fn(); } finally {
    if (anterior.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = anterior.url;
    if (anterior.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = anterior.key;
  }
}

test("🔴 o cadastro aceita a foto e a planta enviadas (caminho no bucket) além do link https", () => {
  assert.doesNotThrow(() => validatePropertyInput({ ...imovel, photos: [minha, externa], floorPlanPhotos: [minha.replace(".jpg", ".webp")] }));
  for (const ruim of ["../outro/foto.jpg", `${eu}/../../segredo.jpg`, `${eu}/foto.jpg`, `${eu}/33333333-3333-4333-8333-333333333333.svg`,
    "javascript:alert(1)", "http://fotos.exemplo.test/sala.jpg", `/${minha}`]) {
    assert.throws(() => validatePropertyInput({ ...imovel, photos: [ruim] }), /Fotos inválido/, ruim);
  }
});

test("🔴 grava o caminho: a URL assinada (edição) e a pública antiga viram caminho; link externo fica como está", () => comSupabase(() => {
  assert.deepEqual(fotosParaGravar([assinada(minha), publica(minha), minha, externa], eu), [minha, minha, minha, externa]);
  assert.deepEqual(fotosParaGravar(undefined, eu), []);
}));

test("🔴 foto que outro corretor enviou não entra — a não ser que já estivesse no imóvel", () => comSupabase(() => {
  assert.throws(() => fotosParaGravar([alheia], eu), /não foi enviada por você/);
  assert.throws(() => fotosParaGravar([assinada(alheia)], eu), /não foi enviada por você/);
  assert.deepEqual(fotosParaGravar([assinada(alheia), minha], eu, [publica(alheia)]), [alheia, minha]);
}));
