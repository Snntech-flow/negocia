import assert from "node:assert/strict";
import test from "node:test";
import { validateBuyerProfileInput, validateLeadInput, validatePropertyInput } from "../src/lib/input-validation";

const property = {
  title: "Apartamento",
  propertyType: "Apartamento",
  salePrice: "500000.00",
  areaM2: "80.00",
  city: "São Paulo",
  neighborhood: "Centro",
  description: "Imóvel cadastrado para teste.",
  confidentialAddress: "Rua de teste, 123",
  ownerName: "Pessoa de teste",
  ownerPhone: "11999999999",
  bedrooms: 2,
  suites: 1,
  bathrooms: 2,
  parkingSpots: 1,
  splitPercentage: "50.00",
  photos: ["https://example.com/foto.jpg"],
};

test("aceita um imóvel válido e rejeita mídia insegura ou entrada excessiva", () => {
  assert.doesNotThrow(() => validatePropertyInput(property));
  assert.doesNotThrow(() => validatePropertyInput({ ...property, photos: Array(40).fill("https://example.com/foto.jpg") }));
  assert.throws(() => validatePropertyInput({ ...property, photos: ["http://example.com/foto.jpg"] }));
  assert.throws(() => validatePropertyInput({ ...property, photos: Array(41).fill("https://example.com/foto.jpg") }));
  assert.throws(() => validatePropertyInput({ ...property, title: "x".repeat(161) }));
  assert.throws(() => validatePropertyInput({ ...property, salePrice: "Infinity" }));
});

test("posição solar e vista aceitam só as opções da tela, incluindo Não definido e Lateral", () => {
  for (const solarPosition of ["nascente", "norte_sul", "poente", "nao_definido"]) {
    assert.doesNotThrow(() => validatePropertyInput({ ...property, solarPosition }), solarPosition);
  }
  for (const viewType of ["frente", "fundos", "lateral", "lagoa", "av_principal", "nao_definido"]) {
    assert.doesNotThrow(() => validatePropertyInput({ ...property, viewType }), viewType);
  }
  assert.throws(() => validatePropertyInput({ ...property, solarPosition: "sul" }), /posição solar/);
  assert.throws(() => validatePropertyInput({ ...property, viewType: "<b>mar</b>" }), /tipo de vista/);
});

test("limita orçamento e listas do perfil de comprador", () => {
  const profile = {
    clientInternalName: "Cliente",
    propertyType: "Casa",
    city: "São Paulo",
    maxBudget: "1000000",
    minBedrooms: 2,
    minParkingSpots: 1,
    neighborhoods: ["Centro"],
  };
  assert.doesNotThrow(() => validateBuyerProfileInput(profile));
  assert.throws(() => validateBuyerProfileInput({ ...profile, maxBudget: "Infinity" }));
  assert.throws(() => validateBuyerProfileInput({ ...profile, neighborhoods: Array(31).fill("Centro") }));
  assert.throws(() => validateBuyerProfileInput(null));
});

test("valida campos do CRM no servidor e rejeita valores fora dos limites", () => {
  const lead = {
    fullName: "Pessoa de teste",
    phone: "(11) 99999-9999",
    email: "pessoa@example.com",
    leadType: "comprador",
    source: "indicacao",
    propertyType: "Apartamento",
    city: "São Paulo",
    neighborhoods: ["Centro"],
    maxBudget: "750000.00",
    minBedrooms: 2,
    notes: "Preferência por imóvel próximo ao metrô.",
    nextAction: "Retornar com opções",
    nextActionAt: "2026-10-01T10:00",
  };
  assert.doesNotThrow(() => validateLeadInput(lead));
  assert.throws(() => validateLeadInput({ ...lead, source: "admin" }));
  assert.throws(() => validateLeadInput({ ...lead, maxBudget: "1e9" }));
  assert.throws(() => validateLeadInput({ ...lead, neighborhoods: Array(21).fill("Centro") }));
  assert.throws(() => validateLeadInput({ ...lead, phone: "1" }));
  assert.throws(() => validateLeadInput({ ...lead, nextActionAt: "amanhã" }));
  assert.throws(() => validateLeadInput(null));
});
