import assert from "node:assert/strict";
import test from "node:test";
import { calculateInterliningLay } from "../src/features/plano-de-corte/interlining.ts";
import type { CutPlanItem } from "../src/features/plano-de-corte/model.ts";

const item = (id: string, size: string, quantity: number, garmentType: CutPlanItem["garmentType"] = "T_SHIRT", sleeveType: CutPlanItem["sleeveType"] = "CURTA"): CutPlanItem => ({
  id, fabricId: "fabric", garmentType, quantity, size, sleeveType,
});

test("gera um único enfesto de entretela e fecha exatamente o pedido inteiro", () => {
  const result = calculateInterliningLay([
    item("1", "P", 20),
    item("2", "M", 30),
    item("3", "P", 10, "T_SHIRT", "LONGA"),
  ], 50)!;

  assert.equal(result.widthCm, 145);
  assert.equal(result.layers, 30);
  assert.equal(result.totalPieces, 60);
  assert.deepEqual(result.frequencies.map(({ size, frequency, quantity }) => ({ size, frequency, quantity })), [
    { size: "P", frequency: 1, quantity: 30 },
    { size: "M", frequency: 1, quantity: 30 },
  ]);
});

test("respeita o máximo de folhas escolhendo um divisor comum", () => {
  const result = calculateInterliningLay([item("1", "P", 100), item("2", "M", 150)], 40)!;
  assert.equal(result.layers, 25);
  assert.deepEqual(result.frequencies.map(({ frequency }) => frequency), [4, 6]);
});

test("mantém modelagens diferentes separadas no mesmo tamanho", () => {
  const result = calculateInterliningLay([item("1", "P", 12), item("2", "P", 18, "BABY_LOOK")], 50)!;
  assert.equal(result.layers, 6);
  assert.deepEqual(result.frequencies.map(({ garmentType, frequency }) => ({ garmentType, frequency })), [
    { garmentType: "BABY_LOOK", frequency: 3 },
    { garmentType: "T_SHIRT", frequency: 2 },
  ]);
});

test("entretela usa sempre o limite de folhas do tecido plano", () => {
  const result = calculateInterliningLay([item("1", "P", 80), item("2", "M", 160)])!;
  assert.equal(result.layers, 80);
  assert.deepEqual(result.frequencies.map(({ frequency }) => frequency), [1, 2]);
});
