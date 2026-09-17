import { compareUniformSizes } from "../../lib/uniform-sizes.ts";
import { buildSizeProfileIndex, calculateEntryLengthPerFrequencyCm, fitsTable, getDefaultMaximumFrequency, isPantsCutPlanSize, maximumFrequencyForLength, tableCapacityCm } from "./dimensions.ts";
import { parseCutPlanDemandKey, type CutPlanSizeProfile, type FabricType, type GarmentType, type MarkerFrequency, type SleeveType } from "./model.ts";
import { checkSearchBudget, createSearchBudget, SearchInterrupted, type SearchBudget } from "./search-budget.ts";

export type SolvedLay = { layers: number; frequencies: MarkerFrequency[]; markerLengthCm?: number };
export const SIZE_ENTRY_IMBALANCE_PENALTY = 0.05;
export type SolverMetrics = {
  totalFrequency: number;
  peakFrequency: number;
  sizeSpreadScore: number;
  totalLayers: number;
  totalMarkerLengthCm: number;
  sizeEntries: number;
  minimumSizeEntriesPerLay: number;
  sizeEntryImbalance: number;
  sparseLayCount: number;
  singleLayerLayCount: number;
  singleMoldLayCount: number;
  layerHeightImbalance: number;
  balanceAdjustedMarkerLengthCm: number;
};
export type SolvedPlan = { lays: SolvedLay[]; metrics: SolverMetrics; signature: string; searchComplete: boolean };

export type SolverConstraints = {
  tableLengthCm: number;
  fabricWidthCm: number;
  sizeProfiles: CutPlanSizeProfile[];
  maxFrequency?: number;
  /** Quantidades de enfestos acima do mínimo que também devem ser exploradas. */
  additionalLayCounts?: number;
  budget?: SearchBudget;
  onSolution?: (solution: SolvedPlan) => void;
};

// Limita apenas o pool de alternativas completas, nunca a prova do melhor plano.
const MAX_RETURNED_SOLUTIONS = 128;
const MAX_STATES = 150_000;
const RETAINED_STATES_AFTER_COMPACTION = 100_000;

type RankedEntry = { garmentType: GarmentType; size: string; sleeveType: SleeveType; quantity: number; rank: number; length: number; measured: boolean; maxFrequency: number };
type SizeAssignment = { frequencies: number[]; markerLengths: number[]; totalFrequency: number };
type PartialPlan = {
  assignments: number[][];
  markerLengths: number[];
  sizeSpreadScore: number;
  totalFrequency: number;
  usedMask: bigint;
};

