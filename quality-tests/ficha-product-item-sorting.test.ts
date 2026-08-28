import assert from "node:assert/strict";
import test from "node:test";
import { sortFichaProductItemsForSave } from "../src/features/fichas/product-item-sorting.ts";

test("ao salvar agrupa detalhes iguais e ordena os tamanhos dentro de cada grupo", () => {
  const items = [
    { detalhesProduto: "Frente azul", produto: "Baby Look", tamanho: "G" },
    { detalhesProduto: "Costas branca", produto: "Camiseta", tamanho: "G" },
    { detalhesProduto: " frente  AZUL ", produto: "Camiseta", tamanho: "6" },
    { detalhesProduto: "Frente azul", produto: "Baby Look", tamanho: "P" },
    { detalhesProduto: "Costas branca", produto: "Camiseta", tamanho: "P" },
  ];

  const sorted = sortFichaProductItemsForSave(items);

  assert.deepEqual(sorted.map((item) => `${item.detalhesProduto.trim()}|${item.tamanho}`), [
    "frente  AZUL|6",
    "Frente azul|P",
    "Frente azul|G",
    "Costas branca|P",
    "Costas branca|G",
  ]);
});

test("preserva a ordem de aparição dos grupos de detalhes", () => {
  const items = [
    { detalhesProduto: "Grupo B", produto: "Camiseta", tamanho: "G" },
    { detalhesProduto: "Grupo A", produto: "Camiseta", tamanho: "P" },
  ];

  assert.deepEqual(
    sortFichaProductItemsForSave(items).map((item) => item.detalhesProduto),
    ["Grupo B", "Grupo A"],
  );
});
