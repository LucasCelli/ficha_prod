import { isUniformBabyLookText, normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";
import { getCutPlanEffectiveFabricType, getCutPlanFrequencyStep, inferCutPlanGarmentType, isPantsGarment, isShortsGarment, type CutPlanComponent, type CutPlanSizeProfile, type FabricType, type GarmentType, type MarkerFrequency, type SleeveType } from "./model.ts";
import { resolveLowerGarmentFallback, resolveShirtFallback, type MeasurementSource } from "./fallback-dimensions.ts";

/** Margem conservadora para perdas do encaixe aproximado. */
export const ESTIMATED_NESTING_EFFICIENCY = 0.82;
export const PANTS_ESTIMATED_HEIGHT_CM = 120;
export const PANTS_ESTIMATED_WIDTH_CM = 44;
export const SHORTS_ESTIMATED_HEIGHT_CM = 60;
export const SHORTS_ESTIMATED_WIDTH_CM = 44;
/** Reserva para pala, colarinho, pé de gola, vistas, punhos e bolsos. */
export const DRESS_SHIRT_COMPONENT_ALLOWANCE = 1.18;
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
  component: CutPlanComponent = "WHOLE",
) {
  const sleeveHeightCm = sleeveType === "LONGA" ? profile.longSleeveHeightCm : profile.shortSleeveHeightCm;
  const sleeveWidthCm = sleeveType === "LONGA" ? profile.longSleeveWidthCm : profile.shortSleeveWidthCm;
  const bodyAreaCm2 = profile.frontHeightCm * profile.frontWidthCm + profile.backHeightCm * profile.backWidthCm;
  const sleevesAreaCm2 = sleeveHeightCm * sleeveWidthCm * 2;
  const shirtAreaCm2 = component === "BODY" ? bodyAreaCm2 : component === "SLEEVES" ? sleevesAreaCm2 : bodyAreaCm2 + sleevesAreaCm2;
  let markerAreaCm2 = shirtAreaCm2 * frequency;
  if (type === "TUBULAR") {
    const frontAreaCm2 = profile.frontHeightCm * profile.frontWidthCm;
    const foldedBackHalfAreaCm2 = profile.backHeightCm * (profile.backWidthCm / 2);
    const fullSleeveAreaCm2 = sleeveHeightCm * sleeveWidthCm;
    const foldedSleeveHalfAreaCm2 = sleeveHeightCm * (sleeveWidthCm / 2);
    const tubularBodyAreaCm2 = frontAreaCm2 + foldedBackHalfAreaCm2 * 2;
    const tubularSleevesAreaCm2 = fullSleeveAreaCm2 + foldedSleeveHalfAreaCm2 * 2;
    const areaPerProducedPairCm2 = component === "BODY" ? tubularBodyAreaCm2 : component === "SLEEVES" ? tubularSleevesAreaCm2 : tubularBodyAreaCm2 + tubularSleevesAreaCm2;
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
  garmentType?: GarmentType,
  component: CutPlanComponent = "WHOLE",
) {
  return resolveEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex, garmentType, component).lengthCm;
}

