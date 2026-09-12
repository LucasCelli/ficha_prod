import { buildSizeProfileIndex, estimateMarkerLengthCm, fitsTable, getDefaultMaximumFrequency, getLayerLimit, isPantsCutPlanSize, resolveEntryLengthPerFrequencyCm } from "./dimensions.ts";
import { cutPlanDemandKey, type CutPlanInput, type CutPlanResult } from "./model.ts";
import { aggregateCutPlanItems } from "./normalization.ts";

/** Independente do gerador: quantidades, limites e comprimentos são refeitos. */
export function validateCutPlanSolution(input: CutPlanInput, result: CutPlanResult) {
  const index = buildSizeProfileIndex(input.sizeProfiles);
  let measurementsComplete = true;
  let measurementSource: NonNullable<CutPlanResult["search"]>["measurementSource"] = "REGISTERED";
  const sourceRank = { REGISTERED: 0, FALLBACK_HIGH: 1, FALLBACK_MEDIUM: 2, FALLBACK_LOW: 3, UNKNOWN: 4 } as const;
  const fail = () => { throw new Error("O plano gerado não respeita as quantidades ou os limites de corte."); };
  const active = input.fabrics.filter((fabric) => input.items.some((item) => item.fabricId === fabric.id));
  if (result.fabrics.length !== active.length || new Set(result.fabrics.map((fabric) => fabric.fabricId)).size !== active.length) fail();
  for (const fabric of active) {
    const output = result.fabrics.find((item) => item.fabricId === fabric.id);
    if (!output) { fail(); continue; }
    const step = fabric.type === "TUBULAR" ? 2 : 1;
    const expected = aggregateCutPlanItems(input, fabric.id);
    const requested = aggregateCutPlanItems(input, fabric.id, true);
    const produced = new Map<string, number>();
    for (const lay of output.lays) {
      if (lay.fabricId !== fabric.id || !Number.isSafeInteger(lay.layers) || lay.layers < 1 || lay.layers > Math.min(input.maxLayers, getLayerLimit(fabric.type)) || !lay.frequencies.length) fail();
      let knownLength = 0;
      const seen = new Set<string>();
      for (const item of lay.frequencies) {
        const key = cutPlanDemandKey(item.size, item.sleeveType);
        const limit = Math.min(input.maxFrequency ?? getDefaultMaximumFrequency(fabric.type), isPantsCutPlanSize(item.size) ? step : Infinity);
        if (seen.has(key) || !expected.has(key) || !Number.isSafeInteger(item.frequency) || item.frequency < step || item.frequency > limit || item.frequency % step !== 0) fail();
        seen.add(key);
        produced.set(key, (produced.get(key) ?? 0) + item.frequency * lay.layers);
        const measurement = resolveEntryLengthPerFrequencyCm(item.size, item.sleeveType, fabric.type, fabric.widthCm, index);
        if (sourceRank[measurement.source] > sourceRank[measurementSource]) measurementSource = measurement.source;
        if (measurement.lengthCm === null) measurementsComplete = false;
        else knownLength += measurement.lengthCm * item.frequency;
      }
      if (!fitsTable(knownLength, input.tableLengthCm)) fail();
      const length = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, index);
      if (length === null ? lay.markerLengthCm !== undefined : lay.markerLengthCm === undefined || Math.abs(length - lay.markerLengthCm) > 1e-8) fail();
    }
    for (const [key, quantity] of expected) {
      if (produced.get(key) !== step * Math.ceil(quantity / step)) fail();
    }
    if (output.sizes.length !== expected.size || new Set(output.sizes.map((item) => cutPlanDemandKey(item.size, item.sleeveType))).size !== expected.size) fail();
    for (const item of output.sizes) {
      const key = cutPlanDemandKey(item.size, item.sleeveType);
      if (item.produced !== produced.get(key) || item.requested !== requested.get(key) || item.difference !== item.produced - item.requested) fail();
    }
  }
  if (result.mergedLays) {
    const allocations = result.fabrics.flatMap((fabric) => fabric.lays);
    const seen = new Set<string>();
    for (const group of result.mergedLays) {
      let total = 0;
      let complete = true;
      const colors = new Set<string>();
      const fabrics = new Set<string>();
      let compatibility: string | undefined;
      for (const lay of group.allocations) {
        const key = JSON.stringify([lay.fabricId, lay.id]);
        const original = allocations.find((item) => item.id === lay.id && item.fabricId === lay.fabricId);
        const fabric = input.fabrics.find((item) => item.id === lay.fabricId)!;
        const color = normalizeCompatibilityValue(fabric.color);
        const compatible = fabricCompatibilityKey(fabric);
        if (!original || seen.has(key) || group.layers !== lay.layers || JSON.stringify(original) !== JSON.stringify(lay)) fail();
        if (group.allocations.length > 1 && (!color || colors.has(color) || fabrics.has(fabric.id) || (compatibility !== undefined && compatible !== compatibility))) fail();
        seen.add(key); colors.add(color); fabrics.add(fabric.id); compatibility = compatible;
        if (lay.markerLengthCm === undefined) complete = false;
        else total += lay.markerLengthCm;
      }
      if (!group.allocations.length || (!complete && group.allocations.length > 1) || !fitsTable(total, input.tableLengthCm)) fail();
      if (complete ? group.markerLengthCm === undefined || Math.abs(group.markerLengthCm - total) > 1e-8 : group.markerLengthCm !== undefined) fail();
    }
    if (seen.size !== allocations.length) fail();
  }
  return { measurementSource, measurementsComplete };
}

export function normalizeCompatibilityValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

export function fabricCompatibilityKey(fabric: CutPlanInput["fabrics"][number]) {
  return JSON.stringify([normalizeCompatibilityValue(fabric.name), fabric.widthCm, fabric.type]);
}
