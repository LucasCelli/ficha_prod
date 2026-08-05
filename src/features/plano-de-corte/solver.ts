import type { FabricType, MarkerFrequency } from "./model";
import { compareUniformSizes } from "@/lib/uniform-sizes";

export type SolvedLay = { layers: number; frequencies: MarkerFrequency[] };
export type SolverMetrics = { totalFrequency: number; peakFrequency: number; sizeMixScore: number; totalLayers: number; sizeEntries: number };
export type SolvedPlan = { lays: SolvedLay[]; metrics: SolverMetrics; signature: string };

const MAX_FREQUENCY = 6;
const MAX_SIZES_PER_MARKER = 5;
const MAX_EXACT_LAYS = 4;
const SOLUTIONS_PER_LAYER_SET = 4;
const MAX_RETURNED_SOLUTIONS = 8;

type SizeAssignment = { frequencies: number[]; totalFrequency: number };
type PartialPlan = { assignments: number[][]; counts: number[]; sizeMixScore?: number; totalFrequency: number; usedMask: number };

function frequencyOptions(type: FabricType) { return type === "TUBULAR" ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6]; }

function *generateLayerSets(maxLayers: number, count: number, ceiling = maxLayers, prefix: number[] = []): Generator<number[]> {
  if (count === 0) { yield prefix; return; }
  for (let layers = ceiling; layers >= 1; layers -= 1) yield *generateLayerSets(maxLayers, count - 1, layers, [...prefix, layers]);
}

function assignmentKey(quantity: number, layers: number[], type: FabricType) { return `${type}:${quantity}:${layers.join(",")}`; }

function getSizeAssignments(quantity: number, layers: number[], type: FabricType, cache: Map<string, SizeAssignment[]>) {
  const key = assignmentKey(quantity, layers, type); const cached = cache.get(key); if (cached) return cached;
  const result: SizeAssignment[] = []; const options = frequencyOptions(type);
  function visit(index: number, remaining: number, values: number[]) {
    if (index === layers.length) { if (remaining === 0) result.push({ frequencies: values, totalFrequency: values.reduce((sum, value) => sum + value, 0) }); return; }
    const remainingCapacity = layers.slice(index + 1).reduce((sum, layer) => sum + layer * MAX_FREQUENCY, 0);
    for (const frequency of options) {
      const next = remaining - frequency * layers[index];
      if (next < 0 || next > remainingCapacity) continue;
      visit(index + 1, next, [...values, frequency]);
    }
  }
  visit(0, quantity, []);
  result.sort((a, b) => a.totalFrequency - b.totalFrequency || compareNumbers(a.frequencies, b.frequencies));
  cache.set(key, result); return result;
}

