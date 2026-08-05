import { calculateCutPlan, formatMarkerLabel } from "./calculator";
import type { CutPlanInput, CutPlanResult, FabricCutPlanResult, LayPlan } from "./model";
import { solveMinimumLays } from "./solver";
import { compareUniformSizes } from "@/lib/uniform-sizes";

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
        requested.set(size, (requested.get(size) ?? 0) + item.quantity);
      }
      const lays: LayPlan[] = [];
      for (const [size, requestedQuantity] of requested) {
        let remaining = fabric.type === "TUBULAR" && requestedQuantity % 2 !== 0 ? requestedQuantity + 1 : requestedQuantity;
        while (remaining > 0) {
          let frequency = fabric.type === "TUBULAR" ? 2 : 1;
          let layers = Math.min(input.maxLayers, remaining / frequency);
          if (mode === "compact") {
            const step = fabric.type === "TUBULAR" ? 2 : 1;
            for (let candidate = step; candidate <= 6; candidate += step) {
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
          lays.push({ id: `${fabric.id}-${mode}-${lays.length + 1}`, fabricId: fabric.id, layers, frequencies: [{ size, frequency }] });
          remaining -= produced;
        }
      }
      return buildFabricResult(fabric.id, requested, lays);
    }),
  };
}

function buildFabricResult(fabricId: string, requested: Map<string, number>, lays: LayPlan[]): FabricCutPlanResult {
  const sizes = [...requested].map(([size, quantity]) => {
    const produced = lays.reduce((total, lay) => total + (lay.frequencies.find((item) => item.size === size)?.frequency ?? 0) * lay.layers, 0);
    return { size, requested: quantity, produced, difference: produced - quantity };
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
  const sizeMixScore = result.fabrics.reduce((total, fabric) => {
    const orderedSizes = [...new Set(fabric.sizes.map((size) => size.size))].sort(compareUniformSizes);
    const ranks = new Map(orderedSizes.map((size, index) => [size, index]));
    return total + fabric.lays.reduce((fabricTotal, lay) => {
      const activeRanks = lay.frequencies.map((item) => ranks.get(item.size) ?? 0).sort((a, b) => a - b);
      return fabricTotal + (activeRanks.length > 1 ? (activeRanks.at(-1)! - activeRanks[0]) * lay.layers : 0);
    }, 0);
  }, 0);
  return { mapCount: lays.length, layCount: lays.length, complexity, peakFrequency, sizeEntries, sizeMixScore, totalLayers };
}


function aggregateFabricItems(input: CutPlanInput, fabricId: string) {
  const requested = new Map<string, number>();
  for (const item of input.items.filter((candidate) => candidate.fabricId === fabricId)) {
    const size = item.size.trim().replace(/\s+/g, " ");
    requested.set(size, (requested.get(size) ?? 0) + item.quantity);
  }
  return requested;
}

function calculateOptimizedVariants(input: CutPlanInput) {
  const primary = calculateCutPlan(input);
  const fabrics = primary.fabrics.map((fabricResult) => {
    const fabric = input.fabrics.find((candidate) => candidate.id === fabricResult.fabricId)!;
    const requested = aggregateFabricItems(input, fabric.id);
    const target = new Map([...requested].map(([size, quantity]) => [size, fabric.type === "TUBULAR" && quantity % 2 !== 0 ? quantity + 1 : quantity]));
    const solutions = solveMinimumLays(target, input.maxLayers, fabric.type, fabricResult.lays.length);
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
      ? "Menor quantidade de enfestos, priorizando tamanhos menores com maiores na mesma grade."
      : "Mesma quantidade mínima de enfestos, com outra distribuição exata de folhas e frequências.",
  }));
}
export function calculateCutPlanAlternatives(input: CutPlanInput): CutPlanAlternative[] {
  const candidates = [
    ...calculateOptimizedVariants(input),
    { result: calculateIndividualPlan(input, "compact"), description: "Separa os tamanhos e busca frequências compactas." },
    { result: calculateIndividualPlan(input, "simple"), description: "Usa grades individuais mais simples para conferência." },
  ];
  const unique = [...new Map(candidates.map((candidate) => [planSignature(candidate.result), candidate])).values()]
    .map((candidate) => ({ ...candidate, ...score(candidate.result) }))
    .sort((a, b) => a.layCount - b.layCount || b.sizeMixScore - a.sizeMixScore || a.complexity - b.complexity || a.peakFrequency - b.peakFrequency || a.sizeEntries - b.sizeEntries || a.totalLayers - b.totalLayers)
    .slice(0, 4);
  return unique.map((candidate, index) => ({
    id: `alternative-${index + 1}`,
    label: index === 0 ? "Principal" : `Alternativa ${index + 1}`,
    description: candidate.description,
    result: candidate.result,
    mapCount: candidate.mapCount,
    layCount: candidate.layCount,
  }));
}
