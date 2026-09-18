import { calculateCutPlan } from "./calculator.ts";
import { cutPlanDemandKey, parseCutPlanDemandKey, type CutPlanInput, type CutPlanResult, type FabricCutPlanResult, type LayPlan } from "./model.ts";
import { aggregateCutPlanItems, normalizeCutPlanInput } from "./normalization.ts";
import { checkSearchBudget, createSearchBudget, searchExpired, SearchInterrupted, sliceSearchBudget, type SearchBudget } from "./search-budget.ts";
import { buildMergedLays, calculateMergedLayLowerBound } from "./merge-solver.ts";
import { fabricCompatibilityKey, validateCutPlanSolution } from "./solution-validation.ts";
import { hasSingleMold, SIZE_ENTRY_IMBALANCE_PENALTY, solveMinimumLays } from "./solver.ts";
import { compareUniformSizes } from "../../lib/uniform-sizes.ts";
import { buildSizeProfileIndex, estimateMarkerLengthCm, getDefaultMaximumFrequency, getMaximumEstimatedFrequency } from "./dimensions.ts";

export interface CutPlanAlternative {
  id: string;
  label: string;
  description: string;
  result: CutPlanResult;
  mapCount: number;
  layCount: number;
}

function calculateIndividualPlan(input: CutPlanInput, mode: "compact" | "simple", budget: SearchBudget): CutPlanResult {
  return {
    fabrics: input.fabrics.filter((fabric) => input.items.some((item) => item.fabricId === fabric.id)).map((fabric) => {
      const requested = aggregateCutPlanItems(input, fabric.id, true);
      const operational = aggregateCutPlanItems(input, fabric.id);
      const lays: LayPlan[] = [];
      for (const [key, requestedQuantity] of operational) {
        const { garmentType, size, sleeveType } = parseCutPlanDemandKey(key);
        let remaining = fabric.type === "TUBULAR" && requestedQuantity % 2 !== 0 ? requestedQuantity + 1 : requestedQuantity;
        const configuredMaximumFrequency = input.maxFrequency ?? getDefaultMaximumFrequency(fabric.type);
        const maximumFrequency = getMaximumEstimatedFrequency(size, sleeveType, fabric.type, fabric.widthCm, input.tableLengthCm, input.sizeProfiles, configuredMaximumFrequency, garmentType);
        while (remaining > 0) {
          checkSearchBudget(budget);
          let frequency = fabric.type === "TUBULAR" ? 2 : 1;
          let layers = Math.min(input.maxLayers, remaining / frequency);
          if (mode === "compact") {
            const step = fabric.type === "TUBULAR" ? 2 : 1;
            for (let candidate = step; candidate <= maximumFrequency; candidate += step) {
              checkSearchBudget(budget);
              const candidateLayers = remaining / candidate;
              if (Number.isInteger(candidateLayers) && candidateLayers >= 1 && candidateLayers <= input.maxLayers) {
                frequency = candidate;
                layers = candidateLayers;
                break;
              }
            }
          }
          if (maximumFrequency < frequency) throw new Error(`O tamanho ${size} não cabe na menor grade.`);
          layers = Math.max(1, Math.floor(layers));
          const produced = frequency * layers;
          lays.push({ id: `${fabric.id}-${mode}-${lays.length + 1}`, fabricId: fabric.id, layers, frequencies: [{ garmentType, size, sleeveType, frequency }] });
          remaining -= produced;
        }
      }
      const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
      for (const lay of lays) {
        const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
        lay.markerLengthCm = markerLength === null ? undefined : markerLength;
      }
      return buildFabricResult(fabric.id, requested, lays);
    }),
  };
}

function buildFabricResult(fabricId: string, requested: Map<string, number>, lays: LayPlan[]): FabricCutPlanResult {
  const keys = new Set([...requested.keys(), ...lays.flatMap((lay) => lay.frequencies.map((marker) => cutPlanDemandKey(marker.size, marker.sleeveType, marker.garmentType)))]);
  const sizes = [...keys].map((key) => {
    const quantity = requested.get(key) ?? 0;
    const { garmentType, size, sleeveType } = parseCutPlanDemandKey(key);
    const produced = lays.reduce((total, lay) => total + (lay.frequencies.find((item) => item.size === size && item.sleeveType === sleeveType && (item.garmentType ?? "T_SHIRT") === garmentType)?.frequency ?? 0) * lay.layers, 0);
    return { garmentType, size, sleeveType, requested: quantity, produced, difference: produced - quantity };
  });
  return { fabricId, lays, sizes };
}

