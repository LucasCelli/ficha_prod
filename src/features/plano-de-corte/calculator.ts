import {
  cutPlanDemandKey,
  parseCutPlanDemandKey,
  type CutPlanInput,
  type CutPlanResult,
  type FabricCutPlanResult,
  type LayPlan,
  type MarkerFrequency,
} from "./model.ts";
import { buildSizeProfileIndex, estimateMarkerLengthCm, getMaximumEstimatedFrequency } from "./dimensions.ts";
import { solveMinimumLays } from "./solver.ts";
import { compareUniformSizes, isUniformBabyLookText } from "../../lib/uniform-sizes.ts";

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
    const key = cutPlanDemandKey(size, item.sleeveType);
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  }
  return quantities;
}

function findJointCandidate(
  remaining: Map<string, number>,
  maxLayers: number,
  input: CutPlanInput,
  fabricId: string,
): { layers: number; frequencies: MarkerFrequency[] } | null {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId)!;
  const tubular = fabric.type === "TUBULAR";
  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  const entries = [...remaining.entries()].filter(([, quantity]) => quantity > 0).slice(0, MAX_SIZES_PER_MARKER);
  if (entries.length < 2) return null;

  for (let layers = Math.min(maxLayers, ...entries.map(([, quantity]) => quantity)); layers >= 1; layers -= 1) {
    const frequencies = entries.map(([key, quantity]) => ({ ...parseCutPlanDemandKey(key), frequency: quantity / layers }));
    if (frequencies.every(({ frequency }) => Number.isInteger(frequency)
      && frequency >= 1
      && frequency <= MAX_FREQUENCY
      && (!tubular || frequency % 2 === 0))
      && (estimateMarkerLengthCm(frequencies, fabric.type, fabric.widthCm, profileIndex) ?? 0) <= input.tableLengthCm) {
      return { layers, frequencies };
    }
  }
  return null;
}

function subtractProduction(remaining: Map<string, number>, lay: Pick<LayPlan, "layers" | "frequencies">) {
  for (const marker of lay.frequencies) {
    const key = cutPlanDemandKey(marker.size, marker.sleeveType);
    remaining.set(key, (remaining.get(key) ?? 0) - marker.frequency * lay.layers);
  }
}

function calculateSizes(requested: Map<string, number>, lays: LayPlan[]) {
  return [...requested.entries()].map(([key, quantity]) => {
    const { size, sleeveType } = parseCutPlanDemandKey(key);
    const produced = lays.reduce((total, lay) => {
      const marker = lay.frequencies.find((frequency) => frequency.size === size && frequency.sleeveType === sleeveType);
      return total + (marker ? marker.frequency * lay.layers : 0);
    }, 0);
    return { size, sleeveType, requested: quantity, produced, difference: produced - quantity };
  });
}

