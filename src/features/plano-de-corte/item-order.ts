import type { CutPlanItem } from "./model.ts";

export function moveCutPlanItem(items: CutPlanItem[], itemId: string, target: string | number) {
  const fromIndex = items.findIndex((item) => item.id === itemId);
  const toIndex = typeof target === "number" ? target : items.findIndex((item) => item.id === target);
  if (fromIndex < 0 || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
