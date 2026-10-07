export type FabricType = "PLANO" | "TUBULAR";
export type SleeveType = "CURTA" | "LONGA";
export type CutPlanComponent = "WHOLE" | "BODY" | "SLEEVES";
export type GarmentType = "T_SHIRT" | "BABY_LOOK" | "DRESS_SHIRT" | "CAMISETE" | "LAB_COAT"
  | "PANTS_BRIM" | "SHORTS_BRIM" | "PANTS_HELANCA" | "SHORTS_HELANCA"
  | "PANTS" | "SHORTS";
/** Limite operacional conservador; nunca se aplica a outras modelagens. */
export const MAX_T_SHIRT_OVERPRODUCTION_PER_SIZE = 3;

export function allowsCutPlanOverproduction(garmentType: GarmentType) {
  return garmentType === "T_SHIRT" || garmentType === "BABY_LOOK";
}

export function prioritizesCutPlanLayers(garmentType: GarmentType) {
  return garmentType === "DRESS_SHIRT" || garmentType === "CAMISETE" || garmentType === "LAB_COAT"
    || garmentType === "PANTS_BRIM" || garmentType === "SHORTS_BRIM"
    || garmentType === "PANTS" || garmentType === "SHORTS";
}

export function isPantsGarment(garmentType: GarmentType) {
  return garmentType === "PANTS" || garmentType === "PANTS_BRIM" || garmentType === "PANTS_HELANCA";
}

export function isShortsGarment(garmentType: GarmentType) {
  return garmentType === "SHORTS" || garmentType === "SHORTS_BRIM" || garmentType === "SHORTS_HELANCA";
}

export function getCutPlanEffectiveFabricType(type: FabricType, garmentType: GarmentType): FabricType {
  if (garmentType === "DRESS_SHIRT" || garmentType === "CAMISETE" || garmentType === "LAB_COAT"
    || garmentType === "PANTS_BRIM" || garmentType === "SHORTS_BRIM") return "PLANO";
  if (garmentType === "PANTS_HELANCA" || garmentType === "SHORTS_HELANCA") return "TUBULAR";
  return type;
}

/** Peças de tecido plano podem ter uma repetição por mapa, mesmo em cadastros antigos marcados como tubulares. */
export function getCutPlanFrequencyStep(type: FabricType, garmentType: GarmentType) {
  return getCutPlanEffectiveFabricType(type, garmentType) === "TUBULAR" ? 2 : 1;
}

const CUT_PLAN_DEMAND_SEPARATOR = "\u001f";

export function inferCutPlanGarmentType(size: string): GarmentType {
  if (/^CAL[CÇ]A(?:\s|$)/i.test(size.trim())) return "PANTS";
  if (/^(?:SHORT|BERMUDA)(?:\s|$)/i.test(size.trim())) return "SHORTS";
  return "T_SHIRT";
}

export function cutPlanDemandKey(size: string, sleeveType: SleeveType, garmentType = inferCutPlanGarmentType(size), component: CutPlanComponent = "WHOLE") {
  return `${size}${CUT_PLAN_DEMAND_SEPARATOR}${sleeveType}${CUT_PLAN_DEMAND_SEPARATOR}${garmentType}${CUT_PLAN_DEMAND_SEPARATOR}${component}`;
}

export function parseCutPlanDemandKey(key: string): { garmentType: GarmentType; size: string; sleeveType: SleeveType; component: CutPlanComponent } {
  const parts = key.split(CUT_PLAN_DEMAND_SEPARATOR);
  if (parts.length < 2) return { garmentType: inferCutPlanGarmentType(key), size: key, sleeveType: "CURTA", component: "WHOLE" };
  const size = parts[0];
  const sleeveType = parts[1] === "LONGA" ? "LONGA" : "CURTA";
  const garmentType = (["T_SHIRT", "BABY_LOOK", "DRESS_SHIRT", "CAMISETE", "LAB_COAT", "PANTS_BRIM", "SHORTS_BRIM", "PANTS_HELANCA", "SHORTS_HELANCA", "PANTS", "SHORTS"] as const).find((type) => type === parts[2]) ?? inferCutPlanGarmentType(size);
  const component = parts[3] === "BODY" || parts[3] === "SLEEVES" ? parts[3] : "WHOLE";
  return { garmentType, size, sleeveType, component };
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
  /** Tecido usado apenas nas mangas quando o modo de mangas separadas estiver ativo. */
  sleeveFabricId?: string;
  /** Campo interno preenchido pela normalizacao; linhas da interface usam WHOLE. */
  component?: CutPlanComponent;
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
  separateSleeves?: boolean;
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
  component?: CutPlanComponent;
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
  component?: CutPlanComponent;
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
