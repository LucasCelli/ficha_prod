export const MISSING_LAYOUT_MESSAGE = "Anexe o layout antes de imprimir. Apenas fichas sem personalização imprimem sem layout.";

export function isMissingRequiredLayout(arte: string | null | undefined, imageCount: number) {
  if (imageCount > 0) return false;
  const normalized = (arte ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized !== "sem_personalizacao";
}
