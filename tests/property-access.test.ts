import assert from "node:assert/strict";
import test from "node:test";
import { canUseProperty } from "../src/lib/property-access";

const property = { brokerId: "owner", acceptsPartnership: true, status: "disponivel", verificationStatus: "aprovado" };
test("negociação compartilhada exige disponibilidade, parceria e captador aprovado", () => {
  assert.equal(canUseProperty(property, "partner"), true);
  for (const change of [{ status: "vendido" }, { status: "reservado" }, { acceptsPartnership: false }, { verificationStatus: "pendente" }, { verificationStatus: "suspenso" }]) assert.equal(canUseProperty({ ...property, ...change }, "partner"), false);
});
test("captador mantém acesso à documentação do próprio inventário privado", () => {
  assert.equal(canUseProperty({ ...property, status: "vendido", acceptsPartnership: false }, "owner"), true);
});
