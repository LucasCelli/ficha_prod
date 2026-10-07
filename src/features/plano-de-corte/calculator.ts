import {
  cutPlanDemandKey,
  getCutPlanFrequencyStep,
  isPantsGarment,
  isShortsGarment,
  MAX_T_SHIRT_OVERPRODUCTION_PER_SIZE,
  parseCutPlanDemandKey,
  type CutPlanInput,
  type CutPlanResult,
  type FabricCutPlanResult,
  type LayPlan,
  type MarkerFrequency,
} from "./model.ts";
import { buildSizeProfileIndex, estimateMarkerLengthCm, getMaximumEstimatedFrequency, isPantsCutPlanSize, calculateEntryLengthPerFrequencyCm, fitsTable } from "./dimensions.ts";
import { aggregateCutPlanItems, getFabricMaximumFrequency, normalizeCutPlanInput } from "./normalization.ts";
import { checkSearchBudget, createSearchBudget, searchExpired, SearchInterrupted, sliceSearchBudget, type SearchBudget } from "./search-budget.ts";
import { validateCutPlan } from "./validation.ts";
import { validateCutPlanSolution } from "./solution-validation.ts";
import { assessLays, compareSolutionMetrics, solveMinimumLays } from "./solver.ts";
import { compareUniformSizes, isUniformBabyLookText } from "../../lib/uniform-sizes.ts";

export class CutPlanCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CutPlanCalculationError";
  }
}

const aggregateItems = aggregateCutPlanItems;

function findJointCandidate(
  remaining: Map<string, number>,
  maxLayers: number,
  input: CutPlanInput,
  fabricId: string,
  budget: SearchBudget,
): { layers: number; frequencies: MarkerFrequency[] } | null {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId)!;
  const maxFrequency = getFabricMaximumFrequency(input, fabricId);
  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  const entries = [...remaining.entries()].filter(([, quantity]) => quantity > 0);
  if (entries.length < 2) return null;

  let best: { layers: number; frequencies: MarkerFrequency[] } | null = null;
  const maximumLayers = Math.min(maxLayers, Math.max(...entries.map(([, quantity]) => quantity)));

  // Para maximizar a quantidade de entradas com uma altura fixa, selecionar
  // comprimentos crescentes é exato; não é necessário enumerar 2^n subconjuntos.
  const lengths = new Map(entries.map(([key]) => {
    const demand = parseCutPlanDemandKey(key);
    return [key, calculateEntryLengthPerFrequencyCm(demand.size, demand.sleeveType, fabric.type, fabric.widthCm, profileIndex, demand.garmentType, demand.component) ?? 0];
  }));
  for (let layers = maximumLayers; layers >= 1; layers -= 1) {
    checkSearchBudget(budget);
    const compatible = entries.flatMap(([key, quantity]) => {
      const demand = parseCutPlanDemandKey(key);
      const frequency = quantity / layers;
      const step = getCutPlanFrequencyStep(fabric.type, demand.garmentType);
      const limit = Math.min(maxFrequency, isPantsCutPlanSize(demand.size) ? step : maxFrequency);
      return Number.isInteger(frequency) && frequency >= step && frequency <= limit && frequency % step === 0
        ? [{ ...demand, frequency, length: lengths.get(key)! * frequency }] : [];
    }).sort((a, b) => a.length - b.length || compareUniformSizes(a.size, b.size) || a.sleeveType.localeCompare(b.sleeveType));
    let length = 0;
    let totalFrequency = 0;
    const selected: MarkerFrequency[] = [];
    for (const item of compatible) {
      if (!fitsTable(length + item.length, input.tableLengthCm)) break;
      if (totalFrequency + item.frequency > maxFrequency) continue;
      length += item.length;
      totalFrequency += item.frequency;
      selected.push({ garmentType: item.garmentType, size: item.size, sleeveType: item.sleeveType, component: item.component, frequency: item.frequency });
    }
    if (selected.length >= 2 && (!best || selected.length > best.frequencies.length || (selected.length === best.frequencies.length && layers > best.layers))) best = { layers, frequencies: selected };
  }
  return best;
}

