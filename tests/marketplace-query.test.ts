import assert from "node:assert/strict";
import test from "node:test";
import { validateMarketplaceQuery } from "../src/lib/marketplace-query";

test("consulta limita paginação, filtros e áreas carregadas", () => {
  assert.deepEqual(validateMarketplaceQuery({ section: "vitrine", page: 2, search: " Centro " }), { section: "vitrine", page: 2, search: "Centro", purpose: "todos", propertyType: "todos" });
  for (const page of [0, -1, 1.5, NaN, Infinity, 100001]) assert.throws(() => validateMarketplaceQuery({ page }));
  assert.throws(() => validateMarketplaceQuery({ search: "x".repeat(201) }));
  assert.throws(() => validateMarketplaceQuery({ purpose: "invalid" }));
});
