import { getLayerLimit } from "./dimensions.ts";
import type { CutPlanInput, CutPlanResult, LayPlan, MergedLayPlan } from "./model.ts";
import { checkSearchBudget, SearchInterrupted, type SearchBudget } from "./search-budget.ts";
import { fabricCompatibilityKey, normalizeCompatibilityValue } from "./solution-validation.ts";

type Group = MergedLayPlan & { compatibility: string; colors: string[]; fabrics: string[]; marker: string };

function markerSignature(lay: LayPlan) {
  return JSON.stringify(lay.frequencies.map((item) => [item.garmentType ?? "T_SHIRT", item.size, item.sleeveType, item.component ?? "WHOLE", item.frequency]).sort());
}

/** Bound inferior aditivo por compatibilidade e por mapa realmente compartilhavel. */
export function calculateMergedLayLowerBound(input: CutPlanInput, result: CutPlanResult) {
  const fabricIndex = new Map(input.fabrics.map((fabric) => [fabric.id, fabric]));
  const classes = new Map<string, { layers: number; fabrics: Map<string, number>; capacity: number }>();
  let isolated = 0;
  for (const lay of result.fabrics.flatMap((fabric) => fabric.lays)) {
    const fabric = fabricIndex.get(lay.fabricId)!;
    const color = normalizeCompatibilityValue(fabric.color);
    if (lay.markerLengthCm === undefined || !color) { isolated++; continue; }
    const key = JSON.stringify([fabricCompatibilityKey(fabric), markerSignature(lay)]);
    const entry = classes.get(key) ?? { layers: 0, fabrics: new Map<string, number>(), capacity: Math.min(input.maxLayers, getLayerLimit(fabric.type)) };
    entry.layers += lay.layers;
    entry.fabrics.set(fabric.id, (entry.fabrics.get(fabric.id) ?? 0) + 1);
    classes.set(key, entry);
  }
  return isolated + [...classes.values()].reduce((sum, entry) => sum
    + Math.max(Math.ceil(entry.layers / entry.capacity), ...entry.fabrics.values()), 0);
}

/** Empacotamento exato das alocações disponíveis, com incumbente guloso. */
export function buildMergedLays(input: CutPlanInput, result: CutPlanResult, budget: SearchBudget): MergedLayPlan[] {
  const fabricIndex = new Map(input.fabrics.map((fabric) => [fabric.id, fabric]));
  const allocations = result.fabrics.flatMap((fabric) => fabric.lays).sort((a, b) => b.layers - a.layers || (b.markerLengthCm ?? 0) - (a.markerLengthCm ?? 0) || a.fabricId.localeCompare(b.fabricId) || a.id.localeCompare(b.id));
  const properties = (lay: LayPlan) => {
    const fabric = fabricIndex.get(lay.fabricId)!;
    return { compatibility: fabricCompatibilityKey(fabric), color: normalizeCompatibilityValue(fabric.color) };
  };
  const make = (lay: LayPlan): Group => ({ id: "", layers: lay.layers, allocations: [lay], markerLengthCm: lay.markerLengthCm, compatibility: properties(lay).compatibility, colors: [properties(lay).color], fabrics: [lay.fabricId], marker: markerSignature(lay) });
  const fits = (group: Group, lay: LayPlan) => {
    const { compatibility, color } = properties(lay);
    const fabric = fabricIndex.get(lay.fabricId)!;
    return color && group.compatibility === compatibility && group.marker === markerSignature(lay) && !group.colors.includes(color)
      && group.colors.every(Boolean) && !group.fabrics.includes(lay.fabricId) && group.markerLengthCm !== undefined && lay.markerLengthCm !== undefined
      && Math.abs(group.markerLengthCm - lay.markerLengthCm) <= 1e-8
      && group.layers + lay.layers <= Math.min(input.maxLayers, getLayerLimit(fabric.type));
  };
  const append = (group: Group, lay: LayPlan): Group => ({ ...group, layers: group.layers + lay.layers, allocations: [...group.allocations, lay], colors: [...group.colors, properties(lay).color], fabrics: [...group.fabrics, lay.fabricId] });
  let best: Group[] = [];
  for (const lay of allocations) {
    const index = best.findIndex((group) => fits(group, lay));
    if (index < 0) best.push(make(lay));
    else best[index] = append(best[index], lay);
  }
  const lower = calculateMergedLayLowerBound(input, result);
  const seen = new Set<string>();
  function visit(index: number, groups: Group[]) {
    if (best.length === lower) return;
    checkSearchBudget(budget);
    if (groups.length >= best.length) return;
    if (index === allocations.length) { best = groups; return; }
    const signature = JSON.stringify([index, groups.map((group) => [group.compatibility, group.marker, group.layers, [...group.colors].sort(), [...group.fabrics].sort()]).sort()]);
    if (seen.has(signature)) return;
    seen.add(signature);
    // Este cache evita trabalho repetido, mas nao participa da correcao da busca.
    // Reinicia-lo limita a memoria e permite continuar ate o prazo global.
    if (seen.size > 150_000) seen.clear();
    const lay = allocations[index];
    for (let i = 0; i < groups.length; i++) {
      if (!fits(groups[i], lay)) continue;
      const next = [...groups];
      next[i] = append(groups[i], lay);
      visit(index + 1, next);
    }
    visit(index + 1, [...groups, make(lay)]);
  }
  try { visit(0, []); } catch (error) { if (!(error instanceof SearchInterrupted)) throw error; }
  return best.map((group, index) => ({ id: `merged-lay-${index + 1}`, layers: group.layers, allocations: group.allocations, ...(group.markerLengthCm !== undefined ? { markerLengthCm: group.markerLengthCm } : {}) }));
}
