import assert from "node:assert/strict";
import test from "node:test";
import { calculateCutPlanAlternatives, compareCutPlanResults } from "../src/features/plano-de-corte/alternatives.ts";
import { calculateCutPlan } from "../src/features/plano-de-corte/calculator.ts";
import { solveMinimumLays } from "../src/features/plano-de-corte/solver.ts";
import { createSearchBudget, CUT_PLAN_SEARCH_DURATION_MS } from "../src/features/plano-de-corte/search-budget.ts";
import { normalizeCutPlanInput } from "../src/features/plano-de-corte/normalization.ts";
import { validateCutPlanSolution } from "../src/features/plano-de-corte/solution-validation.ts";
import { validateCutPlan } from "../src/features/plano-de-corte/validation.ts";
import { buildSizeProfileIndex, getMaximumEstimatedFrequency, resolveEntryLengthPerFrequencyCm } from "../src/features/plano-de-corte/dimensions.ts";
import type { CutPlanInput, CutPlanResult, CutPlanSizeProfile, LayPlan } from "../src/features/plano-de-corte/model.ts";

// Perfis sintéticos: área / (100 * 0,82) = comprimento pedido.
function profile(size: string, length: number): CutPlanSizeProfile {
  return { id: size, size, aliases: [], frontHeightCm: length * 20.5, frontWidthCm: 1,
    backHeightCm: length * 20.5, backWidthCm: 1, shortSleeveHeightCm: length * 20.5, shortSleeveWidthCm: 1,
    longSleeveHeightCm: length * 20.5, longSleeveWidthCm: 1 };
}
function inputFor(lengths: number[]): CutPlanInput {
  return { tableLengthCm: 100, maxLayers: 1, maxFrequency: 1, mergeFabricsInLays: true,
    fabrics: lengths.map((_, i) => ({ id: `f${i}`, name: "Malha", color: `Cor ${i}`, widthCm: 100, type: "PLANO" })),
    items: lengths.map((_, i) => ({ id: `i${i}`, fabricId: `f${i}`, size: `S${i}`, sleeveType: "CURTA", quantity: 1 })),
    sizeProfiles: lengths.map((length, i) => profile(`S${i}`, length)) };
}

test("busca usa 30 segundos globais e conserva o plano ao expirar depois da primeira publicação", () => {
  assert.equal(CUT_PLAN_SEARCH_DURATION_MS, 30_000);
  let time = 0;
  const budget = createSearchBudget(100_000, () => time);
  assert.equal(budget.deadline, 30_000);
  const input = { ...inputFor([20]), mergeFabricsInLays: false };
  let publications = 0;
  const alternatives = calculateCutPlanAlternatives(input, { budget, onProgress: () => { publications++; time = 30_001; } });
  assert.ok(publications > 0);
  assert.equal(alternatives[0].result.search?.termination, "time_limit");
  assert.equal(alternatives[0].result.search?.status, "feasible");
  validateCutPlanSolution(normalizeCutPlanInput(input), alternatives[0].result);
});

test("empacotamento encontra dois enfestos onde first fit produzia três", () => {
  const input = inputFor([60, 50, 30, 20, 20, 20]);
  const result = calculateCutPlanAlternatives(input)[0];
  assert.equal(result.layCount, 2);
  assert.deepEqual(result.result.mergedLays?.map((lay) => lay.markerLengthCm), [100, 100]);
  validateCutPlanSolution(input, result.result);
});

test("mesclagem não arredonda cada segmento antes de comparar a mesa", () => {
  const result = calculateCutPlanAlternatives(inputFor([50.1, 49.1]))[0];
  assert.equal(result.layCount, 1);
  assert.ok(Math.abs(result.result.mergedLays![0].markerLengthCm! - 99.2) < 1e-10);
});

test("preserva a opção local de quatro folhas necessária às cores de 12 e 4 peças", () => {
  const input = inputFor([10, 10]);
  input.maxLayers = 100; input.maxFrequency = 8;
  input.items[0].quantity = 12; input.items[1].quantity = 4;
  const result = calculateCutPlanAlternatives(input)[0];
  assert.equal(result.layCount, 1);
  assert.equal(result.result.mergedLays![0].layers, 4);
  validateCutPlanSolution(input, result.result);
});

