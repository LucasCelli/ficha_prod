import assert from "node:assert/strict";
import test from "node:test";
import { compareUniformSizeAndBabyLookText, createUniformSizeDomain, validateSizeConfiguration } from "../src/lib/uniform-sizes.ts";

test("resolve aliases, labels e variantes para uma identidade canonica", () => {
  const sizes = createUniformSizeDomain();
  for (const input of ["XG", "52", "G1", "XG (52)"]) assert.equal(sizes.resolveSize(input).sizeId, "size_xg");
  assert.deepEqual(
    { sizeId: sizes.resolveSize("BL G1").sizeId, variantId: sizes.resolveSize("BL G1").variantId },
    { sizeId: "size_xg", variantId: "baby-look" },
  );
  assert.equal(sizes.isSameSize("52", "XG"), true);
});

test("usa configuracao fornecida e rejeita alias ambiguo", () => {
  const configured = [
    { active: true, aliases: [], id: "p", name: "P", order: 0 },
    { active: true, aliases: ["52"], id: "xg", name: "XG", order: 2 },
    { active: true, aliases: [], id: "eg", name: "EG", order: 1 },
  ];
  assert.deepEqual(createUniformSizeDomain(configured).sortSizes(["XG", "P", "EG"]), ["P", "EG", "XG"]);
  assert.match(validateSizeConfiguration([...configured, { active: true, aliases: ["52"], id: "other", name: "Outro", order: 3 }]).join(" "), /Alias 52/);
});

test("mantem desconhecidos depois dos conhecidos com fallback deterministico", () => {
  assert.deepEqual(createUniformSizeDomain().sortSizes(["ZZ", "P", "AA"]), ["P", "AA", "ZZ"]);
});

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
