import assert from "node:assert/strict";
import test from "node:test";
import { BRAZILIAN_STATES, isBrazilianState } from "../src/lib/brazil-states";

test("cadastro oferece as 27 unidades federativas e recusa sigla inexistente", () => {
  assert.equal(BRAZILIAN_STATES.length, 27);
  assert.equal(new Set(BRAZILIAN_STATES).size, 27);
  for (const uf of ["BA", "PE", "CE", "ES", "AM", "TO", "SP"]) assert.equal(isBrazilianState(uf), true, uf);
  for (const uf of ["XX", "sp", "", "BR"]) assert.equal(isBrazilianState(uf), false, uf);
});