test("busca conjunta aceita três divisões locais quando elas reduzem os enfestos globais", () => {
  const input = inputFor([20, 80, 80, 80]);
  input.maxLayers = 4;
  input.maxFrequency = 3;
  input.items[0].quantity = 12;
  for (const item of input.items.slice(1)) item.quantity = 4;

  const result = calculateCutPlanAlternatives(input)[0];
  assert.equal(result.layCount, 3);
  assert.equal(result.result.mergedLays?.every((lay) => lay.markerLengthCm === 100), true);
  assert.equal(result.result.mergedLays?.flatMap((lay) => lay.allocations).filter((lay) => lay.fabricId === "f0").length, 3);
  assert.equal(result.result.search?.status, "feasible");
  validateCutPlanSolution(input, result.result);
});

test("dominância preserva o melhor estado completo sob o critério de equilíbrio", () => {
  const sizes = ["PP", "P", "M", "G", "GG", "EG", "EEG"];
  const quantities = [9, 1, 8, 8, 7, 12, 12];
  const result = solveMinimumLays(new Map(sizes.map((size, i) => [size, quantities[i]])), 4, "PLANO", 3,
    { tableLengthCm: 12, fabricWidthCm: 100, maxFrequency: 3, sizeProfiles: sizes.map((size) => profile(size, 1)) })[0];
  assert.deepEqual(result.metrics, { totalFrequency: 18, peakFrequency: 7, sizeSpreadScore: 40, totalLayers: 9, totalMarkerLengthCm: 18, sizeEntries: 9, minimumSizeEntriesPerLay: 3, sizeEntryImbalance: 0, sparseLayCount: 0, layerHeightImbalance: 4, balanceAdjustedMarkerLengthCm: 18 });
  assert.equal(result.searchComplete, true);
});

test("cache não confunde coeficientes que diferem depois da sexta casa decimal", () => {
  const input = inputFor([50, 50.0000004]);
  input.fabrics = [input.fabrics[0]];
  input.items[1].fabricId = "f0";
  const result = calculateCutPlan(input);
  assert.equal(result.fabrics[0].lays.length, 2);
  validateCutPlanSolution(input, result);
});

test("perfil ausente não produz um comprimento parcial apresentado como completo", () => {
  const input = inputFor([20, 30]);
  input.fabrics = [input.fabrics[0]]; input.items[1].fabricId = "f0"; input.sizeProfiles.pop();
  input.mergeFabricsInLays = false;
  const result = calculateCutPlanAlternatives(input)[0].result;
  assert.equal(result.search?.measurementsComplete, false);
  assert.equal(result.search?.status, "feasible");
  assert.equal(result.fabrics[0].lays[0].markerLengthCm, undefined);
});

test("aliases são agregados antes do arredondamento tubular", () => {
  const input = inputFor([10, 10]);
  input.fabrics = [{ ...input.fabrics[0], type: "TUBULAR" }];
  input.items[0].size = "BABY P"; input.items[1].size = "BL P"; input.items[1].fabricId = "f0";
  input.maxFrequency = 14; input.mergeFabricsInLays = false;
  input.sizeProfiles = [{ ...profile("BABY P", 10), aliases: ["BL P"] }];
  const result = calculateCutPlanAlternatives(input)[0].result;
  assert.equal(result.fabrics[0].sizes.length, 1);
  assert.equal(result.fabrics[0].sizes[0].produced, 2);
});

test("solver usa o padrão tubular 14 e explora mais de quatro enfestos", () => {
  const constraints = { tableLengthCm: 1000, fabricWidthCm: 100, sizeProfiles: [profile("M", 1)] };
  assert.equal(solveMinimumLays(new Map([["M", 42]]), 3, "TUBULAR", 3, constraints)[0].lays.length, 1);
  const result = solveMinimumLays(new Map([["M", 10]]), 2, "PLANO", 5, { ...constraints, maxFrequency: 1, tableLengthCm: 1 })[0];
  assert.equal(result.lays.length, 5);
  assert.equal(result.searchComplete, true);
});

