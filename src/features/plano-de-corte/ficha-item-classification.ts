import type { SleeveType } from "./model";

const COLOR_TERMS = [
  ["azul marinho", "Azul marinho"], ["azul royal", "Azul royal"], ["azul celeste", "Azul celeste"],
  ["azul turquesa", "Azul turquesa"], ["azul petroleo", "Azul petróleo"], ["cinza mescla", "Cinza mescla"],
  ["cinza chumbo", "Cinza chumbo"], ["verde bandeira", "Verde bandeira"], ["verde musgo", "Verde musgo"],
  ["verde limao", "Verde limão"], ["amarelo canario", "Amarelo canário"], ["amarela canario", "Amarelo canário"],
  ["amarelo ouro", "Amarelo ouro"], ["amarela ouro", "Amarelo ouro"], ["rosa bebe", "Rosa bebê"],
  ["rosa pink", "Rosa pink"], ["off white", "Off-white"], ["offwhite", "Off-white"],
  ["preto", "Preto"], ["preta", "Preto"], ["branco", "Branco"], ["branca", "Branco"],
  ["azul", "Azul"], ["cinza", "Cinza"], ["grafite", "Grafite"], ["verde", "Verde"],
  ["amarelo", "Amarelo"], ["amarela", "Amarelo"], ["rosa", "Rosa"], ["roxo", "Roxo"],
  ["roxa", "Roxo"], ["lilas", "Lilás"], ["vermelho", "Vermelho"], ["vermelha", "Vermelho"],
  ["bordo", "Bordô"], ["marsala", "Marsala"], ["bege", "Bege"], ["caqui", "Caqui"],
  ["laranja", "Laranja"], ["coral", "Coral"], ["vinho", "Vinho"], ["jeans", "Jeans"],
] as const;

export function normalizeCutPlanDescription(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();
}

export function resolveItemSleeveType(itemDescription: string, technicalSleeve: string | null): SleeveType {
  const item = normalizeCutPlanDescription(itemDescription);
  const mentionsLong = /\b(?:manga\s+)?longa\b/.test(item);
  const mentionsShort = /\b(?:manga\s+)?curta\b/.test(item);
  if (mentionsLong !== mentionsShort) return mentionsLong ? "LONGA" : "CURTA";
  return normalizeCutPlanDescription(technicalSleeve ?? "").includes("long") ? "LONGA" : "CURTA";
}

export function resolveItemModelSize(size: string, itemDescription: string) {
  const description = normalizeCutPlanDescription(itemDescription);
  const mentionsFemale = /\b(?:feminina|feminino|fem)\b/.test(description);
  const mentionsMale = /\b(?:masculina|masculino|masc)\b/.test(description);
  if (mentionsFemale && !mentionsMale && !/^\s*(?:fem|feminina|bl|baby(?:\s+look)?)\b/i.test(size)) return `FEM ${size.trim()}`;
  if (mentionsMale && !mentionsFemale && !/^\s*(?:masc|masculina|masculino)\b/i.test(size)) return `MASC ${size.trim()}`;
  return size.trim();
}

export function resolveItemColor(itemDescription: string, technicalColor: string | null) {
  const item = ` ${normalizeCutPlanDescription(itemDescription)} `;
  const match = COLOR_TERMS.find(([term]) => item.includes(` ${term} `));
  if (match) return match[1];
  const technical = ` ${normalizeCutPlanDescription(technicalColor ?? "")} `;
  return COLOR_TERMS.find(([term]) => technical.includes(` ${term} `))?.[1] ?? technicalColor?.trim() ?? "";
}
