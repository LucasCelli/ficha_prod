export type FabricType = "PLANO" | "TUBULAR";
export type SleeveType = "CURTA" | "LONGA";
export type GarmentType = "T_SHIRT" | "DRESS_SHIRT" | "PANTS" | "SHORTS";

const CUT_PLAN_DEMAND_SEPARATOR = "\u001f";

export function inferCutPlanGarmentType(size: string): GarmentType {
  if (/^CAL[CÇ]A(?:\s|$)/i.test(size.trim())) return "PANTS";
  if (/^(?:SHORT|BERMUDA)(?:\s|$)/i.test(size.trim())) return "SHORTS";
  return "T_SHIRT";
}

export function cutPlanDemandKey(size: string, sleeveType: SleeveType, garmentType = inferCutPlanGarmentType(size)) {
  return `${size}${CUT_PLAN_DEMAND_SEPARATOR}${sleeveType}${CUT_PLAN_DEMAND_SEPARATOR}${garmentType}`;
}

export function parseCutPlanDemandKey(key: string): { garmentType: GarmentType; size: string; sleeveType: SleeveType } {
  const parts = key.split(CUT_PLAN_DEMAND_SEPARATOR);
  if (parts.length < 2) return { garmentType: inferCutPlanGarmentType(key), size: key, sleeveType: "CURTA" };
  const size = parts[0];
  const sleeveType = parts[1] === "LONGA" ? "LONGA" : "CURTA";
  const garmentType = (["T_SHIRT", "DRESS_SHIRT", "PANTS", "SHORTS"] as const).find((type) => type === parts[2]) ?? inferCutPlanGarmentType(size);
  return { garmentType, size, sleeveType };
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
  garmentType?: GarmentType;
  quantity: number;
  /** Quantidade original da ficha; `quantity` permanece como alvo operacional editável. */
  importedQuantity?: number;
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
  maxFrequency?: number;
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
  items: Array<{ color?: string; garmentType?: GarmentType; material?: string; quantity: number; size: string; sleeveType?: SleeveType }>;
  material: string;
  number: string | null;
  sleeveType: SleeveType;
  total: number;
}

export interface MarkerFrequency {
  size: string;
  sleeveType: SleeveType;
  frequency: number;
  garmentType?: GarmentType;
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
  garmentType?: GarmentType;
  requested: number;
  produced: number;
  difference: number;
}

export interface FabricCutPlanResult {
  fabricId: string;
  lays: LayPlan[];
  sizes: SizeProductionResult[];
  searchComplete?: boolean;
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
  search?: {
    status: "optimal" | "feasible";
    termination: "completed" | "time_limit" | "state_limit" | "cancelled";
    measurementsComplete: boolean;
    measurementSource: "REGISTERED" | "FALLBACK_HIGH" | "FALLBACK_MEDIUM" | "FALLBACK_LOW" | "UNKNOWN";
    elapsedMs: number;
  };
}
