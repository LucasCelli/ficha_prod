import type { CutPlanInput } from "./model.ts";
import { getLayerLimit } from "./dimensions.ts";
import { normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";

export function validateCutPlan(input: CutPlanInput) {
  const errors: string[] = [];
  if (!Number.isFinite(input.tableLengthCm) || input.tableLengthCm <= 0) errors.push("Informe o tamanho da mesa.");
  if (!Number.isInteger(input.maxLayers) || input.maxLayers < 1) errors.push("O enfesto precisa ter pelo menos 1 folha.");
  if (input.fabrics.length === 0) errors.push("Adicione pelo menos um tecido.");
  const referenceFabric = input.fabrics[0];
  if (referenceFabric && input.maxLayers > getLayerLimit(referenceFabric.type)) {
    errors.push(`O limite para tecido ${referenceFabric.type === "TUBULAR" ? "tubular" : "plano"} é de ${getLayerLimit(referenceFabric.type)} folhas.`);
  }
  if (referenceFabric && input.fabrics.some((fabric) => fabric.widthCm !== referenceFabric.widthCm)) errors.push("Todos os tecidos precisam ter a mesma largura.");
  if (referenceFabric && input.fabrics.some((fabric) => fabric.type !== referenceFabric.type)) errors.push("Não dá para misturar tecido plano com tubular no mesmo plano.");
  for (const fabric of input.fabrics) {
    if (!fabric.name.trim()) errors.push("Dê um nome para cada tecido.");
    if (!Number.isFinite(fabric.widthCm) || fabric.widthCm <= 0) errors.push(`Informe a largura de ${fabric.name || "o tecido"}.`);
    if (fabric.type !== "PLANO" && fabric.type !== "TUBULAR") errors.push(`Informe se ${fabric.name || "o tecido"} é plano ou tubular.`);
  }
  if (input.items.length === 0) errors.push("Adicione pelo menos um tamanho.");
  for (const item of input.items) {
    if (!item.size.trim()) errors.push("Preencha o tamanho em todas as linhas.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1) errors.push(`Informe a quantidade de ${item.size || "cada linha"}.`);
    if (!input.fabrics.some((fabric) => fabric.id === item.fabricId)) errors.push(`Escolha o tecido de ${item.size || "cada linha"}.`);
  }
  const profileKeys = new Set<string>();
  for (const profile of input.sizeProfiles) {
    if (!profile.size.trim()) errors.push("Informe o tamanho em todos os perfis de medidas.");
    const dimensions = [profile.bodyHeightCm, profile.bodyWidthCm, profile.sleeveHeightCm, profile.sleeveWidthCm];
    if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) errors.push(`Revise as medidas de ${profile.size || "cada perfil"}.`);
    for (const value of [profile.size, ...profile.aliases]) {
      const key = normalizeUniformSizeKey(value);
      if (!key) continue;
      if (profileKeys.has(key)) errors.push(`O tamanho ou alias ${value} está repetido nos perfis.`);
      profileKeys.add(key);
    }
  }
  return [...new Set(errors)];
}
