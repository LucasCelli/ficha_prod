import { calculateCutPlan, formatMarkerLabel } from "./calculator.ts";
import { cutPlanDemandKey, parseCutPlanDemandKey, type CutPlanInput, type CutPlanResult, type FabricCutPlanResult, type LayPlan } from "./model.ts";
import { solveMinimumLays } from "./solver.ts";
import { compareUniformSizes } from "../../lib/uniform-sizes.ts";
import { buildSizeProfileIndex, estimateMarkerLengthCm, getMaximumEstimatedFrequency } from "./dimensions.ts";

export interface CutPlanAlternative {
  id: string;
  label: string;
  description: string;
  result: CutPlanResult;
  mapCount: number;
  layCount: number;
}

function calculateIndividualPlan(input: CutPlanInput, mode: "compact" | "simple"): CutPlanResult {
  return {
    fabrics: input.fabrics.filter((fabric) => input.items.some((item) => item.fabricId === fabric.id)).map((fabric) => {
      const requested = new Map<string, number>();
      for (const item of input.items.filter((candidate) => candidate.fabricId === fabric.id)) {
        const size = item.size.trim().replace(/\s+/g, " ");
        const key = cutPlanDemandKey(size, item.sleeveType);
        requested.set(key, (requested.get(key) ?? 0) + item.quantity);
      }
      const lays: LayPlan[] = [];
      for (const [key, requestedQuantity] of requested) {
        const { size, sleeveType } = parseCutPlanDemandKey(key);
        let remaining = fabric.type === "TUBULAR" && requestedQuantity % 2 !== 0 ? requestedQuantity + 1 : requestedQuantity;
        const maximumFrequency = getMaximumEstimatedFrequency(size, sleeveType, fabric.type, fabric.widthCm, input.tableLengthCm, input.sizeProfiles);
        while (remaining > 0) {
          let frequency = fabric.type === "TUBULAR" ? 2 : 1;
          let layers = Math.min(input.maxLayers, remaining / frequency);
          if (mode === "compact") {
            const step = fabric.type === "TUBULAR" ? 2 : 1;
            for (let candidate = step; candidate <= maximumFrequency; candidate += step) {
              const candidateLayers = remaining / candidate;
              if (Number.isInteger(candidateLayers) && candidateLayers >= 1 && candidateLayers <= input.maxLayers) {
                frequency = candidate;
                layers = candidateLayers;
                break;
              }
            }
          }
          layers = Math.max(1, Math.floor(layers));
          const produced = frequency * layers;
          lays.push({ id: `${fabric.id}-${mode}-${lays.length + 1}`, fabricId: fabric.id, layers, frequencies: [{ size, sleeveType, frequency }] });
          remaining -= produced;
        }
      }
      const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
      for (const lay of lays) {
        const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
        lay.markerLengthCm = markerLength === null ? undefined : Math.ceil(markerLength);
      }
      return buildFabricResult(fabric.id, requested, lays);
    }),
  };
}

function buildFabricResult(fabricId: string, requested: Map<string, number>, lays: LayPlan[]): FabricCutPlanResult {
  const sizes = [...requested].map(([key, quantity]) => {
    const { size, sleeveType } = parseCutPlanDemandKey(key);
    const produced = lays.reduce((total, lay) => total + (lay.frequencies.find((item) => item.size === size && item.sleeveType === sleeveType)?.frequency ?? 0) * lay.layers, 0);
    return { size, sleeveType, requested: quantity, produced, difference: produced - quantity };
  });
  return { fabricId, lays, sizes };
}

function planSignature(result: CutPlanResult) {
  return result.fabrics.map((fabric) => fabric.lays.map((lay) => `${lay.fabricId}:${lay.layers}:${formatMarkerLabel(lay.frequencies)}`).join("|")).join("||");
}

function score(result: CutPlanResult) {
  const lays = result.fabrics.flatMap((fabric) => fabric.lays);
  const markerFrequencies = lays.map((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0));
  const complexity = markerFrequencies.reduce((total, value) => total + value, 0);
  const peakFrequency = Math.max(0, ...markerFrequencies);
  const sizeEntries = lays.reduce((total, lay) => total + lay.frequencies.length, 0);
  const totalLayers = lays.reduce((total, lay) => total + lay.layers, 0);
  const sizeSpreadScore = result.fabrics.reduce((total, fabric) => {
    const orderedSizes = [...new Set(fabric.sizes.map((size) => cutPlanDemandKey(size.size, size.sleeveType)))].sort((left, right) => compareUniformSizes(parseCutPlanDemandKey(left).size, parseCutPlanDemandKey(right).size));
    const ranks = new Map(orderedSizes.map((size, index) => [size, index]));
    return total + fabric.lays.reduce((fabricTotal, lay) => {
      const activeRanks = lay.frequencies.map((item) => ranks.get(cutPlanDemandKey(item.size, item.sleeveType)) ?? 0).sort((a, b) => a - b);
      return fabricTotal + (activeRanks.length > 1 ? (activeRanks.at(-1)! - activeRanks[0]) * lay.layers : 0);
    }, 0);
  }, 0);
  return { mapCount: lays.length, layCount: lays.length, complexity, peakFrequency, sizeEntries, sizeSpreadScore, totalLayers };
}


