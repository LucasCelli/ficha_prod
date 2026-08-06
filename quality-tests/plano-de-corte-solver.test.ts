import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { buildSizeProfileIndex, estimateMarkerLengthCm, getLayerLimit } from "../src/features/plano-de-corte/dimensions.ts";
import type { CutPlanSizeProfile, FabricType } from "../src/features/plano-de-corte/model.ts";
import { solveMinimumLays } from "../src/features/plano-de-corte/solver.ts";
import { calculateCutPlan } from "../src/features/plano-de-corte/calculator.ts";
import { validateCutPlan } from "../src/features/plano-de-corte/validation.ts";
import type { CutPlanInput } from "../src/features/plano-de-corte/model.ts";

const unconstrained = { tableLengthCm: 100_000, fabricWidthCm: 118, sizeProfiles: [] };

test("aplica os limites fisicos de folhas por tipo", () => {
  assert.equal(getLayerLimit("PLANO"), 100);
  assert.equal(getLayerLimit("TUBULAR"), 50);
});

test("validacao rejeita folhas acima do limite do tecido", () => {
  const tubular = createInput("TUBULAR", 51);
  const flat = createInput("PLANO", 101);
  assert.ok(validateCutPlan(tubular).some((message) => message.includes("50 folhas")));
  assert.ok(validateCutPlan(flat).some((message) => message.includes("100 folhas")));
});

test("estima corpo duplo, par de mangas, aliases e duplicacao tubular", () => {
  const profile: CutPlanSizeProfile = {
    id: "m",
    size: "M",
    aliases: ["MEDIO"],
    bodyHeightCm: 70,
    bodyWidthCm: 50,
    sleeveHeightCm: 25,
    sleeveWidthCm: 20,
  };
  const index = buildSizeProfileIndex([profile]);
  const flat = estimateMarkerLengthCm([{ size: "medio", frequency: 2 }], "PLANO", 100, index)!;
  const tubular = estimateMarkerLengthCm([{ size: "M", frequency: 2 }], "TUBULAR", 100, index)!;
  assert.ok(flat > 0);
  assert.equal(tubular, flat / 2);
});

test("mantem combinacoes validas que a poda incorreta por divisores eliminaria", () => {
  const solutions = solveMinimumLays(new Map([["P", 10], ["M", 7]]), 3, "PLANO", 4, unconstrained);
  assert.equal(solutions[0]?.lays.length, 2);
  assert.ok(solutions.some((solution) => solution.lays.map((lay) => lay.layers).join(",") === "3,2"));
});

test("usa o comprimento da mesa para reduzir frequencias", () => {
  const profile: CutPlanSizeProfile = {
    id: "p",
    size: "P",
    aliases: [],
    bodyHeightCm: 70,
    bodyWidthCm: 50,
    sleeveHeightCm: 25,
    sleeveWidthCm: 20,
  };
  const tableLengthCm = 250;
  const solutions = solveMinimumLays(new Map([["P", 60]]), 10, "PLANO", 6, {
    tableLengthCm,
    fabricWidthCm: 100,
    sizeProfiles: [profile],
  });
  assert.equal(solutions[0]?.lays.length, 3);
  assert.ok(solutions[0]?.lays.every((lay) => (lay.markerLengthCm ?? 0) <= tableLengthCm));
});

test("caso tubular real fecha em dois enfestos com frequencias pares", () => {
  const quantities = new Map([["P", 40], ["M", 60], ["G", 50], ["GG", 30]]);
  const solution = solveMinimumLays(quantities, 30, "TUBULAR", 4, unconstrained)[0];
  assert.equal(solution?.lays.length, 2);
  assert.ok(solution.lays.every((lay) => lay.frequencies.every(({ frequency }) => frequency % 2 === 0)));
});

test("coincide com busca exaustiva independente em entradas pequenas", () => {
  for (const type of ["PLANO", "TUBULAR"] satisfies FabricType[]) {
    const step = type === "TUBULAR" ? 2 : 1;
    for (let left = step; left <= 12; left += step) {
      for (let right = step; right <= 12; right += step) {
        const expected = bruteMinimumLayCount([left, right], 4, type, 4);
        const actual = solveMinimumLays(new Map([["P", left], ["M", right]]), 4, type, 4, unconstrained)[0]?.lays.length ?? null;
        assert.equal(actual, expected, `${type}: ${left}/${right}`);
      }
    }
  }
});

test("benchmark do pedido operacional permanece interativo", () => {
  const startedAt = performance.now();
  const solution = solveMinimumLays(new Map([["P", 40], ["M", 60], ["G", 50], ["GG", 30]]), 50, "TUBULAR", 4, unconstrained)[0];
  const elapsed = performance.now() - startedAt;
  assert.equal(solution?.lays.length, 2);
  assert.ok(elapsed < 2_000, `solver levou ${elapsed.toFixed(1)} ms`);
});

test("orcamento combinatorio cai no fallback sem perder producao exata", () => {
  const input = createInput("TUBULAR", 50);
  input.items = Array.from({ length: 16 }, (_, index) => ({
    id: `item-${index}`,
    fabricId: "fabric",
    size: `T${index}`,
    quantity: 20 + index * 2,
  }));
  const startedAt = performance.now();
  const result = calculateCutPlan(input);
  const elapsed = performance.now() - startedAt;
  assert.ok(elapsed < 2_500, `calculo completo levou ${elapsed.toFixed(1)} ms`);
  assert.ok(result.fabrics[0].sizes.every((size) => size.difference === 0));
  assert.ok(result.fabrics[0].lays.every((lay) => lay.layers <= 50 && lay.frequencies.every(({ frequency }) => frequency % 2 === 0)));
});

function bruteMinimumLayCount(quantities: number[], maxLayers: number, type: FabricType, maxCount: number) {
  const options = type === "TUBULAR" ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6];
  for (let count = 1; count <= maxCount; count += 1) {
    for (const layers of bruteLayerSets(maxLayers, count)) {
      if (quantities.every((quantity) => canAssign(quantity, layers, options))) return count;
    }
  }
  return null;
}

function *bruteLayerSets(maxLayers: number, count: number, ceiling = maxLayers, prefix: number[] = []): Generator<number[]> {
  if (!count) {
    yield prefix;
    return;
  }
  for (let layer = ceiling; layer >= 1; layer -= 1) yield *bruteLayerSets(maxLayers, count - 1, layer, [...prefix, layer]);
}

function canAssign(quantity: number, layers: number[], options: number[], index = 0) {
  if (index === layers.length) return quantity === 0;
  return options.some((frequency) => quantity - frequency * layers[index] >= 0 && canAssign(quantity - frequency * layers[index], layers, options, index + 1));
}

function createInput(type: FabricType, maxLayers: number): CutPlanInput {
  return {
    tableLengthCm: 800,
    maxLayers,
    fabrics: [{ id: "fabric", name: "Malha", color: "", widthCm: 118, type }],
    items: [{ id: "item", fabricId: "fabric", size: "M", quantity: type === "TUBULAR" ? 20 : 10 }],
    sizeProfiles: [],
  };
}
