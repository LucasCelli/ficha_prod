import type { CutPlanInput } from "./model.ts";
import { getDefaultMaximumFrequency, getLayerLimit, normalizeCutPlanSizeKey } from "./dimensions.ts";

export function validateCutPlan(input: CutPlanInput, requireSharedFabricSettings = true) {
  const errors: string[] = [];
  if (!Number.isFinite(input.tableLengthCm) || input.tableLengthCm <= 0) errors.push("Informe o tamanho da mesa.");
  if (!Number.isSafeInteger(input.maxLayers) || input.maxLayers < 1) errors.push("O enfesto precisa ter pelo menos 1 folha.");
  if (input.fabrics.length === 0) errors.push("Adicione pelo menos um tecido.");
  const referenceFabric = input.fabrics[0];
  const maxFrequency = input.maxFrequency ?? (referenceFabric ? getDefaultMaximumFrequency(referenceFabric.type) : undefined);
  if (!Number.isSafeInteger(maxFrequency) || maxFrequency! < 1) errors.push("A frequência máxima precisa ser um número inteiro maior que zero.");
  if (referenceFabric?.type === "TUBULAR" && maxFrequency! < 2) errors.push("A frequência mínima tubular é 2.");
  if (new Set(input.fabrics.map((fabric) => fabric.id)).size !== input.fabrics.length) errors.push("Existem tecidos com a mesma identificação.");
  if (referenceFabric && input.maxLayers > getLayerLimit(referenceFabric.type)) {
    errors.push(`O limite para tecido ${referenceFabric.type === "TUBULAR" ? "tubular" : "plano"} é de ${getLayerLimit(referenceFabric.type)} folhas.`);
  }
  if (requireSharedFabricSettings && referenceFabric && input.fabrics.some((fabric) => fabric.widthCm !== referenceFabric.widthCm)) errors.push("Todos os tecidos precisam ter a mesma largura.");
  if (requireSharedFabricSettings && referenceFabric && input.fabrics.some((fabric) => fabric.type !== referenceFabric.type)) errors.push("Não dá para misturar tecido plano com tubular no mesmo plano.");
  for (const fabric of input.fabrics) {
    if (!fabric.name.trim()) errors.push("Dê um nome para cada tecido.");
    if (!Number.isFinite(fabric.widthCm) || fabric.widthCm <= 0) errors.push(`Informe a largura de ${fabric.name || "o tecido"}.`);
    if (fabric.type !== "PLANO" && fabric.type !== "TUBULAR") errors.push(`Informe se ${fabric.name || "o tecido"} é plano ou tubular.`);
    if (input.maxLayers > getLayerLimit(fabric.type)) errors.push(`O limite de ${fabric.name || "folhas"} é ${getLayerLimit(fabric.type)} folhas.`);
  }
  if (input.items.length === 0) errors.push("Adicione pelo menos um tamanho.");
  for (const item of input.items) {
    if (!item.size.trim()) errors.push("Preencha o tamanho em todas as linhas.");
    if (item.sleeveType !== "CURTA" && item.sleeveType !== "LONGA") errors.push(`Informe o tipo de manga de ${item.size || "cada linha"}.`);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) errors.push(`Informe a quantidade de ${item.size || "cada linha"}.`);
    if (input.fabrics.find((fabric) => fabric.id === item.fabricId)?.type === "TUBULAR" && !Number.isSafeInteger(2 * Math.ceil(item.quantity / 2))) errors.push(`A quantidade tubular de ${item.size} está fora do limite suportado.`);
    if (item.importedQuantity !== undefined && (!Number.isSafeInteger(item.importedQuantity) || item.importedQuantity < 0)) errors.push(`Revise a quantidade original de ${item.size || "cada linha"}.`);
    if (!input.fabrics.some((fabric) => fabric.id === item.fabricId)) errors.push(`Escolha o tecido de ${item.size || "cada linha"}.`);
  }
  const profileKeys = new Map<string, string>();
  for (const profile of input.sizeProfiles) {
    if (!profile.size.trim()) errors.push("Informe o tamanho em todos os perfis de medidas.");
    const dimensions = [
      profile.frontHeightCm, profile.frontWidthCm, profile.backHeightCm, profile.backWidthCm,
      profile.shortSleeveHeightCm, profile.shortSleeveWidthCm,
      profile.longSleeveHeightCm, profile.longSleeveWidthCm,
    ];
    if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) errors.push(`Revise as medidas de ${profile.size || "cada perfil"}.`);
    for (const value of [profile.size, ...profile.aliases]) {
      const key = normalizeCutPlanSizeKey(value);
      if (!key) continue;
      const ownerId = profileKeys.get(key);
      if (ownerId && ownerId !== profile.id) errors.push(`O tamanho ou alias ${value} está repetido nos perfis.`);
      else profileKeys.set(key, profile.id);
    }
  }
  return [...new Set(errors)];
}
