import assert from "node:assert/strict";
import test from "node:test";
import { compareUniformSizeAndBabyLookText } from "../src/lib/uniform-sizes.ts";

test("agrupa tamanhos tradicionais antes dos tamanhos baby look", () => {
  const items = ["Baby G", "P", "Baby P", "6", "G"];

  items.sort((first, second) =>
    compareUniformSizeAndBabyLookText({ tamanho: first }, { tamanho: second }),
  );

  assert.deepEqual(items, ["6", "P", "G", "Baby P", "Baby G"]);
});

test("detecta baby look pelo produto antes de ordenar o tamanho", () => {
  const items = [
    { produto: "Baby Look", tamanho: "G" },
    { produto: "Camiseta", tamanho: "P" },
    { produto: "Baby Look", tamanho: "P" },
    { produto: "Camiseta", tamanho: "G" },
  ];

  items.sort(compareUniformSizeAndBabyLookText);

  assert.deepEqual(items.map((item) => `${item.produto} ${item.tamanho}`), [
    "Camiseta P",
    "Camiseta G",
    "Baby Look P",
    "Baby Look G",
  ]);
});
