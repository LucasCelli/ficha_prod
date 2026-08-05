import type { CutPlanInput } from "./model";

export function validateCutPlan(input: CutPlanInput) {
  const errors: string[] = [];
  if (!Number.isFinite(input.tableLengthCm) || input.tableLengthCm <= 0) errors.push("Informe um comprimento de mesa maior que zero.");
  if (!Number.isInteger(input.maxLayers) || input.maxLayers < 1) errors.push("Informe pelo menos 1 folha por enfesto.");
  if (input.fabrics.length === 0) errors.push("Adicione pelo menos um tecido.");
  const referenceFabric = input.fabrics[0];
  if (referenceFabric && input.fabrics.some((fabric) => fabric.widthCm !== referenceFabric.widthCm)) errors.push("Todos os tecidos do plano precisam ter a mesma largura.");
  if (referenceFabric && input.fabrics.some((fabric) => fabric.type !== referenceFabric.type)) errors.push("Não é permitido misturar tecidos planos e tubulares no mesmo plano.");
  for (const fabric of input.fabrics) {
    if (!fabric.name.trim()) errors.push("Informe o nome de todos os tecidos.");
    if (!Number.isFinite(fabric.widthCm) || fabric.widthCm <= 0) errors.push(`Informe uma largura válida para ${fabric.name || "o tecido"}.`);
    if (fabric.type !== "PLANO" && fabric.type !== "TUBULAR") errors.push(`Informe o tipo de ${fabric.name || "tecido"}.`);
  }
  if (input.items.length === 0) errors.push("Adicione pelo menos um tamanho e quantidade.");
  for (const item of input.items) {
    if (!item.size.trim()) errors.push("Informe o tamanho em todas as linhas.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1) errors.push(`Informe uma quantidade inteira positiva para ${item.size || "a linha"}.`);
    if (!input.fabrics.some((fabric) => fabric.id === item.fabricId)) errors.push(`Selecione um tecido válido para ${item.size || "a linha"}.`);
  }
  return [...new Set(errors)];
}
