import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalogItemSchema } from "../src/features/catalogos/schema.ts";

const baseSize = {
  active: "on",
  aliases: "MEDIO",
  composition: "",
  description: "",
  kind: "tamanho",
  name: "M",
  sortOrder: "1",
};

test("aceita as oito dimensões de um tamanho e normaliza decimal com vírgula", () => {
  const result = catalogItemSchema.safeParse({
    ...baseSize,
    measureBackHeightCm: "72,5",
    measureBackWidthCm: "50",
    measureFrontHeightCm: "70",
    measureFrontWidthCm: "50",
    measureLongSleeveHeightCm: "60",
    measureLongSleeveWidthCm: "20",
    measureShortSleeveHeightCm: "25",
    measureShortSleeveWidthCm: "20",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.measureBackHeightCm, 72.5);
});

test("recusa conjunto parcial de medidas", () => {
  const result = catalogItemSchema.safeParse({ ...baseSize, measureFrontHeightCm: "70" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      new Set(result.error.issues.map((issue) => issue.path[0])),
      new Set([
        "measureFrontWidthCm", "measureBackHeightCm", "measureBackWidthCm",
        "measureShortSleeveHeightCm", "measureShortSleeveWidthCm",
        "measureLongSleeveHeightCm", "measureLongSleeveWidthCm",
      ]),
    );
  }
});

test("recusa medidas fora da categoria tamanho", () => {
  const result = catalogItemSchema.safeParse({
    ...baseSize,
    kind: "produto",
    measureBackHeightCm: "72",
    measureBackWidthCm: "50",
    measureFrontHeightCm: "70",
    measureFrontWidthCm: "50",
    measureLongSleeveHeightCm: "60",
    measureLongSleeveWidthCm: "20",
    measureShortSleeveHeightCm: "25",
    measureShortSleeveWidthCm: "20",
  });
  assert.equal(result.success, false);
});

test("exige largura e tipo juntos para tecidos", () => {
  const valid = catalogItemSchema.safeParse({
    ...baseSize,
    kind: "tecido",
    fabricType: "TUBULAR",
    fabricWidthCm: "118",
  });
  assert.equal(valid.success, true);

  const partial = catalogItemSchema.safeParse({
    ...baseSize,
    kind: "tecido",
    fabricWidthCm: "118",
  });
  assert.equal(partial.success, false);
  if (!partial.success) assert.ok(partial.error.issues.some((issue) => issue.path[0] === "fabricType"));
});

test("recusa configuração de corte fora da categoria tecido", () => {
  const result = catalogItemSchema.safeParse({
    ...baseSize,
    fabricType: "PLANO",
    fabricWidthCm: "150",
  });
  assert.equal(result.success, false);
});

test("migrations criam oito dimensões e garantem escopo, preenchimento completo e limites", async () => {
  const initial = await readFile(new URL("../supabase/migrations/20260806013614_catalog_size_measurements.sql", import.meta.url), "utf8");
  const sql = await readFile(new URL("../supabase/migrations/20260806015715_complete_catalog_size_dimensions.sql", import.meta.url), "utf8");
  assert.match(initial, /catalog_items_size_measurements_scope_check/);
  for (const column of ["measure_front_width_cm", "measure_back_width_cm", "measure_short_sleeve_width_cm", "measure_long_sleeve_width_cm"]) {
    assert.match(sql, new RegExp(`add column ${column} numeric\\(7, 2\\)`));
  }
  assert.match(sql, /rename column measure_front_cm to measure_front_height_cm/);
  assert.match(sql, /catalog_items_size_measurements_complete_check/);
  assert.match(sql, /measure_long_sleeve_height_cm > 0 and measure_long_sleeve_height_cm <= 1000/);
  assert.match(sql, /measure_long_sleeve_width_cm > 0 and measure_long_sleeve_width_cm <= 1000/);
});

test("migration cria largura e tipo do tecido com constraints e configura a Malha Fria", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260806023754_catalog_fabric_cut_settings.sql", import.meta.url), "utf8");
  assert.match(sql, /add column fabric_width_cm numeric\(7, 2\)/);
  assert.match(sql, /add column fabric_type text/);
  assert.match(sql, /catalog_items_fabric_cut_settings_scope_check/);
  assert.match(sql, /catalog_items_fabric_cut_settings_complete_check/);
  assert.match(sql, /fabric_type in \('PLANO', 'TUBULAR'\)/);
  assert.match(sql, /lower\('Malha Fria \(PV\)'\)/);
});