function subtractProduction(remaining: Map<string, number>, lay: Pick<LayPlan, "layers" | "frequencies">) {
  for (const marker of lay.frequencies) {
    const key = cutPlanDemandKey(marker.size, marker.sleeveType, marker.garmentType, marker.component);
    remaining.set(key, (remaining.get(key) ?? 0) - marker.frequency * lay.layers);
  }
}

function calculateSizes(requested: Map<string, number>, lays: LayPlan[]) {
  const keys = new Set([...requested.keys(), ...lays.flatMap((lay) => lay.frequencies.map((marker) => cutPlanDemandKey(marker.size, marker.sleeveType, marker.garmentType, marker.component)))]);
  return [...keys].map((key) => {
    const quantity = requested.get(key) ?? 0;
    const { garmentType, size, sleeveType, component } = parseCutPlanDemandKey(key);
    const produced = lays.reduce((total, lay) => {
      const marker = lay.frequencies.find((frequency) => frequency.size === size && frequency.sleeveType === sleeveType && (frequency.garmentType ?? "T_SHIRT") === garmentType && (frequency.component ?? "WHOLE") === component);
      return total + (marker ? marker.frequency * lay.layers : 0);
    }, 0);
    return { garmentType, size, sleeveType, ...(component === "WHOLE" ? {} : { component }), requested: quantity, produced, difference: produced - quantity };
  });
}