function laySignature(lay: LayPlan) {
  return JSON.stringify([lay.fabricId, lay.layers, lay.frequencies.map((item) => [item.garmentType ?? "T_SHIRT", item.size, item.sleeveType, item.frequency]).sort()]);
}

function planSignature(result: CutPlanResult) {
  return JSON.stringify(result.mergedLays
    ? result.mergedLays.map((lay) => lay.allocations.map(laySignature).sort()).sort()
    : result.fabrics.flatMap((fabric) => fabric.lays.map(laySignature)).sort());
}

function score(result: CutPlanResult, input?: CutPlanInput) {
  const fabricLays = result.fabrics.flatMap((fabric) => fabric.lays);
  const operationalLays = result.mergedLays ?? fabricLays;
  const markerFrequencies = fabricLays.map((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0));
  const complexity = markerFrequencies.reduce((total, value) => total + value, 0);
  const peakFrequency = Math.max(0, ...markerFrequencies);
  const sizeEntries = fabricLays.reduce((total, lay) => total + lay.frequencies.length, 0);
  const entriesPerLay = fabricLays.map((lay) => lay.frequencies.length);
  const minimumSizeEntriesPerLay = Math.min(...entriesPerLay);
  const sizeEntryImbalance = entriesPerLay.reduce((total, count, index) => total
    + entriesPerLay.slice(index + 1).reduce((sum, other) => sum + Math.abs(count - other), 0), 0);
  const sparseLayCount = entriesPerLay.filter((count) => count <= 2).length;
  const singleMoldLayCount = operationalLays.filter((lay) => {
    const allocations = "allocations" in lay ? lay.allocations : [lay];
    const type = input?.fabrics.find((fabric) => fabric.id === allocations[0]?.fabricId)?.type;
    return type !== undefined && hasSingleMold(allocations.flatMap((allocation) => allocation.frequencies), type);
  }).length;
  const flatSingleLayerLengthCm = operationalLays.reduce((sum, lay) => {
    const fabricId = "allocations" in lay ? lay.allocations[0]?.fabricId : lay.fabricId;
    return sum + (lay.layers === 1 && input?.fabrics.find((fabric) => fabric.id === fabricId)?.type === "PLANO" ? lay.markerLengthCm ?? 0 : 0);
  }, 0);
  const flatSingleLayerLayCount = operationalLays.filter((lay) => {
    const fabricId = "allocations" in lay ? lay.allocations[0]?.fabricId : lay.fabricId;
    return lay.layers === 1 && input?.fabrics.find((fabric) => fabric.id === fabricId)?.type === "PLANO";
  }).length;
  const singleLayerLayCount = operationalLays.filter((lay) => lay.layers === 1).length;
  const totalLayers = operationalLays.reduce((total, lay) => total + lay.layers, 0);
  const layerHeights = operationalLays.map((lay) => lay.layers);
  const layerHeightImbalance = Math.max(...layerHeights) / Math.min(...layerHeights);
  const totalMarkerLengthCm = operationalLays.reduce((total, lay) => total + (lay.markerLengthCm ?? 0), 0);
  const sizeSpreadScore = result.fabrics.reduce((total, fabric) => {
    const orderedSizes = [...new Set(fabric.sizes.map((size) => cutPlanDemandKey(size.size, size.sleeveType, size.garmentType)))].sort((left, right) => {
      const a = parseCutPlanDemandKey(left), b = parseCutPlanDemandKey(right);
      return compareUniformSizes(a.size, b.size) || a.sleeveType.localeCompare(b.sleeveType) || left.localeCompare(right);
    });
    const ranks = new Map(orderedSizes.map((size, index) => [size, index]));
    return total + fabric.lays.reduce((fabricTotal, lay) => {
      const activeRanks = lay.frequencies.map((item) => ranks.get(cutPlanDemandKey(item.size, item.sleeveType, item.garmentType)) ?? 0).sort((a, b) => a - b);
      return fabricTotal + (activeRanks.length > 1 ? (activeRanks.at(-1)! - activeRanks[0]) * lay.layers : 0);
    }, 0);
  }, 0);
  const balanceAdjustedMarkerLengthCm = totalMarkerLengthCm * (1 + sizeEntryImbalance * SIZE_ENTRY_IMBALANCE_PENALTY);
  return { mapCount: operationalLays.length, layCount: operationalLays.length, layerHeightImbalance, balanceAdjustedMarkerLengthCm, complexity, minimumSizeEntriesPerLay, peakFrequency, sizeEntries, sizeEntryImbalance, sizeSpreadScore, sparseLayCount, flatSingleLayerLengthCm, flatSingleLayerLayCount, singleMoldLayCount, singleLayerLayCount, totalLayers, totalMarkerLengthCm };
}

