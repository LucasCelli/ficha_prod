import { fitsTable } from "./dimensions.ts";
import type { CutPlanInput, CutPlanResult, LayPlan, MergedLayPlan } from "./model.ts";
import { checkSearchBudget, SearchInterrupted, type SearchBudget } from "./search-budget.ts";
import { fabricCompatibilityKey, normalizeCompatibilityValue } from "./solution-validation.ts";

type Group = MergedLayPlan & { compatibility: string; colors: string[]; fabrics: string[] };

/** Empacotamento exato das alocações disponíveis, com incumbente guloso. */
export function buildMergedLays(input: CutPlanInput, result: CutPlanResult, budget: SearchBudget): MergedLayPlan[] {
  const fabricIndex = new Map(input.fabrics.map((fabric) => [fabric.id, fabric]));
  const allocations = result.fabrics.flatMap((fabric) => fabric.lays).sort((a, b) => b.layers - a.layers || (b.markerLengthCm ?? 0) - (a.markerLengthCm ?? 0) || a.fabricId.localeCompare(b.fabricId) || a.id.localeCompare(b.id));
  const properties = (lay: LayPlan) => {
    const fabric = fabricIndex.get(lay.fabricId)!;
    return { compatibility: fabricCompatibilityKey(fabric), color: normalizeCompatibilityValue(fabric.color) };
  };
  const make = (lay: LayPlan): Group => ({ id: "", layers: lay.layers, allocations: [lay], markerLengthCm: lay.markerLengthCm, compatibility: properties(lay).compatibility, colors: [properties(lay).color], fabrics: [lay.fabricId] });
  const fits = (group: Group, lay: LayPlan) => {
    const { compatibility, color } = properties(lay);
    return color && group.compatibility === compatibility && group.layers === lay.layers && !group.colors.includes(color)
      && group.colors.every(Boolean) && !group.fabrics.includes(lay.fabricId) && group.markerLengthCm !== undefined && lay.markerLengthCm !== undefined
      && fitsTable(group.markerLengthCm + lay.markerLengthCm, input.tableLengthCm);
  };
  const append = (group: Group, lay: LayPlan): Group => ({ ...group, allocations: [...group.allocations, lay], colors: [...group.colors, properties(lay).color], fabrics: [...group.fabrics, lay.fabricId], markerLengthCm: group.markerLengthCm! + lay.markerLengthCm! });
  let best: Group[] = [];
  for (const lay of allocations) {
    const index = best.findIndex((group) => fits(group, lay));
    if (index < 0) best.push(make(lay));
    else best[index] = append(best[index], lay);
  }
  const classes = new Map<string, { length: number; colors: Map<string, number> }>();
  let isolated = 0;
  for (const lay of allocations) {
    const { compatibility, color } = properties(lay);
    if (lay.markerLengthCm === undefined || !color) { isolated++; continue; }
    const key = JSON.stringify([compatibility, lay.layers]);
    const entry = classes.get(key) ?? { length: 0, colors: new Map<string, number>() };
    entry.length += lay.markerLengthCm;
    entry.colors.set(color, (entry.colors.get(color) ?? 0) + 1);
    classes.set(key, entry);
  }
  const lower = isolated + [...classes.values()].reduce((sum, entry) => sum + Math.max(Math.ceil(entry.length / input.tableLengthCm - 1e-12), ...entry.colors.values()), 0);
  const seen = new Set<string>();
  function visit(index: number, groups: Group[]) {
    if (best.length === lower) return;
    checkSearchBudget(budget);
    if (groups.length >= best.length) return;
    if (index === allocations.length) { best = groups; return; }
    const signature = JSON.stringify([index, groups.map((group) => [group.compatibility, group.layers, group.markerLengthCm, [...group.colors].sort(), [...group.fabrics].sort()]).sort()]);
    if (seen.has(signature)) return;
    seen.add(signature);
    if (seen.size > 150_000) { budget.termination = "state_limit"; throw new SearchInterrupted(); }
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