export function calculateFabricPlan(input: CutPlanInput, fabricId: string, optimize = true): FabricCutPlanResult {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId);
  if (!fabric) throw new CutPlanCalculationError("Uma das linhas está apontando para um tecido que não existe mais.");

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
    const joint = findJointCandidate(remaining, input.maxLayers, input, fabricId);
    if (joint) {
      addLay(joint.layers, joint.frequencies);
      continue;
    }

    const [demandKey, quantity] = [...remaining.entries()].find(([, value]) => value > 0)!;
    const { size, sleeveType } = parseCutPlanDemandKey(demandKey);
    if (fabric.type === "TUBULAR") {
      const layers = Math.min(input.maxLayers, quantity / 2);
      const markerLength = estimateMarkerLengthCm([{ size, sleeveType, frequency: 2 }], fabric.type, fabric.widthCm, buildSizeProfileIndex(input.sizeProfiles)) ?? 0;
      if (markerLength > input.tableLengthCm) throw new CutPlanCalculationError(`O tamanho ${size} ultrapassa a mesa mesmo na menor grade tubular.`);
      addLay(layers, [{ size, sleeveType, frequency: 2 }]);
    } else {
      let frequency = 1;
      let layers = Math.min(input.maxLayers, quantity);
      const maximumFrequency = getMaximumEstimatedFrequency(size, sleeveType, fabric.type, fabric.widthCm, input.tableLengthCm, input.sizeProfiles);
      if (!maximumFrequency) throw new CutPlanCalculationError(`O tamanho ${size} ultrapassa a mesa mesmo na grade de frequência 1.`);
      for (let candidate = 1; candidate <= maximumFrequency; candidate += 1) {
        const candidateLayers = quantity / candidate;
        if (Number.isInteger(candidateLayers) && candidateLayers <= input.maxLayers) {
          frequency = candidate;
          layers = candidateLayers;
          break;
        }
      }
      addLay(layers, [{ size, sleeveType, frequency }]);
    }
  }

  const optimized = optimize ? solveMinimumLays(optimizationTarget, input.maxLayers, fabric.type, lays.length, {
    tableLengthCm: input.tableLengthCm,
    fabricWidthCm: fabric.widthCm,
    sizeProfiles: input.sizeProfiles,
  })[0] : undefined;
  if (optimized) {
    lays.splice(0, lays.length, ...optimized.lays.map((lay, index) => ({ ...lay, id: `${fabricId}-lay-${index + 1}`, fabricId })));
  }

  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  for (const lay of lays) {
    const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
    lay.markerLengthCm = markerLength === null ? undefined : Math.ceil(markerLength);
  }

  const sizes = calculateSizes(requested, lays);
  const targetSizes = calculateSizes(optimizationTarget, lays);
  if (lays.some((lay) => !Number.isInteger(lay.layers) || lay.layers < 1 || lay.layers > input.maxLayers)
    || lays.some((lay) => lay.frequencies.some(({ frequency }) => frequency < 1
      || !Number.isInteger(frequency)
      || (fabric.type === "TUBULAR" && frequency % 2 !== 0)))
    || targetSizes.some(({ difference }) => difference !== 0)
    || sizes.some(({ difference }) => difference < 0)) {
    throw new CutPlanCalculationError("Não deu para fechar a conta com esses limites. Aumente o máximo de folhas por enfesto ou revise as quantidades.");
  }
  return { fabricId, lays, sizes };
}

export function calculateCutPlan(input: CutPlanInput, optimize = true): CutPlanResult {
  return { fabrics: input.fabrics
    .filter((fabric) => input.items.some((item) => item.fabricId === fabric.id))
    .map((fabric) => calculateFabricPlan(input, fabric.id, optimize)) };
}

export function recalculateFabricResult(
  input: CutPlanInput,
  fabricId: string,
  lays: LayPlan[],
): FabricCutPlanResult {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId)!;
  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  const measuredLays = lays.map((lay) => {
    const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
    return { ...lay, markerLengthCm: markerLength === null ? undefined : Math.ceil(markerLength) };
  });
  return { fabricId, lays: measuredLays, sizes: calculateSizes(aggregateItems(input, fabricId), measuredLays) };
}

export function formatCutPlanSizeLabel(size: string) {
  return size.replace(/^BABY(?:\s+LOOK)?\s+/i, "BL ");
}

export function sortMarkerFrequenciesForDisplay(frequencies: MarkerFrequency[]) {
  return [...frequencies].sort((first, second) => {
    const modelOrder = Number(isUniformBabyLookText(first.size)) - Number(isUniformBabyLookText(second.size));
    if (modelOrder !== 0) return modelOrder;
    return compareUniformSizes(first.size, second.size);
  });
}

export function formatMarkerLabel(frequencies: MarkerFrequency[], showSleeveType = true) {
  return sortMarkerFrequenciesForDisplay(frequencies).map(({ size, sleeveType, frequency }) => `${frequency}${formatCutPlanSizeLabel(size)}${showSleeveType ? ` ${sleeveType === "LONGA" ? "ML" : "MC"}` : ""}`).join(" + ");
}

export function formatOperationalMarkerLabel(frequencies: MarkerFrequency[], showSleeveType = true) {
  return sortMarkerFrequenciesForDisplay(frequencies)
    .map(({ size, sleeveType, frequency }) => `(${frequency}-${formatCutPlanSizeLabel(size)}${showSleeveType ? ` ${sleeveType === "LONGA" ? "ML" : "MC"}` : ""})`)
    .join(" ");
}

/** Rotulo contado no padrao do projeto: plural escrito, nunca "(s)". */
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

