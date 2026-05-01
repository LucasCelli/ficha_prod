export function normalizePersonalizacaoLabel(value: string | null) {
  const slug = value?.trim();
  if (!slug) return "Sem tipo definido";

  const map: Record<string, string> = {
    "sublimacao": "Sublimação",
    "serigrafia": "Serigrafia",
    "bordado": "Bordado",
    "patch": "Patch",
    "sem_personalizacao": "Sem personalização",
    "serigrafia_bordado": "Serigrafia e Bordado",
    "na_costura": "Na costura",
    "na_modelagem": "Na modelagem",
    "pronto": "Pronto",
  };

  if (map[slug.toLowerCase()]) {
    return map[slug.toLowerCase()];
  }

  const text = slug.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
