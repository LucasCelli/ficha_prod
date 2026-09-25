import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260925032853_import_doptex_workwear_fabrics.sql", import.meta.url);
const fallbackUrl = new URL("../src/features/fichas/data/legacy-catalog-fallback.json", import.meta.url);

const expected = [
  ["PROFIT", 160, "67% poliéster 33% algodão"],
  ["PROFIT STRONG", 160, "67% poliéster 33% algodão"],
  ["PROFIT MIX", 150, "59% poliéster 41% algodão"],
  ["NATURAL FIT", 150, "65% algodão 35% poliéster"],
  ["NATURAL FIT MESCLA", 150, "65% algodão 35% poliéster"],
  ["COMFORT PLUS", 160, "63% algodão 37% poliéster"],
  ["COTTON PREMIUM", 150, "100% algodão"],
  ["FUSTÃO", 150, "100% algodão"],
  ["CLASSIC", 150, "73% algodão 27% poliéster"],
  ["PANAMÁ", 150, "67% poliéster 33% algodão"],
  ["TRICOLINE AMÉLIE", 135, "77% poliéster 19% algodão 4% elastano"],
  ["TRICOLINE IBIZA", 130, "75% poliéster 21% algodão 4% elastano"],
  ["TRICOLINE CANNES", 140, "58% algodão 38% poliéster 4% elastano"],
  ["DOPFIL", 150, "67% poliéster 33% algodão"],
  ["BRISTOL", 150, "53% poliéster 47% algodão"],
  ["MICRO VICHY", 150, "57% poliéster 43% algodão"],
  ["MÉDIUM VICHY", 150, "63% poliéster 37% algodão"],
  ["LONDON", 150, "67% algodão 33% poliéster"],
  ["SPAGUETI", 150, "77% algodão 23% poliéster"],
  ["FUSILI", 150, "50% poliéster 50% algodão"],
  ["LONDON COMFORT", 140, "52% poliéster 30% algodão 14% poliamida 4% elastano"],
  ["BARCELONA", 140, "73% poliéster 23% algodão 4% elastano"],
  ["SAVILLE", 140, "67% poliéster 29% algodão 4% elastano"],
  ["TURIM", 160, "79% poliéster 21% viscose"],
  ["RAVENA", 160, "78% poliéster 22% viscose"],
  ["MILANO PLUS", 140, "74% poliéster 22% viscose 4% elastano"],
  ["FIRENZE", 145, "96% poliéster 4% elastano"],
  ["DOPWORK PESADO", 160, "100% algodão"],
  ["DOPWORK LIGHT", 160, "100% algodão"],
] as const;

test("migração cadastra os 29 tecidos Doptex somente com nome, largura e composição", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const matches = [...sql.matchAll(/\(\d+, '[^']+', '([^']+)', '[^']+', '([^']+)', (\d+), ('[^']+'|null)\)/gu)];
  const tuples = matches.map((match) => [match[1], Number(match[3]), match[2]]);

  assert.deepEqual(tuples, expected);
  assert.equal(matches.filter((match) => match[4] !== "null").length, 8);
  assert.match(sql, /fabric_type = 'PLANO'/u);
});

test("fallback legado preserva os mesmos nomes e composições do catálogo Doptex", async () => {
  const catalog = JSON.parse(await readFile(fallbackUrl, "utf8")) as {
    materiais: Array<{ composicao: string; nome: string }>;
  };
  const byName = new Map(catalog.materiais.map((material) => [material.nome, material.composicao]));

  for (const [name, , composition] of expected) {
    assert.equal(byName.get(name), composition, name);
  }
});
