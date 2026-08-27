import { compareUniformSizes } from "../../lib/uniform-sizes.ts";
import { buildSizeProfileIndex, calculateMarkerAreaLengthCm, normalizeCutPlanSizeKey } from "./dimensions.ts";
import { parseCutPlanDemandKey, type CutPlanSizeProfile, type FabricType, type MarkerFrequency, type SleeveType } from "./model.ts";

export type SolvedLay = { layers: number; frequencies: MarkerFrequency[]; markerLengthCm?: number };
export type SolverMetrics = {
  totalFrequency: number;
  peakFrequency: number;
  sizeSpreadScore: number;
  totalLayers: number;
  totalMarkerLengthCm: number;
  sizeEntries: number;
};
export type SolvedPlan = { lays: SolvedLay[]; metrics: SolverMetrics; signature: string; searchComplete: boolean };

export type SolverConstraints = {
  tableLengthCm: number;
  fabricWidthCm: number;
  sizeProfiles: CutPlanSizeProfile[];
  maxSizesPerMarker?: number;
  maxFrequency?: number;
};

const DEFAULT_MAX_SIZES_PER_MARKER = 5;
const MAX_EXACT_LAYS = 4;
const SOLUTIONS_PER_STATE = 6;
const MAX_RETURNED_SOLUTIONS = 8;
const MAX_LAYER_SETS_PER_LAY_COUNT = 350_000;
const MAX_SOLVER_DURATION_MS = 1_500;

type RankedEntry = { size: string; sleeveType: SleeveType; quantity: number; rank: number };
type SizeAssignment = { frequencies: number[]; markerLengths: number[]; totalFrequency: number };
type PartialPlan = {
  assignments: number[][];
  counts: number[];
  markerLengths: number[];
  sizeSpreadScore: number;
  totalFrequency: number;
  usedMask: number;
};
type SearchBudget = { startedAt: number; operations: number };

function budgetExhausted(budget: SearchBudget) {
  budget.operations += 1;
  return budget.operations % 2_048 === 0 && Date.now() - budget.startedAt >= MAX_SOLVER_DURATION_MS;
}

function frequencyOptions(type: FabricType, maxFrequency: number) {
  const step = type === "TUBULAR" ? 2 : 1;
  return [0, ...Array.from({ length: Math.floor(maxFrequency / step) }, (_, index) => (index + 1) * step)];
}