type Candidate = { result: CutPlanResult; description: string };

function uniqueCandidates(candidates: Candidate[]) {
  const unique = new Map<string, Candidate>();
  const certificates = (candidate: Candidate) => candidate.result.fabrics.filter((fabric) => fabric.searchComplete).length;
  for (const candidate of candidates) {
    const key = planSignature(candidate.result);
    const previous = unique.get(key);
    // Uma heurística que repetiu o mesmo plano não apaga a prova já obtida.
    if (!previous || certificates(candidate) > certificates(previous)) unique.set(key, candidate);
  }
  return [...unique.values()];
}

function compareCandidates(a: Candidate, b: Candidate, input?: CutPlanInput) {
  const left = score(a.result, input), right = score(b.result, input);
  return left.flatSingleLayerLengthCm - right.flatSingleLayerLengthCm
    || left.layCount - right.layCount
    || left.flatSingleLayerLayCount - right.flatSingleLayerLayCount
    || left.singleMoldLayCount - right.singleMoldLayCount
    || left.singleLayerLayCount - right.singleLayerLayCount
    || left.balanceAdjustedMarkerLengthCm - right.balanceAdjustedMarkerLengthCm
    || left.sparseLayCount - right.sparseLayCount
    || left.totalMarkerLengthCm - right.totalMarkerLengthCm
    || right.minimumSizeEntriesPerLay - left.minimumSizeEntriesPerLay
    || left.layerHeightImbalance - right.layerHeightImbalance
    || right.totalLayers - left.totalLayers
    || right.sizeSpreadScore - left.sizeSpreadScore
    || left.complexity - right.complexity || left.peakFrequency - right.peakFrequency
    || left.sizeEntries - right.sizeEntries || planSignature(a.result).localeCompare(planSignature(b.result));
}

export function compareCutPlanResults(a: CutPlanResult, b: CutPlanResult, input?: CutPlanInput) {
  return compareCandidates({ result: a, description: "" }, { result: b, description: "" }, input);
}

