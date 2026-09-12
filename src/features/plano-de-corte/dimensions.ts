import { isUniformBabyLookText, normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";
import type { CutPlanSizeProfile, FabricType, MarkerFrequency, SleeveType } from "./model.ts";
import { resolveLowerGarmentFallback, resolveShirtFallback, type MeasurementSource } from "./fallback-dimensions.ts";

/** Margem conservadora para perdas do encaixe aproximado. */
export const ESTIMATED_NESTING_EFFICIENCY = 0.82;
export const PANTS_ESTIMATED_HEIGHT_CM = 120;
export const PANTS_ESTIMATED_WIDTH_CM = 44;
export const SHORTS_ESTIMATED_HEIGHT_CM = 60;
export const SHORTS_ESTIMATED_WIDTH_CM = 44;
const LOWER_GARMENT_PANEL_COUNT = 4;
const estimatedLengthFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatEstimatedLengthMeters(lengthCm: number) {
  return `${estimatedLengthFormatter.format(lengthCm / 100)} metros`;
}

export function getLayerLimit(type: FabricType) {
  return type === "TUBULAR" ? 50 : 100;
}

export function getDefaultMaximumFrequency(type: FabricType) {
  return type === "TUBULAR" ? 14 : 8;
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

export function isPantsCutPlanSize(size: string) {
  const normalized = size.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return /^CALCA(?:\s|$)/.test(normalized);
}

function isShortsSize(size: string) {
  const normalized = size.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return /^(?:SHORT|BERMUDA)(?:\s|$)/.test(normalized);
}

function calculateLowerGarmentLengthPerFrequencyCm(
  heightCm: number,
  widthCm: number,
  type: FabricType,
  fabricWidthCm: number,
) {
  // Cada peca tem frente esquerda/direita e costas esquerda/direita. No
  // tubular, cada molde riscado corta as duas faces e equivale a dois paineis.
  const drawnPanelCount = type === "TUBULAR" ? LOWER_GARMENT_PANEL_COUNT / 2 : LOWER_GARMENT_PANEL_COUNT;
  return (heightCm * widthCm * drawnPanelCount) / (fabricWidthCm * ESTIMATED_NESTING_EFFICIENCY);
}

function calculateFallbackLowerGarmentLength(size: string, garment: "PANTS" | "SHORTS", type: FabricType, fabricWidthCm: number) {
  const fallback = resolveLowerGarmentFallback(size, garment);
  if (!fallback) return null;
  // Quatro painéis principais equivalem aproximadamente a comprimento ×
  // contorno. Os 8% representam cós, bolsos e vista em espaços residuais.
  const drawnAreaCm2 = fallback.heightCm * fallback.circumferenceCm * 1.08 / (type === "TUBULAR" ? 2 : 1);
  const base = drawnAreaCm2 / (fabricWidthCm * ESTIMATED_NESTING_EFFICIENCY);
  const foldDivisor = type === "TUBULAR" ? 2 : 1;
  const margin = fallback.confidence === "FALLBACK_LOW" ? Math.min(5, base * 0.03) : 2 / foldDivisor;
  return { lengthCm: base + margin, source: fallback.confidence };
}

/** Comprimento ocupado por uma unidade da grade. Calcas usam molde proprio. */
export function calculateEntryLengthPerFrequencyCm(
  size: string,
  sleeveType: SleeveType,
  type: FabricType,
  fabricWidthCm: number,
  profileIndex: Map<string, CutPlanSizeProfile>,
) {
  return resolveEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex).lengthCm;
}

export function resolveEntryLengthPerFrequencyCm(
  size: string,
  sleeveType: SleeveType,
  type: FabricType,
  fabricWidthCm: number,
  profileIndex: Map<string, CutPlanSizeProfile>,
): { lengthCm: number | null; source: MeasurementSource } {
  if (isPantsCutPlanSize(size)) {
    return calculateFallbackLowerGarmentLength(size, "PANTS", type, fabricWidthCm)
      ?? { lengthCm: calculateLowerGarmentLengthPerFrequencyCm(PANTS_ESTIMATED_HEIGHT_CM, PANTS_ESTIMATED_WIDTH_CM, type, fabricWidthCm), source: "FALLBACK_LOW" };
  }
  if (isShortsSize(size)) {
    return calculateFallbackLowerGarmentLength(size, "SHORTS", type, fabricWidthCm)
      ?? { lengthCm: calculateLowerGarmentLengthPerFrequencyCm(SHORTS_ESTIMATED_HEIGHT_CM, SHORTS_ESTIMATED_WIDTH_CM, type, fabricWidthCm), source: "FALLBACK_LOW" };
  }
  const profile = profileIndex.get(normalizeCutPlanSizeKey(size));
  if (profile) return { lengthCm: calculateMarkerAreaLengthCm(profile, sleeveType, type, fabricWidthCm, 1), source: "REGISTERED" };
  const fallback = resolveShirtFallback(size, sleeveType);
  if (!fallback) return { lengthCm: null, source: "UNKNOWN" };
  const base = calculateMarkerAreaLengthCm(fallback.profile, sleeveType, type, fabricWidthCm, 1);
  const lengthCm = fallback.margin.kind === "fixed"
    ? base + fallback.margin.value
    : base + Math.min(fallback.margin.maximumCm, base * (fallback.margin.value - 1));
  return { lengthCm, source: fallback.confidence };
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
    const lengthPerFrequency = calculateEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex);
    if (lengthPerFrequency === null) return null;
    areaLengthCm += lengthPerFrequency * frequency;
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
  maxFrequency = getDefaultMaximumFrequency(type),
) {
  const profileIndex = buildSizeProfileIndex(profiles);
  const step = type === "TUBULAR" ? 2 : 1;
  const effectiveMaxFrequency = isPantsCutPlanSize(size) ? Math.min(step, maxFrequency) : maxFrequency;
  const length = calculateEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex);
  return maximumFrequencyForLength(length, tableLengthCm, effectiveMaxFrequency, step);
}

/** Mantém precisão de cálculo; arredondamento visual pertence ao formatter. */
export function tableCapacityCm(tableLengthCm: number) {
  return tableLengthCm + Number.EPSILON * Math.max(1, tableLengthCm) * 8;
}

export function fitsTable(lengthCm: number, tableLengthCm: number) {
  return Number.isFinite(lengthCm) && lengthCm <= tableCapacityCm(tableLengthCm);
}

export function maximumFrequencyForLength(lengthCm: number | null, tableLengthCm: number, configured: number, step: number) {
  return step * Math.floor(Math.min(configured, lengthCm === null ? configured : tableCapacityCm(tableLengthCm) / lengthCm) / step);
}
