import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeFichaProductItemSize, sortFichaProductItemsForSave } from "../src/features/fichas/product-item-sorting.ts";

test("agrupa primeiro por detalhes, depois por produto e ordena os tamanhos dentro do grupo", () => {
  const items = [
    { detalhesProduto: "Manga curta", produto: "Camisa Social Masculina", tamanho: "G" },
    { detalhesProduto: "Manga longa", produto: "Camisa Social Feminina", tamanho: "GG" },
    { detalhesProduto: " manga  CURTA ", produto: " camisa social MASCULINA ", tamanho: "M" },
    { detalhesProduto: "Manga curta", produto: "Camisa Social Feminina", tamanho: "GG" },
    { detalhesProduto: "Manga longa", produto: "Camisa Social Feminina", tamanho: "P" },
    { detalhesProduto: "Manga curta", produto: "Camisa Social Feminina", tamanho: "P" },
  ];

  const sorted = sortFichaProductItemsForSave(items);

  assert.deepEqual(sorted.map((item) => `${item.produto.trim()}|${item.detalhesProduto.trim()}|${item.tamanho}`), [
    "camisa social MASCULINA|manga  CURTA|M",
    "Camisa Social Masculina|Manga curta|G",
    "Camisa Social Feminina|Manga curta|P",
    "Camisa Social Feminina|Manga curta|GG",
    "Camisa Social Feminina|Manga longa|P",
    "Camisa Social Feminina|Manga longa|GG",
  ]);
});

test("normaliza Baby Look com prefixo Baby, mas nao camisete", () => {
  assert.equal(canonicalizeFichaProductItemSize({ produto: "Baby Look Manga Curta", tamanho: "Feminina P" }), "Baby P");
  assert.equal(canonicalizeFichaProductItemSize({ produto: "Camiseta Feminina", tamanho: "P" }), "Baby P");
  assert.equal(canonicalizeFichaProductItemSize({ produto: "Camisete Manga Curta", tamanho: "Baby P" }), "P");
  assert.equal(canonicalizeFichaProductItemSize({ produto: "Camiseta Tradicional", tamanho: "Masculina P" }), "P");
});

test("preserva a ordem de aparição dos grupos de detalhes e de produto", () => {
  const items = [
    { detalhesProduto: "Grupo B", produto: "Produto B", tamanho: "G" },
    { detalhesProduto: "Grupo B", produto: "Produto A", tamanho: "G" },
    { detalhesProduto: "Grupo A", produto: "Produto B", tamanho: "P" },
  ];

  assert.deepEqual(
    sortFichaProductItemsForSave(items).map((item) => `${item.produto}|${item.detalhesProduto}`),
    ["Produto B|Grupo B", "Produto A|Grupo B", "Produto B|Grupo A"],
  );
});

test("mantém produtos diferentes separados quando os detalhes são iguais", () => {
  const items = [
    { detalhesProduto: "", produto: "Camisa Social Masculina Manga Curta", tamanho: "M" },
    { detalhesProduto: "", produto: "Camisa Social Feminina Manga Curta", tamanho: "P" },
    { detalhesProduto: "", produto: "Camisa Social Masculina Manga Curta", tamanho: "G" },
    { detalhesProduto: "", produto: "Camisa Social Feminina Manga Curta", tamanho: "GG" },
  ];

  assert.deepEqual(
    sortFichaProductItemsForSave(items).map((item) => `${item.produto}|${item.tamanho}`),
    [
      "Camisa Social Masculina Manga Curta|M",
      "Camisa Social Masculina Manga Curta|G",
      "Camisa Social Feminina Manga Curta|P",
      "Camisa Social Feminina Manga Curta|GG",
    ],
  );
});

test("mantém a separação canônica entre tamanhos masculinos e femininos", () => {
  const items = [
    { detalhesProduto: "Manga curta", produto: "Camiseta", tamanho: "Feminina P" },
    { detalhesProduto: "Manga curta", produto: "Camiseta", tamanho: "Masculina G" },
    { detalhesProduto: "Manga curta", produto: "Camiseta", tamanho: "Feminina GG" },
    { detalhesProduto: "Manga curta", produto: "Camiseta", tamanho: "Masculina M" },
  ];

  assert.deepEqual(
    sortFichaProductItemsForSave(items).map((item) => item.tamanho),
    ["Masculina M", "Masculina G", "Feminina P", "Feminina GG"],
  );
});