test("validação rejeita inteiros inseguros e resultados adulterados", () => {
  const input = inputFor([20]);
  const result = calculateCutPlan(input);
  result.fabrics[0].lays[0].layers = 2;
  assert.throws(() => validateCutPlanSolution(input, result));
  input.items[0].quantity = 1e20;
  assert.ok(validateCutPlan(input).length > 0);
  assert.throws(() => calculateCutPlan(input));
});

test("permutar tecidos e itens não altera as alternativas canônicas", () => {
  const input = inputFor([60, 50, 30, 20, 20, 20]);
  const shapes = (value: CutPlanInput) => calculateCutPlanAlternatives(value).map((a) => ({ fabrics: a.result.fabrics, mergedLays: a.result.mergedLays }));
  assert.deepEqual(shapes(input), shapes({ ...input, fabrics: [...input.fabrics].reverse(), items: [...input.items].reverse() }));
});

test("bounds respeitam a mesma tolerância da verificação na borda da mesa", () => {
  const measures = [profile("P", 0.1), profile("M", 0.1)];
  assert.equal(getMaximumEstimatedFrequency("P", "CURTA", "PLANO", 100, 0.3, measures, 8), 3);
  const result = solveMinimumLays(new Map([["P", 2], ["M", 4]]), 2, "PLANO", 2,
    { tableLengthCm: 0.3, fabricWidthCm: 100, maxFrequency: 8, sizeProfiles: measures })[0];
  assert.equal(result.lays.length, 1);
  assert.equal(result.searchComplete, true);
});

test("alternativa individual duplicada não apaga o certificado do solver", () => {
  const input = { ...inputFor([20]), mergeFabricsInLays: false };
  const result = calculateCutPlanAlternatives(input)[0].result;
  assert.equal(result.search?.measurementsComplete, true);
  assert.equal(result.search?.status, "optimal");
  assert.equal(result.search?.termination, "completed");
});

test("prazo compartilhado conserva o plano inicial de todos os tecidos", () => {
  const sizes = ["PP", "P", "M", "G", "GG", "EG", "EEG"];
  const quantities = [9, 1, 8, 8, 7, 12, 12];
  const input = inputFor([1, 1]);
  input.maxLayers = 4; input.maxFrequency = 3; input.tableLengthCm = 12;
  input.items = input.fabrics.flatMap((fabric) => sizes.map((size, i) => ({ id: `${fabric.id}-${size}`, fabricId: fabric.id, size, sleeveType: "CURTA", quantity: quantities[i] })));
  input.sizeProfiles = sizes.map((size) => profile(size, 1));
  let time = 0;
  const result = calculateCutPlan(input, true, createSearchBudget(30_000, () => time += 50));
  assert.equal(result.fabrics.length, 2);
  assert.equal(result.search?.status, "feasible");
  assert.equal(result.search?.termination, "time_limit");
  validateCutPlanSolution(normalizeCutPlanInput(input), result);
});

test("interromper no primeiro plano completo preserva esse plano e remove o certificado", () => {
  let time = 0;
  const result = solveMinimumLays(new Map([["P", 6], ["M", 5]]), 4, "PLANO", 3, {
    tableLengthCm: 6, fabricWidthCm: 100, maxFrequency: 3, sizeProfiles: [profile("P", 1), profile("M", 1)],
    budget: createSearchBudget(30_000, () => time), onSolution: () => { time = 30_001; },
  });
  assert.ok(result.length > 0);
  assert.equal(result[0].searchComplete, false);
  for (const [size, quantity] of [["P", 6], ["M", 5]] as const) {
    assert.equal(result[0].lays.reduce((sum, lay) => sum + lay.layers * (lay.frequencies.find((item) => item.size === size)?.frequency ?? 0), 0), quantity);
  }
});

