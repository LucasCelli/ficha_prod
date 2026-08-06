import { isUniformBabyLookText, normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";
import type { CutPlanSizeProfile, FabricType, MarkerFrequency, SleeveType } from "./model.ts";

/** Margem conservadora para perdas do encaixe aproximado. */
export const ESTIMATED_NESTING_EFFICIENCY = 0.82;
const estimatedLengthFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatEstimatedLengthMeters(lengthCm: number) {
  return `${estimatedLengthFormatter.format(lengthCm / 100)} metros`;
}

export function getLayerLimit(type: FabricType) {
  return type === "TUBULAR" ? 50 : 100;
}

export function normalizeCutPlanSizeKey(value: string | null | undefined) {
  const sizeKey = normalizeUniformSizeKey(value);
  if (!sizeKey) return "";
  return isUniformBabyLookText(value) ? `BABY:${sizeKey}` : sizeKey;
}

export function buildSizeProfileIndex(profiles: CutPlanSizeProfile[]) {
  const index = new Map<string, CutPlanSizeProfile>();
  for (const profile of profiles) {
    for (const value of [profile.size, ...profile.aliases]) {
      const key = normalizeCutPlanSizeKey(value);
      if (key && !index.has(key)) index.set(key, profile);
    }
  }
  return index;
}

export function calculateShirtAreaCm2(profile: CutPlanSizeProfile, sleeveType: SleeveType) {
  const frontArea = profile.frontHeightCm * profile.frontWidthCm;
  const backArea = profile.backHeightCm * profile.backWidthCm;
  const sleeveArea = sleeveType === "LONGA"
    ? profile.longSleeveHeightCm * profile.longSleeveWidthCm
    : profile.shortSleeveHeightCm * profile.shortSleeveWidthCm;
  return frontArea + backArea + sleeveArea * 2;
}

export function calculateMarkerAreaLengthCm(
  profile: CutPlanSizeProfile,
  sleeveType: SleeveType,
  type: FabricType,
  fabricWidthCm: number,
  frequency: number,
) {
  const sleeveHeightCm = sleeveType === "LONGA" ? profile.longSleeveHeightCm : profile.shortSleeveHeightCm;
  const sleeveWidthCm = sleeveType === "LONGA" ? profile.longSleeveWidthCm : profile.shortSleeveWidthCm;
  const shirtAreaCm2 = calculateShirtAreaCm2(profile, sleeveType);
  let markerAreaCm2 = shirtAreaCm2 * frequency;
  if (type === "TUBULAR") {
    const frontAreaCm2 = profile.frontHeightCm * profile.frontWidthCm;
    const foldedBackHalfAreaCm2 = profile.backHeightCm * (profile.backWidthCm / 2);
    const fullSleeveAreaCm2 = sleeveHeightCm * sleeveWidthCm;
    const foldedSleeveHalfAreaCm2 = sleeveHeightCm * (sleeveWidthCm / 2);
    const areaPerProducedPairCm2 = frontAreaCm2
      + foldedBackHalfAreaCm2 * 2
      + fullSleeveAreaCm2
      + foldedSleeveHalfAreaCm2 * 2;
    markerAreaCm2 = areaPerProducedPairCm2 * (frequency / 2);
  }
  const areaLengthCm = markerAreaCm2 / (fabricWidthCm * ESTIMATED_NESTING_EFFICIENCY);
  return areaLengthCm;
}

export function estimateMarkerLengthCm(
  frequencies: MarkerFrequency[],
  type: FabricType,
  fabricWidthCm: number,
  profileIndex: Map<string, CutPlanSizeProfile>,
) {
  if (!Number.isFinite(fabricWidthCm) || fabricWidthCm <= 0) return null;
  let areaLengthCm = 0;
  let matchedEntries = 0;
  for (const { size, sleeveType, frequency } of frequencies) {
    const profile = profileIndex.get(normalizeCutPlanSizeKey(size));
    if (!profile) continue;
    areaLengthCm += calculateMarkerAreaLengthCm(profile, sleeveType, type, fabricWidthCm, frequency);
    matchedEntries += 1;
  }
  if (!matchedEntries) return null;
  return areaLengthCm;
}

export function countProfiledSizes(sizes: string[], profiles: CutPlanSizeProfile[]) {
  const index = buildSizeProfileIndex(profiles);
  return sizes.filter((size) => index.has(normalizeCutPlanSizeKey(size))).length;
}

export function getMaximumEstimatedFrequency(
  size: string,
  sleeveType: SleeveType,
  type: FabricType,
  fabricWidthCm: number,
  tableLengthCm: number,
  profiles: CutPlanSizeProfile[],
) {
  const profileIndex = buildSizeProfileIndex(profiles);
  const step = type === "TUBULAR" ? 2 : 1;
  let maximum = 0;
  for (let frequency = step; frequency <= 6; frequency += step) {
    const length = estimateMarkerLengthCm([{ size, sleeveType, frequency }], type, fabricWidthCm, profileIndex);
    if (length === null || length <= tableLengthCm) maximum = frequency;
  }
  return maximum;
}
