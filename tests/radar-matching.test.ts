import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRadarMatch, findRadarMatches } from "../src/lib/radar-matching";

const property = { id: "property", title: "Apartamento", propertyType: "Apartamento", city: "São Paulo", neighborhood: "Centro", salePrice: "300000", bedrooms: 2, parkingSpots: 1, purpose: "venda", acceptsPartnership: true, status: "disponivel", broker: { id: "captor", name: "Captador", verificationStatus: "aprovado" } };
const profile = { id: "profile", clientInternalName: "Cliente", propertyType: "Apartamento", city: "São Paulo", neighborhoods: ["Centro"], maxBudget: "400000", minBedrooms: 2, minParkingSpots: 1, broker: { id: "partner", name: "Parceiro" } };

test("Radar usa o imóvel correspondente e explica os seis critérios", () => {
  const unrelated = { ...property, id: "unrelated", neighborhood: "Outro" };
  const matches = findRadarMatches([unrelated, property], [profile]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].property.id, property.id);
  assert.equal(matches[0].criteria.length, 6);
  assert.ok(matches[0].criteria.every(criterion => criterion.met));
});

test("Radar rejeita cada critério incompatível e ofertas indisponíveis", () => {
  for (const change of [{ city: "Curitiba" }, { propertyType: "Casa" }, { neighborhood: "Outro" }, { salePrice: "500000" }, { bedrooms: 1 }, { parkingSpots: 0 }, { status: "vendido" }, { acceptsPartnership: false }, { purpose: "aluguel" }, { broker: profile.broker }, { broker: { ...property.broker, verificationStatus: "pendente" } }]) {
    assert.equal(evaluateRadarMatch({ ...property, ...change }, profile).matched, false, JSON.stringify(change));
  }
  assert.equal(evaluateRadarMatch(property, { ...profile, maxBudget: "Infinity" }).matched, false);
  assert.equal(evaluateRadarMatch({ ...property, salePrice: "NaN" }, profile).matched, false);
});

test("Radar aceita bairro livre e normaliza espaços e maiúsculas", () => {
  assert.ok(evaluateRadarMatch(property, { ...profile, city: " são paulo ", propertyType: "apartamento", neighborhoods: [] }).matched);
});