function compareNumbers(a: number[], b: number[]) { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
function partialKey(plan: PartialPlan) { return `${plan.usedMask}:${plan.counts.join(",")}`; }

function calculateSizeMixScore(assignments: number[][], layers: number[]) {
  return layers.reduce((score, layerCount, layIndex) => {
    const activeRanks = assignments.flatMap((frequencies, rank) => frequencies[layIndex] > 0 ? [rank] : []);
    if (activeRanks.length < 2) return score;
    return score + (activeRanks.at(-1)! - activeRanks[0]) * layerCount;
  }, 0);
}

function solveLayerSet(entries: Array<[string, number]>, layers: number[], type: FabricType, cache: Map<string, SizeAssignment[]>): SolvedPlan[] {
  let states = new Map<string, PartialPlan[]>([[`0:${layers.map(() => 0).join(",")}`, [{ assignments: [], counts: layers.map(() => 0), totalFrequency: 0, usedMask: 0 }]]]);
  for (const [, quantity] of entries) {
    const options = getSizeAssignments(quantity, layers, type, cache); if (!options.length) return [];
    const nextStates = new Map<string, PartialPlan[]>();
    for (const plans of states.values()) for (const plan of plans) for (const option of options) {
      const counts = plan.counts.map((count, index) => count + Number(option.frequencies[index] > 0));
      if (counts.some((count) => count > MAX_SIZES_PER_MARKER)) continue;
      const usedMask = option.frequencies.reduce((mask, frequency, index) => mask | (frequency > 0 ? 1 << index : 0), plan.usedMask);
      const assignments = [...plan.assignments, option.frequencies];
      const candidate = { assignments, counts, sizeMixScore: calculateSizeMixScore(assignments, layers), totalFrequency: plan.totalFrequency + option.totalFrequency, usedMask };
      const key = partialKey(candidate); const bucket = nextStates.get(key) ?? []; bucket.push(candidate);
      bucket.sort((a, b) => (b.sizeMixScore ?? 0) - (a.sizeMixScore ?? 0) || a.totalFrequency - b.totalFrequency); nextStates.set(key, bucket.slice(0, SOLUTIONS_PER_LAYER_SET));
    }
    states = nextStates;
  }
  const fullMask = (1 << layers.length) - 1;
  return [...states.values()].flat().filter((plan) => plan.usedMask === fullMask).map((plan) => buildSolution(entries, layers, plan.assignments));
}

function buildSolution(entries: Array<[string, number]>, layers: number[], assignments: number[][]): SolvedPlan {
  const lays = layers.map((layerCount, layIndex) => ({ layers: layerCount, frequencies: entries.flatMap(([size], sizeIndex) => { const frequency = assignments[sizeIndex][layIndex]; return frequency ? [{ size, frequency }] : []; }) }));
  const markerTotals = lays.map((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0));
  const metrics = { totalFrequency: markerTotals.reduce((sum, value) => sum + value, 0), peakFrequency: Math.max(...markerTotals), sizeMixScore: calculateSizeMixScore(assignments, layers), totalLayers: layers.reduce((sum, value) => sum + value, 0), sizeEntries: lays.reduce((sum, lay) => sum + lay.frequencies.length, 0) };
  const signature = lays.map((lay) => `${lay.layers}:${lay.frequencies.map((item) => `${item.size}=${item.frequency}`).join(",")}`).join("|");
  return { lays, metrics, signature };
}

function compareSolutions(a: SolvedPlan, b: SolvedPlan) {
  return a.lays.length - b.lays.length
    || b.metrics.sizeMixScore - a.metrics.sizeMixScore
    || a.metrics.totalFrequency - b.metrics.totalFrequency
    || a.metrics.peakFrequency - b.metrics.peakFrequency
    || a.metrics.sizeEntries - b.metrics.sizeEntries
    || a.metrics.totalLayers - b.metrics.totalLayers
    || a.signature.localeCompare(b.signature);
}

export function solveMinimumLays(quantities: Map<string, number>, maxLayers: number, type: FabricType, fallbackLayCount: number): SolvedPlan[] {
  const entries = [...quantities.entries()].sort(([left], [right]) => compareUniformSizes(left, right)); if (!entries.length) return [];
  const lowerBound = Math.max(1, Math.ceil(Math.max(...entries.map(([, quantity]) => quantity)) / (MAX_FREQUENCY * maxLayers)));
  const upperBound = Math.min(MAX_EXACT_LAYS, fallbackLayCount);
  const cache = new Map<string, SizeAssignment[]>();
  for (let count = lowerBound; count <= upperBound; count += 1) {
    const found = new Map<string, SolvedPlan>();
    for (const layers of generateLayerSets(maxLayers, count)) for (const solution of solveLayerSet(entries, layers, type, cache)) {
      const existing = found.get(solution.signature); if (!existing || compareSolutions(solution, existing) < 0) found.set(solution.signature, solution);
    }
    if (found.size) return [...found.values()].sort(compareSolutions).slice(0, MAX_RETURNED_SOLUTIONS);
  }
  return [];
}