export function calculateFabricPlan(input: CutPlanInput, fabricId: string, optimize = true, budget = createSearchBudget()): FabricCutPlanResult {
  const rawErrors = validateCutPlan(input, false);
  if (rawErrors.length) throw new CutPlanCalculationError(rawErrors.join(" "));
  input = normalizeCutPlanInput(input);
  const errors = validateCutPlan(input, false);
  if (errors.length) throw new CutPlanCalculationError(errors.join(" "));
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId);
  if (!fabric) throw new CutPlanCalculationError("Uma das linhas está apontando para um tecido que não existe mais.");

  const requested = aggregateItems(input, fabricId, true);
  const operational = aggregateItems(input, fabricId);
  const effectiveMaxFrequency = getFabricMaximumFrequency(input, fabricId);
  const optimizationTarget = new Map([...operational].map(([size, quantity]) => [
    size,
    (() => {
      const { garmentType } = parseCutPlanDemandKey(size);
      const step = getCutPlanFrequencyStep(fabric.type, garmentType);
      return step * Math.ceil(quantity / step);
    })(),
  ]));

  const remaining = new Map(optimizationTarget);
  const lays: LayPlan[] = [];
  const addLay = (layers: number, frequencies: MarkerFrequency[]) => {
    const lay = { id: `${fabricId}-lay-${lays.length + 1}`, fabricId, layers, frequencies };
    lays.push(lay);
    subtractProduction(remaining, lay);
  };

  while ([...remaining.values()].some((quantity) => quantity > 0)) {
    checkSearchBudget(budget);
    const joint = findJointCandidate(remaining, input.maxLayers, input, fabricId, budget);
    if (joint) {
      addLay(joint.layers, joint.frequencies);
      continue;
    }

    const [demandKey, quantity] = [...remaining.entries()].find(([, value]) => value > 0)!;
    const { garmentType, size, sleeveType, component } = parseCutPlanDemandKey(demandKey);
    const step = getCutPlanFrequencyStep(fabric.type, garmentType);
    const maximumFrequency = Math.min(quantity, getMaximumEstimatedFrequency(size, sleeveType, fabric.type, fabric.widthCm, input.tableLengthCm, input.sizeProfiles, effectiveMaxFrequency, garmentType, component));
    if (maximumFrequency < step) throw new CutPlanCalculationError(`O tamanho ${size} ultrapassa a mesa mesmo na menor grade.`);
    let frequency = maximumFrequency;
    let layers = Math.min(input.maxLayers, Math.floor(quantity / frequency));
    // A altura é limitada a 50/100: procurar divisores por altura evita percorrer
    // uma frequência configurada enorme e fecha a demanda inteira quando possível.
    for (let candidateLayers = Math.min(input.maxLayers, Math.floor(quantity / step)); candidateLayers >= 1; candidateLayers--) {
      checkSearchBudget(budget);
      const candidateFrequency = quantity / candidateLayers;
      if (Number.isInteger(candidateFrequency) && candidateFrequency % step === 0 && candidateFrequency <= maximumFrequency) {
        frequency = candidateFrequency; layers = candidateLayers; break;
      }
    }
    addLay(layers, [{ garmentType, size, sleeveType, component, frequency }]);
  }

  const constraints = {
    budget,
    additionalLayCounts: fabric.type === "PLANO" ? 1 : 0,
    tableLengthCm: input.tableLengthCm,
    fabricWidthCm: fabric.widthCm,
    sizeProfiles: input.sizeProfiles,
    maxFrequency: effectiveMaxFrequency,
    maxTShirtOverproductionPerSize: MAX_T_SHIRT_OVERPRODUCTION_PER_SIZE,
  };
  const baseline = assessLays(lays, optimizationTarget, fabric.type, constraints);
  // Acima deste porte, a combinação exata sob teto global cresce muito rápido.
  // O incumbente construtivo já é válido e deve ser devolvido sem consumir todo o prazo.
  const optimized = optimize && optimizationTarget.size <= 12 && !searchExpired(budget)
    ? solveMinimumLays(optimizationTarget, input.maxLayers, fabric.type, lays.length, constraints)[0]
    : undefined;
  const useOptimized = optimized && compareSolutionMetrics(optimized, baseline) <= 0;
  if (useOptimized) {
    lays.splice(0, lays.length, ...optimized.lays.map((lay, index) => ({ ...lay, id: `${fabricId}-lay-${index + 1}`, fabricId })));
  }

  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  for (const lay of lays) {
    const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
    lay.markerLengthCm = markerLength === null ? undefined : markerLength;
  }

  const sizes = calculateSizes(requested, lays);
  const targetSizes = calculateSizes(optimizationTarget, lays);
  if (lays.some((lay) => !Number.isInteger(lay.layers) || lay.layers < 1 || lay.layers > input.maxLayers)
    || lays.some((lay) => lay.frequencies.some(({ frequency, garmentType = "T_SHIRT" }) => frequency < getCutPlanFrequencyStep(fabric.type, garmentType)
      || !Number.isInteger(frequency)
      || frequency > effectiveMaxFrequency
      || frequency % getCutPlanFrequencyStep(fabric.type, garmentType) !== 0))
    || targetSizes.some(({ difference, garmentType }) => difference < 0 || (garmentType !== "T_SHIRT" && garmentType !== "BABY_LOOK" && difference !== 0))
    || targetSizes.some(({ difference }) => difference > MAX_T_SHIRT_OVERPRODUCTION_PER_SIZE)) {
    throw new CutPlanCalculationError("Não deu para fechar a conta com esses limites. Aumente o máximo de folhas por enfesto ou revise as quantidades.");
  }
  const result = { fabricId, lays, sizes, searchComplete: Boolean(useOptimized && optimized.searchComplete) };
  validateCutPlanSolution({ ...input, fabrics: [fabric], items: input.items.filter((item) => item.fabricId === fabricId) }, { fabrics: [result] });
  return result;
}

