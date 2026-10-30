import assert from "node:assert/strict";
import test from "node:test";
import { hasOnlyPantsProducts } from "../src/features/fichas/print-product-rules.ts";

test("identifica fichas formadas somente por calcas para rotular o acabamento", () => {
  assert.equal(hasOnlyPantsProducts(["Calça de Helanca"]), true);
  assert.equal(hasOnlyPantsProducts(["Calça de Helanca", "Calças de Brim"]), true);
  assert.equal(hasOnlyPantsProducts(["Calça de Helanca", "Camiseta"]), false);
  assert.equal(hasOnlyPantsProducts(["Bermuda de Helanca"]), false);
  assert.equal(hasOnlyPantsProducts([]), false);
});