export function resolveEntryLengthPerFrequencyCm(
  size: string,
  sleeveType: SleeveType,
  type: FabricType,
  fabricWidthCm: number,
  profileIndex: Map<string, CutPlanSizeProfile>,
  garmentType?: GarmentType,
  component: CutPlanComponent = "WHOLE",
): { lengthCm: number | null; source: MeasurementSource } {
  const effectiveType = getCutPlanEffectiveFabricType(type, garmentType ?? inferCutPlanGarmentType(size));
  if ((garmentType && isPantsGarment(garmentType)) || isPantsCutPlanSize(size)) {
    return calculateFallbackLowerGarmentLength(size, "PANTS", effectiveType, fabricWidthCm)
      ?? { lengthCm: calculateLowerGarmentLengthPerFrequencyCm(PANTS_ESTIMATED_HEIGHT_CM, PANTS_ESTIMATED_WIDTH_CM, effectiveType, fabricWidthCm), source: "FALLBACK_LOW" };
  }
  if ((garmentType && isShortsGarment(garmentType)) || isShortsSize(size)) {
    return calculateFallbackLowerGarmentLength(size, "SHORTS", effectiveType, fabricWidthCm)
      ?? { lengthCm: calculateLowerGarmentLengthPerFrequencyCm(SHORTS_ESTIMATED_HEIGHT_CM, SHORTS_ESTIMATED_WIDTH_CM, effectiveType, fabricWidthCm), source: "FALLBACK_LOW" };
  }
  const isFemaleModel = garmentType === "BABY_LOOK" || garmentType === "CAMISETE";
  const isDressShirt = garmentType === "DRESS_SHIRT" || garmentType === "CAMISETE" || garmentType === "LAB_COAT";
  const measurementSize = isFemaleModel && !isUniformBabyLookText(size) ? `FEM ${size}` : size;
  // Camisas sociais usam as mesmas medidas-base, acrescidas dos componentes
  // próprios da modelagem que não existem numa camiseta.
  const profile = profileIndex.get(normalizeCutPlanSizeKey(measurementSize));
  if (profile) {
    const base = calculateMarkerAreaLengthCm(profile, sleeveType, effectiveType, fabricWidthCm, 1, component);
    return { lengthCm: isDressShirt ? base * DRESS_SHIRT_COMPONENT_ALLOWANCE : base, source: "REGISTERED" };
  }
  const fallback = resolveShirtFallback(measurementSize, sleeveType, isDressShirt);
  if (!fallback) return { lengthCm: null, source: "UNKNOWN" };
  // Na separacao de mangas curtas, usa a proporcao operacional observada no
  // encaixe: 1/4 do comprimento e 1/2 da largura do corpo. O perfil cadastrado
  // acima continua soberano; a grade completa (WHOLE) conserva a regra antiga.
  const componentProfile = component === "SLEEVES" && sleeveType === "CURTA"
    ? {
      ...fallback.profile,
      shortSleeveHeightCm: ((fallback.profile.frontHeightCm + fallback.profile.backHeightCm) / 2) * 0.25,
      shortSleeveWidthCm: ((fallback.profile.frontWidthCm + fallback.profile.backWidthCm) / 2) * 0.5,
    }
    : fallback.profile;
  const base = calculateMarkerAreaLengthCm(componentProfile, sleeveType, effectiveType, fabricWidthCm, 1, component);
  const wholeBase = calculateMarkerAreaLengthCm(fallback.profile, sleeveType, effectiveType, fabricWidthCm, 1);
  const wholeEstimated = fallback.margin.kind === "fixed"
    ? wholeBase + fallback.margin.value
    : wholeBase + Math.min(fallback.margin.maximumCm, wholeBase * (fallback.margin.value - 1));
  // Ao separar componentes, a margem do fallback precisa ser rateada; somar a
  // margem inteira ao corpo e novamente às mangas inflaria a metragem total.
  const estimated = wholeBase > 0 ? wholeEstimated * (base / wholeBase) : base;
  const lengthCm = isDressShirt ? estimated * DRESS_SHIRT_COMPONENT_ALLOWANCE : estimated;
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
  for (const { garmentType, size, sleeveType, frequency, component } of frequencies) {
    const lengthPerFrequency = calculateEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex, garmentType, component);
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
  garmentType?: GarmentType,
  component: CutPlanComponent = "WHOLE",
) {
  const profileIndex = buildSizeProfileIndex(profiles);
  const step = getCutPlanFrequencyStep(type, garmentType ?? inferCutPlanGarmentType(size));
  const effectiveMaxFrequency = (garmentType && isPantsGarment(garmentType)) || isPantsCutPlanSize(size) ? Math.min(step, maxFrequency) : maxFrequency;
  const length = calculateEntryLengthPerFrequencyCm(size, sleeveType, type, fabricWidthCm, profileIndex, garmentType, component);
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
