import { calculateCutPlanAlternatives } from "../src/features/plano-de-corte/alternatives.ts";
import { resolveEntryLengthPerFrequencyCm } from "../src/features/plano-de-corte/dimensions.ts";
import { createSearchBudget } from "../src/features/plano-de-corte/search-budget.ts";
import { validateCutPlanSolution } from "../src/features/plano-de-corte/solution-validation.ts";

const corpus = [
  { id: "pedido-a", type: "PLANO", maxLayers: 8, maxFrequency: 3, demands: [["P", 12], ["M", 8]] },
  { id: "pedido-b", type: "PLANO", maxLayers: 6, maxFrequency: 3, demands: [["PP", 6], ["P", 12], ["G", 6]] },
  { id: "pedido-c", type: "TUBULAR", maxLayers: 6, maxFrequency: 4, demands: [["P", 12], ["M", 24]] },
];
const budgetsMs = [25, 250, 1_500];

function buildInput(sample) {
  return {
    tableLengthCm: 800,
    maxLayers: sample.maxLayers,
    maxFrequency: sample.maxFrequency,
    sizeProfiles: [],
    fabrics: [{ id: "tecido", name: "Malha anonimizada", color: "Cor anonimizada", widthCm: sample.type === "TUBULAR" ? 90 : 180, type: sample.type }],
    items: sample.demands.map(([size, quantity], index) => ({ id: `item-${index + 1}`, fabricId: "tecido", garmentType: "T_SHIRT", size, sleeveType: "CURTA", quantity })),
  };
}

function qualityVector(result) {
  const lays = result.fabrics.flatMap((fabric) => fabric.lays);
  const entries = lays.map((lay) => lay.frequencies.length);
  return [
    lays.length,
    Math.round(lays.reduce((sum, lay) => sum + (lay.markerLengthCm ?? 0), 0) * 1e6) / 1e6,
    entries.filter((count) => count <= 2).length,
    -Math.min(...entries),
    entries.reduce((total, count, index) => total + entries.slice(index + 1).reduce((sum, other) => sum + Math.abs(count - other), 0), 0),
    -lays.reduce((sum, lay) => sum + lay.layers, 0),
  ];
}

function compareVectors(left, right) {
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

function* layerSets(maxLayers, count, ceiling = maxLayers, prefix = []) {
  if (!count) { yield prefix; return; }
  for (let layers = ceiling; layers >= 1; layers -= 1) yield* layerSets(maxLayers, count - 1, layers, [...prefix, layers]);
}

function assignments(quantity, layers, step, maxFrequency, index = 0, values = []) {
  if (index === layers.length) return quantity === 0 ? [values] : [];
  const result = [];
  for (let frequency = 0; frequency <= maxFrequency; frequency += step) {
    const remaining = quantity - frequency * layers[index];
    if (remaining >= 0) result.push(...assignments(remaining, layers, step, maxFrequency, index + 1, [...values, frequency]));
  }
  return result;
}

function oracle(input) {
  const fabric = input.fabrics[0];
  const step = fabric.type === "TUBULAR" ? 2 : 1;
  const lengths = input.items.map((item) => resolveEntryLengthPerFrequencyCm(item.size, item.sleeveType, fabric.type, fabric.widthCm, new Map(), item.garmentType).lengthCm);
  let best;
  for (let count = 1; count <= 4; count += 1) for (const layers of layerSets(input.maxLayers, count)) {
    const choices = input.items.map((item) => assignments(step * Math.ceil(item.quantity / step), layers, step, input.maxFrequency));
    if (choices.some((items) => !items.length)) continue;
    function visit(demandIndex, selected) {
      if (demandIndex < choices.length) { for (const choice of choices[demandIndex]) visit(demandIndex + 1, [...selected, choice]); return; }
      const markerLengths = layers.map((_, layIndex) => selected.reduce((sum, values, itemIndex) => sum + values[layIndex] * lengths[itemIndex], 0));
      if (markerLengths.some((length) => length > input.tableLengthCm) || layers.some((_, layIndex) => selected.every((values) => values[layIndex] === 0))) return;
      const entries = layers.map((_, layIndex) => selected.filter((values) => values[layIndex] > 0).length);
      const vector = [count, Math.round(markerLengths.reduce((sum, value) => sum + value, 0) * 1e6) / 1e6, entries.filter((value) => value <= 2).length, -Math.min(...entries), entries.reduce((total, value, index) => total + entries.slice(index + 1).reduce((sum, other) => sum + Math.abs(value - other), 0), 0), -layers.reduce((sum, value) => sum + value, 0)];
      if (!best || compareVectors(vector, best) < 0) best = vector;
    }
    visit(0, []);
    if (best?.[0] === count) break;
  }
  if (!best) throw new Error(`Oraculo nao encontrou solucao para ${input.items.length} demandas.`);
  return best;
}

const report = [];
for (const sample of corpus) {
  const input = buildInput(sample);
  const expected = oracle(input);
  const measurements = [];
  for (const durationMs of budgetsMs) {
    const heapBefore = process.memoryUsage().heapUsed;
    const startedAt = performance.now();
    const alternatives = calculateCutPlanAlternatives(input, { budget: createSearchBudget(durationMs) });
    const elapsedMs = performance.now() - startedAt;
    const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
    const best = alternatives[0];
    validateCutPlanSolution(input, best.result);
    const actual = qualityVector(best.result);
    measurements.push({ durationMs, elapsedMs: Math.round(elapsedMs * 100) / 100, heapDeltaBytes, termination: best.result.search?.termination, quality: actual, oracleGap: compareVectors(actual, expected) });
  }
  report.push({ id: sample.id, fabricType: sample.type, demands: sample.demands.length, oracle: expected, measurements });
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), objective: ["lays", "markerLengthCm", "sparseLays", "minimumEntriesPerLayDesc", "entryImbalance", "totalLayersDesc"], corpus: report }, null, 2));
if (report.some((sample) => sample.measurements.some((measurement) => measurement.oracleGap > 0))) process.exitCode = 1;