export function calculateCutPlan(input: CutPlanInput, optimize = true, budget = createSearchBudget()): CutPlanResult {
  const rawErrors = validateCutPlan(input, false);
  if (rawErrors.length) throw new CutPlanCalculationError(rawErrors.join(" "));
  input = normalizeCutPlanInput(input);
  const errors = validateCutPlan(input, false);
  if (errors.length) throw new CutPlanCalculationError(errors.join(" "));
  const result: CutPlanResult = { fabrics: input.fabrics
    .filter((fabric) => input.items.some((item) => item.fabricId === fabric.id))
    .map((fabric) => calculateFabricPlan(input, fabric.id, false, budget)) };
  let termination = budget.termination;
  // Todos os tecidos já possuem um plano antes de gastar o prazo com otimização.
  if (optimize) for (let i = 0; i < result.fabrics.length; i++) {
    if (searchExpired(budget)) { termination = budget.termination; break; }
    const local = sliceSearchBudget(budget, (budget.deadline - budget.now()) / (result.fabrics.length - i));
    try { result.fabrics[i] = calculateFabricPlan(input, result.fabrics[i].fabricId, true, local); }
    catch (error) { if (!(error instanceof SearchInterrupted)) throw error; }
    if (local.termination !== "completed") termination = local.termination;
  }
  const validation = validateCutPlanSolution(input, result);
  result.search = { status: result.fabrics.length === 1 && result.fabrics[0].searchComplete && validation.measurementsComplete ? "optimal" : "feasible", termination, measurementsComplete: validation.measurementsComplete, measurementSource: validation.measurementSource, elapsedMs: budget.now() - budget.startedAt };
  return result;
}

export function recalculateFabricResult(
  input: CutPlanInput,
  fabricId: string,
  lays: LayPlan[],
): FabricCutPlanResult {
  const fabric = input.fabrics.find((candidate) => candidate.id === fabricId)!;
  const profileIndex = buildSizeProfileIndex(input.sizeProfiles);
  const measuredLays = lays.map((lay) => {
    const markerLength = estimateMarkerLengthCm(lay.frequencies, fabric.type, fabric.widthCm, profileIndex);
    return { ...lay, markerLengthCm: markerLength === null ? undefined : markerLength };
  });
  return { fabricId, lays: measuredLays, sizes: calculateSizes(aggregateItems(input, fabricId), measuredLays) };
}

export function formatCutPlanSizeLabel(size: string, garmentType?: MarkerFrequency["garmentType"]) {
  const trimmed = size.trim();
  const hasBabyLookPrefix = /^(?:BABY(?:\s+LOOK)?|BL)\s+/i.test(trimmed);
  const hasFemalePrefix = /^FEM(?:ININA)?\.?\s+/i.test(trimmed);
  const normalizedSize = trimmed.replace(/^(?:(?:BABY(?:\s+LOOK)?|BL)|FEM(?:ININA)?\.?|MASC(?:ULINA|ULINO)?\.?)\s+/i, "");

  if (garmentType && (isPantsGarment(garmentType) || isShortsGarment(garmentType))) return trimmed.replace(/^(?:SHORT|BERMUDA|CALÇA)\s+/i, "");

  if (garmentType === "DRESS_SHIRT") return `${hasBabyLookPrefix || hasFemalePrefix ? "FEM." : "MASC."} ${normalizedSize}`;
  if (garmentType === "CAMISETE") return `FEM. ${normalizedSize}`;
  if (garmentType === "BABY_LOOK") return `BL ${normalizedSize}`;
  if (garmentType === "T_SHIRT") return hasBabyLookPrefix ? `BL ${normalizedSize}` : normalizedSize;

  if (hasBabyLookPrefix) return `BL ${normalizedSize}`;
  if (hasFemalePrefix) return `FEM. ${normalizedSize}`;
  if (/^MASC(?:ULINA|ULINO)?\.?\s+/i.test(trimmed)) return `MASC. ${normalizedSize}`;
  return trimmed;
}