function calculateMergedVariants(input: CutPlanInput, candidates: Candidate[], budget: SearchBudget, publish: (candidates: Candidate[]) => void) {
  const active = candidates[0].result.fabrics.map((fabric) => fabric.fabricId);
  const options = active.map((id) => [...new Map(candidates.flatMap(({ result }) => result.fabrics.filter((fabric) => fabric.fabricId === id))
    .map((fabric) => [JSON.stringify(fabric.lays.map(laySignature).sort()), fabric])).values()]);
  const pool = new Map<string, Candidate>();
  let best: Candidate | undefined;
  const consider = (fabrics: FabricCutPlanResult[]) => {
    const result: CutPlanResult = { fabrics };
    result.mergedLays = buildMergedLays(input, result, budget);
    const candidate = { result, description: "Cores compatíveis com grades separadas por tecido." };
    pool.set(planSignature(result), candidate);
    if (!best || compareCandidates(candidate, best, input) < 0) { best = candidate; publish([candidate]); }
    if (pool.size > 128) {
      const kept = [...pool.values()].sort((a, b) => compareCandidates(a, b, input)).slice(0, 32);
      pool.clear();
      for (const item of kept) pool.set(planSignature(item.result), item);
    }
  };
  // Prioriza alturas compartilháveis antes do produto cartesiano completo.
  const heightSupport = new Map<number, Set<number>>();
  options.forEach((choices, index) => choices.forEach((choice) => choice.lays.forEach((lay) => {
    const support = heightSupport.get(lay.layers) ?? new Set<number>(); support.add(index); heightSupport.set(lay.layers, support);
  })));
  options.forEach((choices) => choices.sort((a, b) => {
    const support = (choice: FabricCutPlanResult) => choice.lays.reduce((sum, lay) => sum + (heightSupport.get(lay.layers)?.size ?? 0), 0) / choice.lays.length;
    return support(b) - support(a) || a.lays.length - b.lays.length;
  }));
  consider(candidates[0].result.fabrics);
  function visit(index: number, fabrics: FabricCutPlanResult[]) {
    if (searchExpired(budget)) return;
    // O número de grupos já necessários pelas cores escolhidas é um lower bound
    // seguro: tecidos futuros podem ocupar esses grupos, mas nunca eliminá-los.
    if (best && fabrics.length) {
      const partialLayCount = calculateMergedLayLowerBound(input, { fabrics });
      if (partialLayCount > best.result.mergedLays!.length) return;
    }
    if (index === options.length) { consider(fabrics); return; }
    for (const option of options[index]) {
      if (searchExpired(budget)) break;
      visit(index + 1, [...fabrics, option]);
    }
  }
  visit(0, []);
  return [...pool.values()];
}

function calculateOptimizedVariants(input: CutPlanInput, primary: CutPlanResult, budget: SearchBudget, publish: (candidates: Candidate[]) => void, interruptions: Set<SearchBudget["termination"]>) {
  const incumbent = [...primary.fabrics];
  const fabrics = primary.fabrics.map((fabricResult, fabricIndex) => {
    const fabric = input.fabrics.find((candidate) => candidate.id === fabricResult.fabricId)!;
    const requested = aggregateCutPlanItems(input, fabric.id, true);
    const operational = aggregateCutPlanItems(input, fabric.id);
    const target = new Map([...operational].map(([size, quantity]) => [size, fabric.type === "TUBULAR" && quantity % 2 !== 0 ? quantity + 1 : quantity]));
    const localBudget = sliceSearchBudget(budget, (budget.deadline - budget.now()) * (input.mergeFabricsInLays ? 0.65 : 1) / (primary.fabrics.length - fabricIndex));
    const constraints = {
      budget: localBudget,
      onSolution: (solution: import("./solver.ts").SolvedPlan) => {
        const lays = solution.lays.map((lay, index) => ({ ...lay, id: `${fabric.id}-progress-${index}`, fabricId: fabric.id }));
        const candidate = { result: { fabrics: incumbent.map((entry) => entry.fabricId === fabric.id ? buildFabricResult(fabric.id, requested, lays) : entry) }, description: "Melhor plano encontrado." };
        if (compareCandidates(candidate, { result: { fabrics: incumbent }, description: "" }, input) <= 0) {
          incumbent[fabricIndex] = candidate.result.fabrics[fabricIndex];
          publish([candidate]);
        }
      },
      tableLengthCm: input.tableLengthCm,
      fabricWidthCm: fabric.widthCm,
      sizeProfiles: input.sizeProfiles,
      maxFrequency: input.maxFrequency ?? getDefaultMaximumFrequency(fabric.type),
      // Ao mesclar cores, um plano local com mais enfestos pode alinhar alturas
      // e reduzir o total global. Nenhuma cor precisa de mais segmentos que o
      // incumbente completo do seu grupo compatível.
      additionalLayCounts: input.mergeFabricsInLays
        ? Math.max(1, primary.fabrics
          .filter((entry) => fabricCompatibilityKey(input.fabrics.find((item) => item.id === entry.fabricId)!) === fabricCompatibilityKey(fabric))
          .reduce((sum, entry) => sum + entry.lays.length, 0) - fabricResult.lays.length)
        : 1,
    };
    const allSolutions = solveMinimumLays(target, input.maxLayers, fabric.type, fabricResult.lays.length, constraints);
    const solutions = allSolutions;
    if (localBudget.termination !== "completed") interruptions.add(localBudget.termination);
    return { fabric, requested, solutions };
  });
  const variantCount = Math.max(1, ...fabrics.map((entry) => entry.solutions.length));
  const variants = Array.from({ length: variantCount }, (_, rank) => ({
    result: {
      fabrics: fabrics.map(({ fabric, requested, solutions }) => {
        const solution = solutions[rank] ?? solutions[0];
        if (!solution) return primary.fabrics.find((entry) => entry.fabricId === fabric.id)!;
        const lays = solution.lays.map((lay, index) => ({ ...lay, id: `${fabric.id}-optimized-${rank + 1}-${index + 1}`, fabricId: fabric.id }));
        return { ...buildFabricResult(fabric.id, requested, lays), searchComplete: solution.searchComplete };
      }),
    },
    description: rank === 0
      ? "Tamanhos combinados, priorizando menos enfestos e mais folhas."
      : "Outra distribuição de folhas e frequências.",
  }));
  return [{ result: { fabrics: incumbent }, description: "Melhor plano encontrado." }, ...variants];
}
export type CutPlanSearchOptions = {
  budget?: SearchBudget;
  onProgress?: (alternatives: CutPlanAlternative[]) => void;
};

