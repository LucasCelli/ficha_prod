import { buildSizeProfileIndex, normalizeCutPlanSizeKey } from "./dimensions.ts";
import { cutPlanDemandKey, getCutPlanFrequencyStep, inferCutPlanGarmentType, type CutPlanInput } from "./model.ts";

export function normalizeCutPlanInput(input: CutPlanInput): CutPlanInput {
  const profiles = buildSizeProfileIndex(input.sizeProfiles);
  const displaySizeByProfile = new Map<string, string>();
  return {
    ...input,
    fabrics: [...input.fabrics].sort((a, b) => a.id.localeCompare(b.id)),
    items: input.items.map((item) => {
      const text = item.size.trim().replace(/\s+/g, " ").replace(/^BERMUDA(?=\s|$)/i, "SHORT");
      const garmentType = item.garmentType ?? inferCutPlanGarmentType(text);
      // Peças inferiores não podem herdar a identidade do perfil de camiseta.
      const garment = /^(?:CAL[CÇ]A|SHORT)(?:\s|$)/i.test(text);
      const profile = garment ? undefined : profiles.get(normalizeCutPlanSizeKey(text));
      const displayKey = profile ? `${profile.id}:${garmentType}` : "";
      if (profile && !displaySizeByProfile.has(displayKey)) displaySizeByProfile.set(displayKey, text);
      return { ...item, garmentType, size: profile ? displaySizeByProfile.get(displayKey)! : text };
    }).sort((a, b) => a.fabricId.localeCompare(b.fabricId) || a.size.localeCompare(b.size) || a.sleeveType.localeCompare(b.sleeveType) || (a.garmentType ?? "").localeCompare(b.garmentType ?? "") || a.id.localeCompare(b.id)),
  };
}

export function aggregateCutPlanItems(input: CutPlanInput, fabricId: string, imported = false) {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (item.fabricId !== fabricId) continue;
    const key = cutPlanDemandKey(item.size, item.sleeveType, item.garmentType);
    const quantity = (quantities.get(key) ?? 0) + (imported ? item.importedQuantity ?? item.quantity : item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("A quantidade total está fora do limite suportado.");
    const fabric = input.fabrics.find((entry) => entry.id === fabricId);
    const step = fabric ? getCutPlanFrequencyStep(fabric.type, item.garmentType ?? inferCutPlanGarmentType(item.size)) : 1;
    if (!imported && !Number.isSafeInteger(step * Math.ceil(quantity / step))) throw new Error("A quantidade total está fora do limite suportado.");
    quantities.set(key, quantity);
  }
  return quantities;
}
