import { buildSizeProfileIndex, normalizeCutPlanSizeKey } from "./dimensions.ts";
import { cutPlanDemandKey, type CutPlanInput } from "./model.ts";

export function normalizeCutPlanInput(input: CutPlanInput): CutPlanInput {
  const profiles = buildSizeProfileIndex(input.sizeProfiles);
  return {
    ...input,
    fabrics: [...input.fabrics].sort((a, b) => a.id.localeCompare(b.id)),
    items: input.items.map((item) => {
      const text = item.size.trim().replace(/\s+/g, " ").replace(/^BERMUDA(?=\s|$)/i, "SHORT");
      // Peças inferiores não podem herdar a identidade do perfil de camiseta.
      const garment = /^(?:CAL[CÇ]A|SHORT)(?:\s|$)/i.test(text);
      const profile = garment ? undefined : profiles.get(normalizeCutPlanSizeKey(text));
      return { ...item, size: profile?.size ?? text };
    }).sort((a, b) => a.fabricId.localeCompare(b.fabricId) || a.size.localeCompare(b.size) || a.sleeveType.localeCompare(b.sleeveType) || a.id.localeCompare(b.id)),
  };
}

export function aggregateCutPlanItems(input: CutPlanInput, fabricId: string, imported = false) {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (item.fabricId !== fabricId) continue;
    const key = cutPlanDemandKey(item.size, item.sleeveType);
    const quantity = (quantities.get(key) ?? 0) + (imported ? item.importedQuantity ?? item.quantity : item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("A quantidade total está fora do limite suportado.");
    if (!imported && input.fabrics.find((fabric) => fabric.id === fabricId)?.type === "TUBULAR" && !Number.isSafeInteger(2 * Math.ceil(quantity / 2))) throw new Error("A quantidade tubular total está fora do limite suportado.");
    quantities.set(key, quantity);
  }
  return quantities;
}
