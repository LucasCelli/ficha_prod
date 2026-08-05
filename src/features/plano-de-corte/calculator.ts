import {
  type CutPlanInput,
  type CutPlanResult,
  type FabricCutPlanResult,
  type LayPlan,
  type MarkerFrequency,
} from "./model";
import { solveMinimumLays } from "./solver";

export class CutPlanCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CutPlanCalculationError";
  }
}

const MAX_FREQUENCY = 6;
const MAX_SIZES_PER_MARKER = 5;

function normalizeSize(size: string) {
  return size.trim().replace(/\s+/g, " ");
}

function aggregateItems(input: CutPlanInput, fabricId: string) {
  const quantities = new Map<string, number>();
  for (const item of input.items.filter((candidate) => candidate.fabricId === fabricId)) {
    const size = normalizeSize(item.size);
    quantities.set(size, (quantities.get(size) ?? 0) + item.quantity);
  }
  return quantities;
}

function findJointCandidate(
  remaining: Map<string, number>,
  maxLayers: number,
  tubular: boolean,
): { layers: number; frequencies: MarkerFrequency[] } | null {
  const entries = [...remaining.entries()].filter(([, quantity]) => quantity > 0).slice(0, MAX_SIZES_PER_MARKER);
  if (entries.length < 2) return null;

  for (let layers = Math.min(maxLayers, ...entries.map(([, quantity]) => quantity)); layers >= 1; layers -= 1) {
    const frequencies = entries.map(([size, quantity]) => ({ size, frequency: quantity / layers }));
    if (frequencies.every(({ frequency }) => Number.isInteger(frequency)
      && frequency >= 1
      && frequency <= MAX_FREQUENCY
      && (!tubular || frequency % 2 === 0))) {
      return { layers, frequencies };
    }
  }
  return null;
}

function subtractProduction(remaining: Map<string, number>, lay: Pick<LayPlan, "layers" | "frequencies">) {
  for (const marker of lay.frequencies) {
    remaining.set(marker.size, (remaining.get(marker.size) ?? 0) - marker.frequency * lay.layers);
  }
}

function calculateSizes(requested: Map<string, number>, lays: LayPlan[]) {
  return [...requested.entries()].map(([size, quantity]) => {
    const produced = lays.reduce((total, lay) => {
      const marker = lay.frequencies.find((frequency) => frequency.size === size);
      return total + (marker ? marker.frequency * lay.layers : 0);
    }, 0);
    return { size, requested: quantity, produced, difference: produced - quantity };
  });
}

export function calculateFabricPlan(input: CutPlanInput, fabricId: string): FabricCutPlanResult {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId);
  if (!fabric) throw new CutPlanCalculationError("Um item referencia um tecido que não existe.");

  const requested = aggregateItems(input, fabricId);
  const optimizationTarget = new Map([...requested].map(([size, quantity]) => [
    size,
    fabric.type === "TUBULAR" && quantity % 2 !== 0 ? quantity + 1 : quantity,
  ]));

  const remaining = new Map(optimizationTarget);
  const lays: LayPlan[] = [];
  const addLay = (layers: number, frequencies: MarkerFrequency[]) => {
    const lay = { id: `${fabricId}-lay-${lays.length + 1}`, fabricId, layers, frequencies };
    lays.push(lay);
    subtractProduction(remaining, lay);
  };

  while ([...remaining.values()].some((quantity) => quantity > 0)) {
    const joint = findJointCandidate(remaining, input.maxLayers, fabric.type === "TUBULAR");
    if (joint) {
      addLay(joint.layers, joint.frequencies);
      continue;
    }

    const [size, quantity] = [...remaining.entries()].find(([, value]) => value > 0)!;
    if (fabric.type === "TUBULAR") {
      const layers = Math.min(input.maxLayers, quantity / 2);
      addLay(layers, [{ size, frequency: 2 }]);
    } else {
      let frequency = 1;
      let layers = Math.min(input.maxLayers, quantity);
      for (let candidate = 1; candidate <= MAX_FREQUENCY; candidate += 1) {
        const candidateLayers = quantity / candidate;
        if (Number.isInteger(candidateLayers) && candidateLayers <= input.maxLayers) {
          frequency = candidate;
          layers = candidateLayers;
          break;
        }
      }
      addLay(layers, [{ size, frequency }]);
    }
  }

  const optimized = solveMinimumLays(optimizationTarget, input.maxLayers, fabric.type, lays.length)[0];
  if (optimized) {
    lays.splice(0, lays.length, ...optimized.lays.map((lay, index) => ({ ...lay, id: `${fabricId}-lay-${index + 1}`, fabricId })));
  }

  const sizes = calculateSizes(requested, lays);
  const targetSizes = calculateSizes(optimizationTarget, lays);
  if (lays.some((lay) => !Number.isInteger(lay.layers) || lay.layers < 1 || lay.layers > input.maxLayers)
    || lays.some((lay) => lay.frequencies.some(({ frequency }) => frequency < 1
      || !Number.isInteger(frequency)
      || (fabric.type === "TUBULAR" && frequency % 2 !== 0)))
    || targetSizes.some(({ difference }) => difference !== 0)
    || sizes.some(({ difference }) => difference < 0)) {
    throw new CutPlanCalculationError("Não foi possível gerar um plano exato dentro dos limites informados.");
  }
  return { fabricId, lays, sizes };
}

export function calculateCutPlan(input: CutPlanInput): CutPlanResult {
  return { fabrics: input.fabrics
    .filter((fabric) => input.items.some((item) => item.fabricId === fabric.id))
    .map((fabric) => calculateFabricPlan(input, fabric.id)) };
}

export function recalculateFabricResult(
  input: CutPlanInput,
  fabricId: string,
  lays: LayPlan[],
): FabricCutPlanResult {
  return { fabricId, lays, sizes: calculateSizes(aggregateItems(input, fabricId), lays) };
}

export function formatMarkerLabel(frequencies: MarkerFrequency[]) {
  return frequencies.map(({ size, frequency }) => `${frequency}${size}`).join(" + ");
}

