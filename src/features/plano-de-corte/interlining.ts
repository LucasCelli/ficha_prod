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
}

export interface InterliningPlan {
  lays: InterliningLayPlan[];
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
export function calculateInterliningLay(items: CutPlanItem[], maxLayers = INTERLINING_MAX_LAYERS): InterliningPlan | null {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.size.trim() || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
    // A entretela é igual para mangas curta e longa; agrega por modelagem e tamanho.
    const key = cutPlanDemandKey(item.size.trim(), "CURTA", item.garmentType);
    totals.set(key, (totals.get(key) ?? 0) + item.quantity);
  }
  if (!totals.size) return null;

  const layerLimit = Math.max(1, Math.floor(maxLayers));
  const entries = [...totals.entries()].map(([key, quantity]) => {
    const { garmentType, size } = parseCutPlanDemandKey(key);
    return { garmentType, size, quantity };
  }).sort((left, right) => compareUniformSizes(left.size, right.size)
    || left.garmentType.localeCompare(right.garmentType));

  const createLay = (group: typeof entries, layers: number): InterliningLayPlan => ({
    frequencies: group.map((entry) => ({ ...entry, frequency: entry.quantity / layers })),
    layers,
    totalPieces: group.reduce((sum, entry) => sum + entry.quantity, 0),
  });
  const commonDivisor = entries.reduce((divisor, entry) => greatestCommonDivisor(divisor, entry.quantity), entries[0].quantity);
  let layers = Math.min(commonDivisor, layerLimit);
  while (layers > 1 && commonDivisor % layers !== 0) layers -= 1;
  let lays = [createLay(entries, layers)];

  // Se todos juntos exigirem uma única folha, procura dois grupos que permitam
  // alturas maiores. Cada quantidade continua fechando exatamente.
  if (layers === 1 && entries.length > 1) {
    let best: { first: typeof entries; firstLayers: number; second: typeof entries; secondLayers: number } | null = null;
    for (let firstLayers = layerLimit; firstLayers >= 2; firstLayers -= 1) {
      for (let secondLayers = firstLayers; secondLayers >= 2; secondLayers -= 1) {
        const first: typeof entries = [];
        const second: typeof entries = [];
        let valid = true;
        for (const entry of entries) {
          if (entry.quantity % firstLayers === 0) first.push(entry);
          else if (entry.quantity % secondLayers === 0) second.push(entry);
          else { valid = false; break; }
        }
        if (valid && first.length && second.length) {
          best = { first, firstLayers, second, secondLayers };
          break;
        }
      }
      if (best) break;
    }
    if (best) lays = [createLay(best.first, best.firstLayers), createLay(best.second, best.secondLayers)];
  }

  return {
    lays,
    totalPieces: entries.reduce((sum, entry) => sum + entry.quantity, 0),
    widthCm: INTERLINING_WIDTH_CM,
  };
}