function aggregateFabricItems(input: CutPlanInput, fabricId: string) {
  const requested = new Map<string, number>();
  for (const item of input.items.filter((candidate) => candidate.fabricId === fabricId)) {
    const size = item.size.trim().replace(/\s+/g, " ");
    const key = cutPlanDemandKey(size, item.sleeveType);
    requested.set(key, (requested.get(key) ?? 0) + item.quantity);
  }
  return requested;
}

function calculateOptimizedVariants(input: CutPlanInput) {
  const primary = calculateCutPlan(input, false);
  const fabrics = primary.fabrics.map((fabricResult) => {
    const fabric = input.fabrics.find((candidate) => candidate.id === fabricResult.fabricId)!;
    const requested = aggregateFabricItems(input, fabric.id);
    const target = new Map([...requested].map(([size, quantity]) => [size, fabric.type === "TUBULAR" && quantity % 2 !== 0 ? quantity + 1 : quantity]));
    const constraints = {
      tableLengthCm: input.tableLengthCm,
      fabricWidthCm: fabric.widthCm,
      sizeProfiles: input.sizeProfiles,
    };
    const solutions = solveMinimumLays(target, input.maxLayers, fabric.type, fabricResult.lays.length, constraints);
    if (solutions.length && requested.size > 3 && !solutions.some((solution) => solution.lays.every((lay) => lay.frequencies.length <= 3))) {
      const simpler = solveMinimumLays(target, input.maxLayers, fabric.type, fabricResult.lays.length, { ...constraints, maxSizesPerMarker: 3 });
      for (const solution of simpler) {
        if (!solutions.some((existing) => existing.signature === solution.signature)) solutions.push(solution);
      }
    }
    return { fabric, requested, solutions };
  });
  const variantCount = Math.max(1, ...fabrics.map((entry) => entry.solutions.length));
  return Array.from({ length: variantCount }, (_, rank) => ({
    result: {
      fabrics: fabrics.map(({ fabric, requested, solutions }) => {
        const solution = solutions[rank] ?? solutions[0];
        if (!solution) return primary.fabrics.find((entry) => entry.fabricId === fabric.id)!;
        const lays = solution.lays.map((lay, index) => ({ ...lay, id: `${fabric.id}-optimized-${rank + 1}-${index + 1}`, fabricId: fabric.id }));
        return buildFabricResult(fabric.id, requested, lays);
      }),
    },
    description: rank === 0
      ? "O menor número de enfestos, juntando tamanhos pequenos e grandes na mesma grade."
      : "Mesmo número de enfestos, com outra divisão de folhas e frequências.",
  }));
}
export function calculateCutPlanAlternatives(input: CutPlanInput): CutPlanAlternative[] {
  const candidates = [
    ...calculateOptimizedVariants(input),
    { result: calculateIndividualPlan(input, "compact"), description: "Um enfesto por tamanho, com a frequência mais alta que couber." },
    { result: calculateIndividualPlan(input, "simple"), description: "Um enfesto por tamanho, com a grade mais simples de conferir." },
  ];
  const unique = [...new Map(candidates.map((candidate) => [planSignature(candidate.result), candidate])).values()]
    .map((candidate) => ({ ...candidate, ...score(candidate.result) }))
    .sort((a, b) => a.layCount - b.layCount || b.sizeSpreadScore - a.sizeSpreadScore || a.complexity - b.complexity || a.peakFrequency - b.peakFrequency || a.sizeEntries - b.sizeEntries || a.totalLayers - b.totalLayers)
    .slice(0, 4);
  return unique.map((candidate, index) => ({
    id: `alternative-${index + 1}`,
    label: index === 0 ? "Principal" : `Opção ${index + 1}`,
    description: candidate.description,
    result: candidate.result,
    mapCount: candidate.mapCount,
    layCount: candidate.layCount,
  }));
}
