export type FabricType = "PLANO" | "TUBULAR";
export type SleeveType = "CURTA" | "LONGA";

const CUT_PLAN_DEMAND_SEPARATOR = "\u001f";

export function cutPlanDemandKey(size: string, sleeveType: SleeveType) {
  return `${size}${CUT_PLAN_DEMAND_SEPARATOR}${sleeveType}`;
}

export function parseCutPlanDemandKey(key: string): { size: string; sleeveType: SleeveType } {
  const separatorIndex = key.lastIndexOf(CUT_PLAN_DEMAND_SEPARATOR);
  if (separatorIndex < 0) return { size: key, sleeveType: "CURTA" };
  const sleeveType = key.slice(separatorIndex + 1) === "LONGA" ? "LONGA" : "CURTA";
  return { size: key.slice(0, separatorIndex), sleeveType };
}

export interface CutPlanFabric {
  id: string;
  name: string;
  color: string;
  widthCm: number;
  type: FabricType;
}

export interface CutPlanItem {
  id: string;
  fabricId: string;
  size: string;
  sleeveType: SleeveType;
  quantity: number;
  sourceFichaId?: string;
}

export interface CutPlanSizeProfile {
  id: string;
  size: string;
  aliases: string[];
  backHeightCm: number;
  backWidthCm: number;
  frontHeightCm: number;
  frontWidthCm: number;
  longSleeveHeightCm: number;
  longSleeveWidthCm: number;
  shortSleeveHeightCm: number;
  shortSleeveWidthCm: number;
}

export interface CutPlanInput {
  tableLengthCm: number;
  maxLayers: number;
  fabrics: CutPlanFabric[];
  items: CutPlanItem[];
  sizeProfiles: CutPlanSizeProfile[];
  sourceFichaIds?: string[];
  mergeFabricsInLays?: boolean;
}

export interface CutPlanSourceFicha {
  client: string;
  color: string;
  id: string;
  imageUrl: string | null;
  items: Array<{ quantity: number; size: string }>;
  material: string;
  number: string | null;
  sleeveType: SleeveType;
  total: number;
}

export interface MarkerFrequency {
  size: string;
  sleeveType: SleeveType;
  frequency: number;
}

export interface LayPlan {
  id: string;
  fabricId: string;
  layers: number;
  frequencies: MarkerFrequency[];
  markerLengthCm?: number;
  markerFileName?: string;
}

export interface SizeProductionResult {
  size: string;
  sleeveType: SleeveType;
  requested: number;
  produced: number;
  difference: number;
}

export interface FabricCutPlanResult {
  fabricId: string;
  lays: LayPlan[];
  sizes: SizeProductionResult[];
}

export interface MergedLayPlan {
  id: string;
  layers: number;
  allocations: LayPlan[];
  markerLengthCm?: number;
}

export interface CutPlanResult {
  fabrics: FabricCutPlanResult[];
  mergedLays?: MergedLayPlan[];
}