export function formatCutPlanItemType(size: string, sleeveType: MarkerFrequency["sleeveType"], garmentType?: MarkerFrequency["garmentType"], component: MarkerFrequency["component"] = "WHOLE") {
  if (component === "BODY") return "Corpo";
  if (component === "SLEEVES") return sleeveType === "LONGA" ? "Mangas longas" : "Mangas curtas";
  if (garmentType === "BABY_LOOK") return sleeveType === "LONGA" ? "Babylook · longa" : "Babylook · curta";
  if (garmentType === "CAMISETE") return sleeveType === "LONGA" ? "Camisete · longa" : "Camisete · curta";
  if (garmentType === "DRESS_SHIRT") return sleeveType === "LONGA" ? "Camisa social · longa" : "Camisa social · curta";
  if (garmentType === "LAB_COAT") return "Jaleco de Brim · plano";
  if (garmentType === "PANTS_BRIM") return "Calça de Brim · plano";
  if (garmentType === "SHORTS_BRIM") return "Bermuda de Brim · plano";
  if (garmentType === "PANTS_HELANCA") return "Calça de Helanca · tubular";
  if (garmentType === "SHORTS_HELANCA") return "Bermuda de Helanca · tubular";
  const garment = size.trim().match(/^(SHORT|BERMUDA|CALÇA)(?:\s|$)/i)?.[1];
  if (garment && /^(?:SHORT|BERMUDA)$/i.test(garment)) return "Short/Bermuda";
  if (garment) return garment.charAt(0).toUpperCase() + garment.slice(1).toLocaleLowerCase("pt-BR");
  return sleeveType === "LONGA" ? "Longa" : "Curta";
}

export function sortMarkerFrequenciesForDisplay(frequencies: MarkerFrequency[]) {
  return [...frequencies].sort((first, second) => {
    const modelOrder = Number(isUniformBabyLookText(first.size)) - Number(isUniformBabyLookText(second.size));
    if (modelOrder !== 0) return modelOrder;
    return compareUniformSizes(first.size, second.size)
      || (first.garmentType ?? "T_SHIRT").localeCompare(second.garmentType ?? "T_SHIRT")
      || first.sleeveType.localeCompare(second.sleeveType);
  });
}

export function formatMarkerLabel(frequencies: MarkerFrequency[], showSleeveType = true) {
  return sortMarkerFrequenciesForDisplay(frequencies).map(({ garmentType, size, sleeveType, component, frequency }) => `${frequency}-${formatCutPlanSizeLabel(size, garmentType)}${garmentType === "DRESS_SHIRT" ? " SOCIAL" : garmentType === "BABY_LOOK" ? " BABYLOOK" : garmentType === "CAMISETE" ? " CAMISETE" : garmentType === "LAB_COAT" ? " JALECO" : ""}${component === "BODY" ? " CORPO" : component === "SLEEVES" ? " MANGAS" : showSleeveType ? ` ${sleeveType === "LONGA" ? "ML" : "MC"}` : ""}`).join(" + ");
}

export function formatOperationalMarkerLabel(frequencies: MarkerFrequency[], showSleeveType = true) {
  return sortMarkerFrequenciesForDisplay(frequencies)
    .map(({ garmentType, size, sleeveType, component, frequency }) => `${frequency}-${formatCutPlanSizeLabel(size, garmentType)}${garmentType === "BABY_LOOK" ? " BABYLOOK" : ""}${component === "BODY" ? " CORPO" : component === "SLEEVES" ? " MANGAS" : showSleeveType ? ` ${sleeveType === "LONGA" ? "ML" : "MC"}` : ""}`)
    .join(", ");
}

export function groupCutPlanRowsByModel<T extends Pick<MarkerFrequency, "garmentType" | "size" | "sleeveType" | "component">>(rows: T[]) {
  const sorted = [...rows].sort((left, right) => compareUniformSizes(left.size, right.size)
    || left.sleeveType.localeCompare(right.sleeveType)
    || (left.component ?? "WHOLE").localeCompare(right.component ?? "WHOLE")
    || (left.garmentType ?? "T_SHIRT").localeCompare(right.garmentType ?? "T_SHIRT"));
  const masculine = sorted.filter((row) => row.garmentType !== "BABY_LOOK" && row.garmentType !== "CAMISETE");
  const feminine = sorted.filter((row) => row.garmentType === "BABY_LOOK" || row.garmentType === "CAMISETE");
  return [
    { key: "masculine", label: "Masculino", rows: masculine },
    { key: "feminine", label: "Feminino", rows: feminine },
  ].filter((group) => group.rows.length > 0);
}

/** Rotulo contado no padrao do projeto: plural escrito, nunca "(s)". */
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

