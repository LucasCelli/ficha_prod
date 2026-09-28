import { compareUniformSizes } from "../../lib/uniform-sizes.ts";
import { getLayerLimit } from "./dimensions.ts";
import { cutPlanDemandKey, parseCutPlanDemandKey, type CutPlanItem, type GarmentType } from "./model.ts";

export const INTERLINING_WIDTH_CM = 145;
export const INTERLINING_MAX_LAYERS = getLayerLimit("PLANO");

export interface InterliningFrequency {
  garmentType: GarmentType;
  size: string;
  frequency: number;
  quantity: number;
}

export interface InterliningLayPlan {
  layers: number;
  frequencies: InterliningFrequency[];
  totalPieces: number;
  widthCm: number;
}

function greatestCommonDivisor(first: number, second: number): number {
  let left = Math.abs(first);
  let right = Math.abs(second);
  while (right) [left, right] = [right, left % right];
  return left;
}

/** Um único enfesto, sem limite de comprimento, fechando exatamente todo o pedido. */
export function calculateInterliningLay(items: CutPlanItem[], maxLayers = INTERLINING_MAX_LAYERS): InterliningLayPlan | null {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.size.trim() || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
    // A entretela é igual para mangas curta e longa; agrega por modelagem e tamanho.
    const key = cutPlanDemandKey(item.size.trim(), "CURTA", item.garmentType);
    totals.set(key, (totals.get(key) ?? 0) + item.quantity);
  }
  if (!totals.size) return null;

  const quantities = [...totals.values()];
  const commonDivisor = quantities.reduce(greatestCommonDivisor);
  const layerLimit = Math.max(1, Math.floor(maxLayers));
  let layers = Math.min(commonDivisor, layerLimit);
  while (layers > 1 && commonDivisor % layers !== 0) layers -= 1;

  const frequencies = [...totals.entries()].map(([key, quantity]) => {
    const { garmentType, size } = parseCutPlanDemandKey(key);
    return { garmentType, size, quantity, frequency: quantity / layers };
  }).sort((left, right) => compareUniformSizes(left.size, right.size)
    || left.garmentType.localeCompare(right.garmentType));

  return {
    frequencies,
    layers,
    totalPieces: quantities.reduce((sum, quantity) => sum + quantity, 0),
    widthCm: INTERLINING_WIDTH_CM,
  };
}
