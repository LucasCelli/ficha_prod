import assert from "node:assert/strict";
import test from "node:test";
import { calculateComparison, normalizePersonalStatus } from "../src/features/meu-painel/analytics.ts";

test("calcula comparação com o período anterior", () => {
  assert.equal(calculateComparison(12, 10), 20);
  assert.equal(calculateComparison(0, 0), null);
  assert.equal(calculateComparison(3, 0), 100);
});

test("normaliza filtros de status não confiáveis", () => {
  assert.equal(normalizePersonalStatus("atrasado"), "atrasado");
  assert.equal(normalizePersonalStatus("outro"), "todos");
  assert.equal(normalizePersonalStatus(undefined), "todos");
});
