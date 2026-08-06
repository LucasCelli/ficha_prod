export type FabricType = "PLANO" | "TUBULAR";

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
  quantity: number;
  sourceFichaId?: string;
}

export interface CutPlanSizeProfile {
  id: string;
  size: string;
  aliases: string[];
  bodyHeightCm: number;
  bodyWidthCm: number;
  sleeveHeightCm: number;
  sleeveWidthCm: number;
}

export interface CutPlanInput {
  tableLengthCm: number;
  maxLayers: number;
  fabrics: CutPlanFabric[];
  items: CutPlanItem[];
  sizeProfiles: CutPlanSizeProfile[];
  sourceFichaIds?: string[];
}

export interface CutPlanSourceFicha {
  client: string;
  color: string;
  id: string;
  imageUrl: string | null;
  items: Array<{ quantity: number; size: string }>;
  material: string;
  number: string | null;
  total: number;
}

export interface MarkerFrequency {
  size: string;
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
  requested: number;
  produced: number;
  difference: number;
}

export interface FabricCutPlanResult {
  fabricId: string;
  lays: LayPlan[];
  sizes: SizeProductionResult[];
}

export interface CutPlanResult {
  fabrics: FabricCutPlanResult[];
}
