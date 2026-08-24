import assert from "node:assert/strict";
import test from "node:test";
import { resolveItemColor, resolveItemSleeveType } from "../src/features/plano-de-corte/ficha-item-classification.ts";

test("produto e detalhes separam manga antes da especificação técnica geral", () => {
  assert.equal(resolveItemSleeveType("Camiseta manga curta", "Curta e longa"), "CURTA");
  assert.equal(resolveItemSleeveType("Camiseta manga longa", "Curta e longa"), "LONGA");
  assert.equal(resolveItemSleeveType("Camiseta básica", "Manga longa"), "LONGA");
});

test("cor explícita do item prevalece e os demais usam a cor técnica", () => {
  assert.equal(resolveItemColor("Camiseta preta gola redonda", "Azul royal"), "Preto");
  assert.equal(resolveItemColor("Camiseta básica", "Azul royal"), "Azul royal");
  assert.equal(resolveItemColor("Detalhes: azul marinho", "Azul royal"), "Azul marinho");
  assert.equal(resolveItemColor("Camiseta básica", "Preta"), "Preto");
});