export function calculateCutPlanAlternatives(rawInput: CutPlanInput, options: CutPlanSearchOptions = {}): CutPlanAlternative[] {
  const budget = options.budget ?? createSearchBudget();
  const input = normalizeCutPlanInput(rawInput);
  const interruptions = new Set<SearchBudget["termination"]>();
  const primary = calculateCutPlan(input, false, budget);
  const live = new Map<string, Candidate>();
  function finish(candidates: Candidate[], final = false): CutPlanAlternative[] {
    return uniqueCandidates(candidates)
      .sort((a, b) => compareCandidates(a, b, input)).slice(0, 4).map((candidate, index) => {
        const validation = validateCutPlanSolution(input, candidate.result);
        const termination = budget.termination !== "completed" ? budget.termination : interruptions.has("state_limit") ? "state_limit" : interruptions.has("time_limit") ? "time_limit" : "completed";
        const optimal = final && index === 0 && candidate.result.fabrics.length === 1 && !input.mergeFabricsInLays && candidate.result.fabrics[0].searchComplete && validation.measurementsComplete;
        return { id: `alternative-${index + 1}`, label: index === 0 ? "Principal" : `Opção ${index + 1}`, description: candidate.description,
          result: { ...candidate.result, search: { status: optimal ? "optimal" : "feasible", termination, measurementsComplete: validation.measurementsComplete, measurementSource: validation.measurementSource, elapsedMs: budget.now() - budget.startedAt } },
          mapCount: score(candidate.result, input).mapCount, layCount: score(candidate.result, input).layCount };
      });
  }
  function publish(candidates: Candidate[]) {
    for (const candidate of candidates) live.set(planSignature(candidate.result), candidate);
    if (live.size > 32) {
      const kept = [...live.entries()].sort(([, a], [, b]) => compareCandidates(a, b, input)).slice(0, 8);
      live.clear(); for (const [key, value] of kept) live.set(key, value);
    }
    options.onProgress?.(finish([...live.values()]));
  }
  const seed: Candidate = { result: primary, description: "Plano inicial com produção conferida." };
  // Publica cedo para permitir cancelar mantendo um plano válido.
  publish([seed]);
  const optimized = calculateOptimizedVariants(input, primary, budget, input.mergeFabricsInLays ? () => {} : publish, interruptions);
  const baseCandidates = [seed, ...optimized];
  try {
    if (!searchExpired(budget)) baseCandidates.push({ result: calculateIndividualPlan(input, "compact", budget), description: "Grades individuais com folhas e frequências ajustadas." });
    if (!searchExpired(budget)) baseCandidates.push({ result: calculateIndividualPlan(input, "simple", budget), description: "Grades individuais com frequência mínima." });
  } catch (error) { if (!(error instanceof SearchInterrupted)) throw error; }
  const candidates = input.mergeFabricsInLays ? calculateMergedVariants(input, baseCandidates, budget, publish) : baseCandidates;
  return finish(candidates, true);
}
