import { normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";
import type { CutPlanSizeProfile, FabricType, MarkerFrequency } from "./model";

/** Margem conservadora para perdas do encaixe aproximado. */
export const ESTIMATED_NESTING_EFFICIENCY = 0.82;

export function getLayerLimit(type: FabricType) {
  return type === "TUBULAR" ? 50 : 100;
}

export function buildSizeProfileIndex(profiles: CutPlanSizeProfile[]) {
  const index = new Map<string, CutPlanSizeProfile>();
  for (const profile of profiles) {
    for (const value of [profile.size, ...profile.aliases]) {
      const key = normalizeUniformSizeKey(value);
      if (key && !index.has(key)) index.set(key, profile);
    }
  }
  return index;
}

export function calculateShirtAreaCm2(profile: CutPlanSizeProfile) {
  const bodyArea = profile.bodyHeightCm * profile.bodyWidthCm * 2;
  const sleevePairArea = profile.sleeveHeightCm * profile.sleeveWidthCm * 2;
  return bodyArea + sleevePairArea;
}

export function estimateMarkerLengthCm(
  frequencies: MarkerFrequency[],
  type: FabricType,
  fabricWidthCm: number,
  profileIndex: Map<string, CutPlanSizeProfile>,
) {
  if (!Number.isFinite(fabricWidthCm) || fabricWidthCm <= 0) return null;
  let areaCm2 = 0;
  let matchedEntries = 0;
  for (const { size, frequency } of frequencies) {
    const profile = profileIndex.get(normalizeUniformSizeKey(size));
    if (!profile) continue;
    const repetitions = type === "TUBULAR" ? frequency / 2 : frequency;
    areaCm2 += calculateShirtAreaCm2(profile) * repetitions;
    matchedEntries += 1;
  }
  if (!matchedEntries) return null;
  return areaCm2 / (fabricWidthCm * ESTIMATED_NESTING_EFFICIENCY);
}

export function countProfiledSizes(sizes: string[], profiles: CutPlanSizeProfile[]) {
  const index = buildSizeProfileIndex(profiles);
  return sizes.filter((size) => index.has(normalizeUniformSizeKey(size))).length;
}

export function getMaximumEstimatedFrequency(
  size: string,
  type: FabricType,
  fabricWidthCm: number,
  tableLengthCm: number,
  profiles: CutPlanSizeProfile[],
) {
  const profileIndex = buildSizeProfileIndex(profiles);
  const step = type === "TUBULAR" ? 2 : 1;
  let maximum = 0;
  for (let frequency = step; frequency <= 6; frequency += step) {
    const length = estimateMarkerLengthCm([{ size, frequency }], type, fabricWidthCm, profileIndex);
    if (length === null || length <= tableLengthCm) maximum = frequency;
  }
  return maximum;
}
