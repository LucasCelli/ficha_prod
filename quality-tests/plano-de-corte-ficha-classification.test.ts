import assert from "node:assert/strict";
import test from "node:test";
import { resolveItemColor, resolveItemGarmentSize, resolveItemGarmentType, resolveItemModelSize, resolveItemSleeveType } from "../src/features/plano-de-corte/ficha-item-classification.ts";

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

test("mantém calça separada e unifica bermuda com short no mesmo tamanho", () => {
  assert.equal(resolveItemGarmentSize("G", "Calça de helanca"), "CALÇA G");
  assert.equal(resolveItemGarmentSize("G", "Bermuda de helanca"), "SHORT G");
  assert.equal(resolveItemGarmentSize("G", "Short feminino de helanca"), "SHORT G");
  assert.equal(resolveItemGarmentSize("G", "Camiseta manga curta"), "G");
  assert.equal(resolveItemSleeveType("Calça longa de helanca", "Manga longa"), "CURTA");
  assert.equal(resolveItemGarmentSize("G", "Saia feminina"), "G");
  assert.equal(resolveItemGarmentSize("G", "Macacão"), "G");
});

test("classifica camiseta e camisa social como modelagens distintas", () => {
  assert.equal(resolveItemGarmentType("Camiseta básica manga curta"), "T_SHIRT");
  assert.equal(resolveItemGarmentType("Camiseta feminina manga curta"), "BABY_LOOK");
  assert.equal(resolveItemGarmentType("Baby look manga longa"), "BABY_LOOK");
  assert.equal(resolveItemGarmentType("Camisa manga curta"), "DRESS_SHIRT");
  assert.equal(resolveItemGarmentType("Camisa social masculina manga longa"), "DRESS_SHIRT");
  assert.equal(resolveItemGarmentType("Camisa manga longa feminina nos detalhes"), "CAMISETE");
  assert.equal(resolveItemGarmentType("Camisete manga curta"), "CAMISETE");
  assert.equal(resolveItemGarmentType("Calça de helanca"), "PANTS");
  assert.equal(resolveItemGarmentType("Bermuda de helanca"), "SHORTS");
});

test("cor explícita do item prevalece e os demais usam a cor técnica", () => {
  assert.equal(resolveItemColor("Camiseta preta gola redonda", "Azul royal"), "Preto");
  assert.equal(resolveItemColor("Camiseta básica", "Azul royal"), "Azul royal");
  assert.equal(resolveItemColor("Detalhes: azul marinho", "Azul royal"), "Azul marinho");
  assert.equal(resolveItemColor("Camiseta básica", "Preta"), "Preto");
});

test("reconhece marrom na descricao do item sem herdar a cor da ficha", () => {
  assert.equal(resolveItemColor("Calça Marrom", "Azul marinho"), "Marrom");
});