test("fallback dimensional diferencia tamanho, manga e baby look sem substituir perfil cadastrado", () => {
  const empty = buildSizeProfileIndex([]);
  const p = resolveEntryLengthPerFrequencyCm("P", "CURTA", "PLANO", 118, empty);
  const g = resolveEntryLengthPerFrequencyCm("G", "CURTA", "PLANO", 118, empty);
  const long = resolveEntryLengthPerFrequencyCm("G", "LONGA", "PLANO", 118, empty);
  const baby = resolveEntryLengthPerFrequencyCm("BABY G", "CURTA", "PLANO", 118, empty);
  assert.equal(p.source, "FALLBACK_MEDIUM");
  assert.ok(g.lengthCm! > p.lengthCm!);
  assert.ok(long.lengthCm! > g.lengthCm!);
  assert.notEqual(baby.lengthCm, g.lengthCm);
  assert.equal(baby.source, "FALLBACK_HIGH");

  const registered = profile("G", 7);
  const real = resolveEntryLengthPerFrequencyCm("G", "CURTA", "PLANO", 100, buildSizeProfileIndex([registered]));
  assert.equal(real.source, "REGISTERED");
  assert.equal(real.lengthCm, 7);
});

test("fallback de calça e short usa progressão da categoria e registra a origem", () => {
  const empty = buildSizeProfileIndex([]);
  const pants36 = resolveEntryLengthPerFrequencyCm("CALÇA 36", "CURTA", "PLANO", 118, empty);
  const pants56 = resolveEntryLengthPerFrequencyCm("CALÇA 56", "CURTA", "PLANO", 118, empty);
  const shortsP = resolveEntryLengthPerFrequencyCm("SHORT P", "CURTA", "PLANO", 118, empty);
  const shortsGG = resolveEntryLengthPerFrequencyCm("SHORT GG", "CURTA", "PLANO", 118, empty);
  assert.equal(pants36.source, "FALLBACK_HIGH");
  assert.ok(pants56.lengthCm! > pants36.lengthCm!);
  assert.ok(shortsGG.lengthCm! > shortsP.lengthCm!);
});

test("resultado expõe que o comprimento veio da tabela fallback", () => {
  const input = inputFor([20]);
  input.fabrics = [input.fabrics[0]];
  input.items = [{ id: "fallback-m", fabricId: "f0", size: "M", sleeveType: "CURTA", quantity: 4 }];
  input.sizeProfiles = [];
  input.tableLengthCm = 1_000;
  const result = calculateCutPlan(input, false);
  assert.equal(result.search?.measurementSource, "FALLBACK_MEDIUM");
  assert.equal(result.search?.measurementsComplete, true);
  assert.ok(result.fabrics[0].lays.every((lay) => lay.markerLengthCm !== undefined));
});

test("equilíbrio promove o segundo plano observado no Audaces", () => {
  const sizes = ["RN", "1", "2", "4", "6", "8", "10", "14", "P", "M", "G", "GG", "EG"];
  const lay = (id: string, layers: number, markerLengthCm: number, entries: Array<[string, number]>): LayPlan => ({
    id, fabricId: "fabric", layers, markerLengthCm,
    frequencies: entries.map(([size, frequency]) => ({ size, frequency, sleeveType: "CURTA" })),
  });
  const result = (lays: LayPlan[]): CutPlanResult => ({ fabrics: [{ fabricId: "fabric", lays, sizes: sizes.map((size) => ({ size, sleeveType: "CURTA", requested: 0, produced: 0, difference: 0 })) }] });
  const first = result([
    lay("1", 6, 190, [["2", 2], ["GG", 2]]),
    lay("2", 3, 630, [["RN", 2], ["1", 2], ["6", 2], ["14", 2], ["M", 2], ["G", 2], ["EG", 2]]),
    lay("3", 2, 740, [["1", 4], ["2", 2], ["4", 4], ["8", 2], ["10", 2], ["P", 2], ["M", 2], ["G", 2]]),
  ]);
  const second = result([
    lay("1", 5, 330, [["1", 2], ["2", 2], ["M", 2], ["G", 2]]),
    lay("2", 3, 670, [["RN", 2], ["2", 2], ["6", 2], ["14", 2], ["GG", 4], ["EG", 2]]),
    lay("3", 2, 410, [["1", 2], ["4", 4], ["8", 2], ["10", 2], ["P", 2]]),
  ]);
  assert.ok(compareCutPlanResults(second, first) < 0);
  assert.ok(compareCutPlanResults(first, second) > 0);
});