function *generateLayerSets(maxLayers: number, count: number, budget: SearchBudget, ceiling = maxLayers, prefix: number[] = []): Generator<number[]> {
  checkSearchBudget(budget);
  if (count === 0) {
    yield prefix;
    return;
  }
  for (let layers = ceiling; layers >= 1; layers -= 1) {
    yield *generateLayerSets(maxLayers, count - 1, budget, layers, [...prefix, layers]);
  }
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

function canRepresentAllQuantities(entries: RankedEntry[], layers: number[], type: FabricType, maxFrequency: number) {
  const totalLayers = layers.reduce((sum, layer) => sum + layer, 0);
  const divisor = layers.reduce(greatestCommonDivisor) * (type === "TUBULAR" ? 2 : 1);
  const minimumFrequency = type === "TUBULAR" ? 2 : 1;
  const maximumQuantity = Math.max(...entries.map(({ quantity }) => quantity));
  // Todo enfesto precisa aparecer em pelo menos um tamanho. Uma quantidade
  // menor que folhas x frequencia minima jamais consegue usar esse enfesto.
  if (layers.some((layer) => layer * minimumFrequency > maximumQuantity)) return false;
  return entries.every(({ quantity, maxFrequency: limit }) => quantity <= totalLayers * Math.min(limit, maxFrequency) && quantity % divisor === 0);
}

function assignmentKey(quantity: number, layers: number[], type: FabricType, lengthPerFrequency: number, maxFrequency: number) {
  return `${type}:${quantity}:${layers.join(",")}:${lengthPerFrequency}:${maxFrequency}`;
}

function getSizeAssignments(
  entry: RankedEntry,
  layers: number[],
  type: FabricType,
  lengthPerFrequency: number,
  tableLengthCm: number,
  maxFrequency: number,
  cache: Map<string, SizeAssignment[]>,
  budget: SearchBudget,
) {
  const key = assignmentKey(entry.quantity, layers, type, lengthPerFrequency, maxFrequency);
  const cached = cache.get(key);
  if (cached) return cached;

  const result: SizeAssignment[] = [];
  const step = type === "TUBULAR" ? 2 : 1;
  const remainingCapacities = layers.map((_, index) => layers.slice(index + 1).reduce((sum, layer) => sum + layer * maxFrequency, 0));
  const suffixDivisors = layers.map((_, index) => layers.slice(index + 1).reduce(greatestCommonDivisor, 0) * step);

  function visit(index: number, remaining: number, values: number[]) {
    checkSearchBudget(budget);
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
    if (index === layers.length - 1) {
      const frequency = remaining / layers[index];
      if (Number.isInteger(frequency) && frequency % step === 0 && frequency <= maxFrequency && fitsTable(frequency * lengthPerFrequency, tableLengthCm)) visit(index + 1, 0, [...values, frequency]);
      return;
    }
    const lower = step * Math.ceil(Math.max(0, Math.ceil((remaining - remainingCapacities[index]) / layers[index])) / step);
    const upper = Math.min(maxFrequency, Math.floor(remaining / layers[index]));
    for (let frequency = lower; frequency <= upper; frequency += step) {
      checkSearchBudget(budget);
      const next = remaining - frequency * layers[index];
      if (next < 0 || next > remainingCapacities[index]) continue;
      if (next % suffixDivisors[index] !== 0) continue;
      if (!fitsTable(frequency * lengthPerFrequency, tableLengthCm)) continue;
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
  // Mesmo recurso + extremos + frequência por enfesto => mesmas continuações
  // para todos os critérios. Só o menor número de entradas precisa sobreviver.
  const columns = plan.markerLengths.map((length, index) => {
    const active = plan.assignments.flatMap((values, rank) => values[index] > 0 ? [rank] : []);
    const frequency = plan.assignments.reduce((sum, values) => sum + (values[index] ?? 0), 0);
    return [length, active[0] ?? -1, active.at(-1) ?? -1, active.length, frequency];
  });
  return JSON.stringify(columns);
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
  onComplete: (solution: SolvedPlan) => void,
) {
  let pruned = false;
  const prepared = entries.map((entry) => {
    return {
      entry,
      options: getSizeAssignments(entry, layers, type, entry.length, constraints.tableLengthCm, entry.maxFrequency, cache, budget),
    };
  });
  if (prepared.some(({ options }) => options.length === 0)) return pruned;

  // Tamanhos mais restritos primeiro reduzem a DP sem alterar o rank fisico.
  prepared.sort((a, b) => a.options.length - b.options.length || b.entry.quantity - a.entry.quantity || a.entry.rank - b.entry.rank);
  const emptyAssignments = entries.map(() => [] as number[]);
  const initialPlan: PartialPlan = {
    assignments: emptyAssignments,
    markerLengths: layers.map(() => 0),
    sizeSpreadScore: 0,
    totalFrequency: 0,
    usedMask: BigInt(0),
  };
  let states = new Map<string, PartialPlan>([[partialKey(initialPlan), initialPlan]]);
  const fullMask = (BigInt(1) << BigInt(layers.length)) - BigInt(1);
  let bestComplete: SolvedPlan | undefined;
  for (const [stage, { entry, options }] of prepared.entries()) {
    const nextStates = new Map<string, PartialPlan>();
    for (const plan of states.values()) for (const option of options) {
      checkSearchBudget(budget);
      const markerLengths = plan.markerLengths.map((length, index) => length + option.markerLengths[index]);
      if (markerLengths.some((length) => !fitsTable(length, constraints.tableLengthCm))) continue;
      const markerFrequencies = layers.map((_, index) => plan.assignments.reduce((sum, values) => sum
        + (values[index] ?? 0), 0) + option.frequencies[index]);
      if (markerFrequencies.some((frequency) => frequency > (constraints.maxFrequency ?? getDefaultMaximumFrequency(type)))) continue;
      const usedMask = option.frequencies.reduce((mask, frequency, index) => mask | (frequency > 0 ? BigInt(1) << BigInt(index) : BigInt(0)), plan.usedMask);
      const assignments = plan.assignments.map((frequencies, rank) => rank === entry.rank ? option.frequencies : frequencies);
      const candidate: PartialPlan = {
        assignments,
        markerLengths,
        sizeSpreadScore: calculateSizeSpreadScore(assignments, layers),
        totalFrequency: plan.totalFrequency + option.totalFrequency,
        usedMask,
      };
      // A última etapa já produz planos completos. Guarda/publica imediatamente
      // o melhor, inclusive se o prazo expirar antes de terminar esta altura.
      if (stage === prepared.length - 1) {
        if (usedMask === fullMask) {
          const solution = buildSolution(entries, layers, candidate, false, type);
          if (!bestComplete || compareSolutions(solution, bestComplete) < 0) {
            bestComplete = solution;
            onComplete(solution);
          }
        }
        continue;
      }
      const key = partialKey(candidate);
      const existing = nextStates.get(key);
      if (!existing || comparePartialPlans(candidate, existing) < 0) nextStates.set(key, candidate);
      if (nextStates.size > MAX_STATES) {
        const kept = [...nextStates.entries()]
          .sort(([, left], [, right]) => comparePartialPlans(left, right))
          .slice(0, RETAINED_STATES_AFTER_COMPACTION);
        nextStates.clear();
        for (const [stateKey, state] of kept) nextStates.set(stateKey, state);
        pruned = true;
      }
    }
    states = nextStates;
    if (!states.size) return pruned;
  }
  return pruned;
}

function comparePartialPlans(a: PartialPlan, b: PartialPlan) {
  const entries = (plan: PartialPlan) => plan.assignments.reduce((sum, values) => sum + values.filter((value) => value > 0).length, 0);
  return b.sizeSpreadScore - a.sizeSpreadScore
    || a.totalFrequency - b.totalFrequency
    || compareNumbers(a.markerLengths, b.markerLengths)
    || entries(a) - entries(b)
    || JSON.stringify(a.assignments).localeCompare(JSON.stringify(b.assignments));
}

function buildSolution(entries: RankedEntry[], layers: number[], plan: PartialPlan, searchComplete: boolean, type: FabricType): SolvedPlan {
  const lays = layers.map((layerCount, layIndex) => ({
    layers: layerCount,
    frequencies: entries.flatMap(({ garmentType, size, sleeveType, rank }) => {
      const frequency = plan.assignments[rank][layIndex];
      return frequency ? [{ garmentType, size, sleeveType, frequency }] : [];
    }),
    ...(entries.every((entry) => !plan.assignments[entry.rank][layIndex] || entry.measured) ? { markerLengthCm: plan.markerLengths[layIndex] } : {}),
  }));
  const markerTotals = lays.map((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0));
  const entriesPerLay = lays.map((lay) => lay.frequencies.length);
  const sizeEntryImbalance = entriesPerLay.reduce((total, count, index) => total
    + entriesPerLay.slice(index + 1).reduce((sum, other) => sum + Math.abs(count - other), 0), 0);
  const totalMarkerLengthCm = plan.markerLengths.reduce((sum, value) => sum + value, 0);
  const metrics = {
    totalFrequency: markerTotals.reduce((sum, value) => sum + value, 0),
    peakFrequency: Math.max(...markerTotals),
    sizeSpreadScore: calculateSizeSpreadScore(plan.assignments, layers),
    totalLayers: layers.reduce((sum, value) => sum + value, 0),
    totalMarkerLengthCm,
    sizeEntries: lays.reduce((sum, lay) => sum + lay.frequencies.length, 0),
    minimumSizeEntriesPerLay: Math.min(...entriesPerLay),
    sizeEntryImbalance,
    sparseLayCount: entriesPerLay.filter((count) => count <= 2).length,
    singleMoldLayCount: lays.filter((lay) => hasSingleMold(lay.frequencies, type)).length,
    singleLayerLayCount: layers.filter((count) => count === 1).length,
    layerHeightImbalance: Math.max(...layers) / Math.min(...layers),
    balanceAdjustedMarkerLengthCm: totalMarkerLengthCm * (1 + sizeEntryImbalance * SIZE_ENTRY_IMBALANCE_PENALTY),
  };
  const signature = lays.map((lay) => `${lay.layers}:${lay.frequencies.map((item) => `${item.garmentType ?? "T_SHIRT"}:${item.size}:${item.sleeveType}=${item.frequency}`).join(",")}`).join("|");
  return { lays, metrics, signature, searchComplete };
}

export function compareSolutions(a: SolvedPlan, b: SolvedPlan) {
  return compareSolutionMetrics(a, b) || a.signature.localeCompare(b.signature);
}

export function compareSolutionMetrics(a: SolvedPlan, b: SolvedPlan) {
  return a.lays.length - b.lays.length
    || a.metrics.singleMoldLayCount - b.metrics.singleMoldLayCount
    || a.metrics.singleLayerLayCount - b.metrics.singleLayerLayCount
    || a.metrics.balanceAdjustedMarkerLengthCm - b.metrics.balanceAdjustedMarkerLengthCm
    || a.metrics.sparseLayCount - b.metrics.sparseLayCount
    || a.metrics.totalMarkerLengthCm - b.metrics.totalMarkerLengthCm
    || b.metrics.minimumSizeEntriesPerLay - a.metrics.minimumSizeEntriesPerLay
    || a.metrics.layerHeightImbalance - b.metrics.layerHeightImbalance
    || b.metrics.totalLayers - a.metrics.totalLayers
    || b.metrics.sizeSpreadScore - a.metrics.sizeSpreadScore
    || a.metrics.totalFrequency - b.metrics.totalFrequency
    || a.metrics.peakFrequency - b.metrics.peakFrequency
    || a.metrics.sizeEntries - b.metrics.sizeEntries;
}

/** Avalia o incumbente construtivo pelos mesmos critérios usados pela busca. */
export function assessLays(lays: SolvedLay[], quantities: Map<string, number>, type: FabricType, constraints: SolverConstraints): SolvedPlan {
  const index = buildSizeProfileIndex(constraints.sizeProfiles);
  const entries: RankedEntry[] = [...quantities].sort(([left], [right]) => {
    const a = parseCutPlanDemandKey(left), b = parseCutPlanDemandKey(right);
    return compareUniformSizes(a.size, b.size) || a.sleeveType.localeCompare(b.sleeveType) || left.localeCompare(right);
  }).map(([key, quantity], rank) => {
    const demand = parseCutPlanDemandKey(key);
    const length = calculateEntryLengthPerFrequencyCm(demand.size, demand.sleeveType, type, constraints.fabricWidthCm, index, demand.garmentType);
    return { ...demand, quantity, rank, length: length ?? 0, measured: length !== null, maxFrequency: 0 };
  });
  const assignments = entries.map((entry) => lays.map((lay) => lay.frequencies.find((item) => item.size === entry.size && item.sleeveType === entry.sleeveType
    && (item.garmentType ?? "T_SHIRT") === entry.garmentType)?.frequency ?? 0));
  const markerLengths = lays.map((_, j) => entries.reduce((sum, entry) => sum + entry.length * assignments[entry.rank][j], 0));
  return buildSolution(entries, lays.map((lay) => lay.layers), { assignments, markerLengths, totalFrequency: 0, sizeSpreadScore: 0, usedMask: BigInt(0) }, false, type);
}

export function solveMinimumLays(
  quantities: Map<string, number>,
  maxLayers: number,
  type: FabricType,
  fallbackLayCount: number,
  constraints: SolverConstraints,
): SolvedPlan[] {
  const budget = constraints.budget ?? createSearchBudget();
  const maxFrequency = constraints.maxFrequency ?? getDefaultMaximumFrequency(type);
  if (!Number.isSafeInteger(maxLayers) || maxLayers < 1 || !Number.isSafeInteger(maxFrequency) || maxFrequency < 1
    || !Number.isFinite(constraints.tableLengthCm) || constraints.tableLengthCm <= 0
    || !Number.isFinite(constraints.fabricWidthCm) || constraints.fabricWidthCm <= 0) throw new Error("Limites de corte inválidos.");
  const ordered = [...quantities.entries()].sort(([left], [right]) => {
    const a = parseCutPlanDemandKey(left), b = parseCutPlanDemandKey(right);
    return compareUniformSizes(a.size, b.size) || a.sleeveType.localeCompare(b.sleeveType) || left.localeCompare(right);
  });
  if (!ordered.length) return [];
  if (ordered.some(([, quantity]) => !Number.isSafeInteger(quantity) || quantity < 1)) throw new Error("Quantidades de corte inválidas.");
  const step = type === "TUBULAR" ? 2 : 1;
  if (ordered.some(([, quantity]) => quantity % step !== 0)) return [];
  const profileIndex = buildSizeProfileIndex(constraints.sizeProfiles);
  const entries: RankedEntry[] = ordered.map(([key, quantity], rank) => {
    const demand = parseCutPlanDemandKey(key);
    const length = calculateEntryLengthPerFrequencyCm(demand.size, demand.sleeveType, type, constraints.fabricWidthCm, profileIndex, demand.garmentType);
    const configured = Math.min(maxFrequency, demand.garmentType === "PANTS" || isPantsCutPlanSize(demand.size) ? step : maxFrequency, quantity);
    const limit = maximumFrequencyForLength(length, constraints.tableLengthCm, configured, step);
    return { ...demand, quantity, rank, length: length ?? 0, measured: length !== null, maxFrequency: limit };
  });
  if (entries.some((entry) => entry.maxFrequency < step)) return [];
  const volume = entries.reduce((sum, entry) => sum + entry.quantity * entry.length, 0);
  const volumeTolerance = Number.EPSILON * Math.max(1, volume) * entries.length * 8;
  const lowerBound = Math.max(1, Math.ceil(Math.max(0, volume - volumeTolerance) / (maxLayers * tableCapacityCm(constraints.tableLengthCm))),
    Math.ceil(entries.reduce((sum, entry) => sum + entry.quantity, 0) / (maxFrequency * maxLayers)),
    ...entries.map((entry) => Math.ceil(entry.quantity / (entry.maxFrequency * maxLayers))));
  const additional = constraints.additionalLayCounts ?? 0;
  const upperBound = fallbackLayCount + additional;
  const searchMaxLayers = Math.min(maxLayers, Math.floor(Math.max(...entries.map((entry) => entry.quantity)) / step));
  const collected = new Map<string, SolvedPlan>();
  let best: SolvedPlan | undefined;
  let lastCountToSearch = upperBound;
  let complete = true;
  // Um representante por configuração de folhas protege opções úteis à mesclagem.
  const retain = (solution: SolvedPlan) => {
    const key = solution.lays.map((lay) => lay.layers).join(",");
    const previous = collected.get(key);
    if (!previous || compareSolutions(solution, previous) < 0) collected.set(key, solution);
    if (!best || compareSolutions(solution, best) < 0) {
      best = solution;
      constraints.onSolution?.({ ...solution, searchComplete: false });
    }
    if (collected.size > MAX_RETURNED_SOLUTIONS * 2) {
      const kept = [...collected.entries()].sort(([, a], [, b]) => compareSolutions(a, b)).slice(0, MAX_RETURNED_SOLUTIONS);
      collected.clear();
      for (const [key, value] of kept) collected.set(key, value);
    }
  };
  try {
    for (let count = lowerBound; count <= lastCountToSearch; count += 1) {
      let found = false;
      for (const layers of generateLayerSets(searchMaxLayers, count, budget)) {
        checkSearchBudget(budget);
        if (!canRepresentAllQuantities(entries, layers, type, maxFrequency)) continue;
        if (!fitsTable(volume, layers.reduce((sum, h) => sum + h, 0) * constraints.tableLengthCm)) continue;
        // O cache é local: conjuntos de folhas distintos não reutilizam atribuições.
        const pruned = solveLayerSet(entries, layers, type, constraints, new Map(), budget, (solution) => {
          found = true;
          retain(solution);
        });
        if (pruned) complete = false;
      }
      if (found) lastCountToSearch = Math.min(lastCountToSearch, count + additional);
    }
  } catch (error) {
    if (!(error instanceof SearchInterrupted)) throw error;
    complete = false;
  }
  return [...collected.values()].sort(compareSolutions).slice(0, MAX_RETURNED_SOLUTIONS)
    .map((solution) => ({ ...solution, searchComplete: complete }));
}

/** A frequência tubular conta as duas faces; avalia o mapa inteiro. */
export function hasSingleMold(frequencies: MarkerFrequency[], type: FabricType): boolean {
  return frequencies.reduce((total, marker) => total + marker.frequency, 0) === (type === "TUBULAR" ? 2 : 1);
}