function *generateLayerSets(maxLayers: number, count: number, ceiling = maxLayers, prefix: number[] = []): Generator<number[]> {
  if (count === 0) {
    yield prefix;
    return;
  }
  for (let layers = ceiling; layers >= 1; layers -= 1) {
    yield *generateLayerSets(maxLayers, count - 1, layers, [...prefix, layers]);
  }
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

function canRepresentAllQuantities(entries: RankedEntry[], layers: number[], type: FabricType, maxFrequency: number) {
  const totalCapacity = layers.reduce((sum, layer) => sum + layer * maxFrequency, 0);
  const divisor = layers.reduce(greatestCommonDivisor) * (type === "TUBULAR" ? 2 : 1);
  const minimumFrequency = type === "TUBULAR" ? 2 : 1;
  const maximumQuantity = Math.max(...entries.map(({ quantity }) => quantity));
  // Todo enfesto precisa aparecer em pelo menos um tamanho. Uma quantidade
  // menor que folhas x frequencia minima jamais consegue usar esse enfesto.
  if (layers.some((layer) => layer * minimumFrequency > maximumQuantity)) return false;
  return entries.every(({ quantity }) => quantity <= totalCapacity && quantity % divisor === 0);
}

function assignmentKey(quantity: number, layers: number[], type: FabricType, lengthPerFrequency: number, maxFrequency: number) {
  return `${type}:${quantity}:${layers.join(",")}:${lengthPerFrequency.toFixed(6)}:${maxFrequency}`;
}

function getSizeAssignments(
  entry: RankedEntry,
  layers: number[],
  type: FabricType,
  lengthPerFrequency: number,
  tableLengthCm: number,
  maxFrequency: number,
  cache: Map<string, SizeAssignment[]>,
) {
  const key = assignmentKey(entry.quantity, layers, type, lengthPerFrequency, maxFrequency);
  const cached = cache.get(key);
  if (cached) return cached;

  const result: SizeAssignment[] = [];
  const options = frequencyOptions(type, maxFrequency);
  const remainingCapacities = layers.map((_, index) => layers.slice(index + 1).reduce((sum, layer) => sum + layer * maxFrequency, 0));

  function visit(index: number, remaining: number, values: number[]) {
    if (index === layers.length) {
      if (remaining === 0) {
        result.push({
          frequencies: values,
          markerLengths: values.map((frequency) => frequency * lengthPerFrequency),
          totalFrequency: values.reduce((sum, value) => sum + value, 0),
        });
      }
      return;
    }
    for (const frequency of options) {
      const next = remaining - frequency * layers[index];
      if (next < 0 || next > remainingCapacities[index]) continue;
      if (frequency * lengthPerFrequency > tableLengthCm) continue;
      visit(index + 1, next, [...values, frequency]);
    }
  }

  visit(0, entry.quantity, []);
  result.sort((a, b) => a.totalFrequency - b.totalFrequency || compareNumbers(a.frequencies, b.frequencies));
  cache.set(key, result);
  return result;
}

function compareNumbers(a: number[], b: number[]) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function partialKey(plan: PartialPlan) {
  const lengths = plan.markerLengths.map((length) => length.toFixed(6)).join(",");
  return `${plan.usedMask}:${plan.counts.join(",")}:${lengths}`;
}

function calculateSizeSpreadScore(assignments: number[][], layers: number[]) {
  return layers.reduce((score, layerCount, layIndex) => {
    const activeRanks = assignments.flatMap((frequencies, rank) => frequencies?.[layIndex] > 0 ? [rank] : []);
    if (activeRanks.length < 2) return score;
    return score + (activeRanks.at(-1)! - activeRanks[0]) * layerCount;
  }, 0);
}

function solveLayerSet(
  entries: RankedEntry[],
  layers: number[],
  type: FabricType,
  constraints: SolverConstraints,
  cache: Map<string, SizeAssignment[]>,
  budget: SearchBudget,
) {
  const profileIndex = buildSizeProfileIndex(constraints.sizeProfiles);
  const prepared = entries.map((entry) => {
    const profile = profileIndex.get(normalizeCutPlanSizeKey(entry.size));
    const lengthPerFrequency = profile
      ? calculateMarkerAreaLengthCm(profile, entry.sleeveType, type, constraints.fabricWidthCm, 1)
      : 0;
    return {
      entry,
      options: getSizeAssignments(entry, layers, type, lengthPerFrequency, constraints.tableLengthCm, constraints.maxFrequency ?? 8, cache),
    };
  });
  if (prepared.some(({ options }) => options.length === 0)) return [];

  // Tamanhos mais restritos primeiro reduzem a DP sem alterar o rank fisico.
  prepared.sort((a, b) => a.options.length - b.options.length || b.entry.quantity - a.entry.quantity || a.entry.rank - b.entry.rank);
  const emptyAssignments = entries.map(() => [] as number[]);
  const initialPlan: PartialPlan = {
    assignments: emptyAssignments,
    counts: layers.map(() => 0),
    markerLengths: layers.map(() => 0),
    sizeSpreadScore: 0,
    totalFrequency: 0,
    usedMask: 0,
  };
  let states = new Map<string, PartialPlan[]>([[partialKey(initialPlan), [initialPlan]]]);
  const maxSizesPerMarker = constraints.maxSizesPerMarker ?? DEFAULT_MAX_SIZES_PER_MARKER;

  for (const { entry, options } of prepared) {
    const nextStates = new Map<string, PartialPlan[]>();
    for (const plans of states.values()) for (const plan of plans) for (const option of options) {
      if (budgetExhausted(budget)) return null;
      const counts = plan.counts.map((count, index) => count + Number(option.frequencies[index] > 0));
      if (counts.some((count) => count > maxSizesPerMarker)) continue;
      const markerLengths = plan.markerLengths.map((length, index) => length + option.markerLengths[index]);
      if (markerLengths.some((length) => length > constraints.tableLengthCm + Number.EPSILON)) continue;
      const usedMask = option.frequencies.reduce((mask, frequency, index) => mask | (frequency > 0 ? 1 << index : 0), plan.usedMask);
      const assignments = plan.assignments.map((frequencies, rank) => rank === entry.rank ? option.frequencies : frequencies);
      const candidate: PartialPlan = {
        assignments,
        counts,
        markerLengths,
        sizeSpreadScore: calculateSizeSpreadScore(assignments, layers),
        totalFrequency: plan.totalFrequency + option.totalFrequency,
        usedMask,
      };
      const key = partialKey(candidate);
      const bucket = nextStates.get(key) ?? [];
      bucket.push(candidate);
      bucket.sort(comparePartialPlans);
      nextStates.set(key, bucket.slice(0, SOLUTIONS_PER_STATE));
    }
    states = nextStates;
    if (!states.size) return [];
  }

  const fullMask = (1 << layers.length) - 1;
  return [...states.values()]
    .flat()
    .filter((plan) => plan.usedMask === fullMask)
    .map((plan) => buildSolution(entries, layers, plan, true));
}

function comparePartialPlans(a: PartialPlan, b: PartialPlan) {
  return b.sizeSpreadScore - a.sizeSpreadScore
    || a.totalFrequency - b.totalFrequency
    || compareNumbers(a.markerLengths, b.markerLengths);
}

function buildSolution(entries: RankedEntry[], layers: number[], plan: PartialPlan, searchComplete: boolean): SolvedPlan {
  const lays = layers.map((layerCount, layIndex) => ({
    layers: layerCount,
    frequencies: entries.flatMap(({ size, sleeveType, rank }) => {
      const frequency = plan.assignments[rank][layIndex];
      return frequency ? [{ size, sleeveType, frequency }] : [];
    }),
    ...(plan.markerLengths[layIndex] > 0 ? { markerLengthCm: Math.ceil(plan.markerLengths[layIndex]) } : {}),
  }));
  const markerTotals = lays.map((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0));
  const metrics = {
    totalFrequency: markerTotals.reduce((sum, value) => sum + value, 0),
    peakFrequency: Math.max(...markerTotals),
    sizeSpreadScore: calculateSizeSpreadScore(plan.assignments, layers),
    totalLayers: layers.reduce((sum, value) => sum + value, 0),
    totalMarkerLengthCm: plan.markerLengths.reduce((sum, value) => sum + value, 0),
    sizeEntries: lays.reduce((sum, lay) => sum + lay.frequencies.length, 0),
  };
  const signature = lays.map((lay) => `${lay.layers}:${lay.frequencies.map((item) => `${item.size}:${item.sleeveType}=${item.frequency}`).join(",")}`).join("|");
  return { lays, metrics, signature, searchComplete };
}

function compareSolutions(a: SolvedPlan, b: SolvedPlan) {
  return a.lays.length - b.lays.length
    || b.metrics.totalLayers - a.metrics.totalLayers
    || a.metrics.totalMarkerLengthCm - b.metrics.totalMarkerLengthCm
    || b.metrics.sizeSpreadScore - a.metrics.sizeSpreadScore
    || a.metrics.totalFrequency - b.metrics.totalFrequency
    || a.metrics.peakFrequency - b.metrics.peakFrequency
    || a.metrics.sizeEntries - b.metrics.sizeEntries
    || a.metrics.totalLayers - b.metrics.totalLayers
    || a.signature.localeCompare(b.signature);
}

export function solveMinimumLays(
  quantities: Map<string, number>,
  maxLayers: number,
  type: FabricType,
  fallbackLayCount: number,
  constraints: SolverConstraints,
): SolvedPlan[] {
  const ordered = [...quantities.entries()].sort(([left], [right]) => {
    const leftDemand = parseCutPlanDemandKey(left);
    const rightDemand = parseCutPlanDemandKey(right);
    return compareUniformSizes(leftDemand.size, rightDemand.size) || leftDemand.sleeveType.localeCompare(rightDemand.sleeveType);
  });
  if (!ordered.length) return [];
  const entries = ordered.map(([key, quantity], rank) => ({ ...parseCutPlanDemandKey(key), quantity, rank }));
  const maxSizesPerMarker = constraints.maxSizesPerMarker ?? DEFAULT_MAX_SIZES_PER_MARKER;
  const maxFrequency = constraints.maxFrequency ?? 8;
  const lowerBound = Math.max(
    1,
    Math.ceil(entries.length / maxSizesPerMarker),
    Math.ceil(Math.max(...entries.map(({ quantity }) => quantity)) / (maxFrequency * maxLayers)),
  );
  const upperBound = Math.min(MAX_EXACT_LAYS, fallbackLayCount);
  const cache = new Map<string, SizeAssignment[]>();
  const budget: SearchBudget = { startedAt: Date.now(), operations: 0 };
  const minimumFrequency = type === "TUBULAR" ? 2 : 1;
  const searchMaxLayers = Math.min(maxLayers, Math.floor(Math.max(...entries.map(({ quantity }) => quantity)) / minimumFrequency));

  for (let count = lowerBound; count <= upperBound; count += 1) {
    const found = new Map<string, SolvedPlan>();
    let examined = 0;
    let searchComplete = true;
    for (const layers of generateLayerSets(searchMaxLayers, count)) {
      examined += 1;
      if (examined > MAX_LAYER_SETS_PER_LAY_COUNT) {
        searchComplete = false;
        break;
      }
      if (!canRepresentAllQuantities(entries, layers, type, maxFrequency)) continue;
      const layerSolutions = solveLayerSet(entries, layers, type, constraints, cache, budget);
      if (layerSolutions === null) {
        return [...found.values()]
          .map((solution) => ({ ...solution, searchComplete: false }))
          .sort(compareSolutions)
          .slice(0, MAX_RETURNED_SOLUTIONS);
      }
      for (const solution of layerSolutions) {
        solution.searchComplete = searchComplete;
        const existing = found.get(solution.signature);
        if (!existing || compareSolutions(solution, existing) < 0) found.set(solution.signature, solution);
      }
    }
    if (found.size) {
      return [...found.values()]
        .map((solution) => ({ ...solution, searchComplete }))
        .sort(compareSolutions)
        .slice(0, MAX_RETURNED_SOLUTIONS);
    }
    if (!searchComplete) return [];
  }
  return [];
}
