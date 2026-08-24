import assert from "node:assert/strict";
import test from "node:test";
import { resolveItemColor, resolveItemGarmentSize, resolveItemModelSize, resolveItemSleeveType } from "../src/features/plano-de-corte/ficha-item-classification.ts";

test("produto e detalhes separam manga antes da especificação técnica geral", () => {
  assert.equal(resolveItemSleeveType("Camiseta manga curta", "Curta e longa"), "CURTA");
  assert.equal(resolveItemSleeveType("Camiseta manga longa", "Curta e longa"), "LONGA");
  assert.equal(resolveItemSleeveType("Camiseta básica", "Manga longa"), "LONGA");
});

test("mantém moldes masculino e feminino separados para o mesmo tamanho", () => {
  assert.equal(resolveItemModelSize("P", "Camisa social masculina manga longa"), "MASC P");
  assert.equal(resolveItemModelSize("P", "Camisa social feminina manga longa"), "FEM P");
  assert.equal(resolveItemModelSize("BABY P", "Camiseta feminina"), "BABY P");
});

test("mantém calça, bermuda e short separados para o mesmo tamanho", () => {
  assert.equal(resolveItemGarmentSize("G", "Calça de helanca"), "CALÇA G");
  assert.equal(resolveItemGarmentSize("G", "Bermuda de helanca"), "BERMUDA G");
  assert.equal(resolveItemGarmentSize("G", "Short feminino de helanca"), "SHORT G");
  assert.equal(resolveItemGarmentSize("G", "Camiseta manga curta"), "G");
  assert.equal(resolveItemSleeveType("Calça longa de helanca", "Manga longa"), "CURTA");
});

test("cor explícita do item prevalece e os demais usam a cor técnica", () => {
  assert.equal(resolveItemColor("Camiseta preta gola redonda", "Azul royal"), "Preto");
  assert.equal(resolveItemColor("Camiseta básica", "Azul royal"), "Azul royal");
  assert.equal(resolveItemColor("Detalhes: azul marinho", "Azul royal"), "Azul marinho");
  assert.equal(resolveItemColor("Camiseta básica", "Preta"), "Preto");
});
