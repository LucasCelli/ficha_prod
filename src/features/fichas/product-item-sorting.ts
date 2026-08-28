import { compareUniformSizeAndBabyLookText } from "../../lib/uniform-sizes.ts";

type SortableFichaProductItem = {
  detalhesProduto?: string | null;
  produto?: string | null;
  tamanho?: string | null;
};

function normalizeDetailsGroup(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/** Mantém a primeira posição de cada grupo de detalhes e ordena seus tamanhos. */
export function sortFichaProductItemsForSave<T extends SortableFichaProductItem>(items: readonly T[]) {
  const groupOrder = new Map<string, number>();

  items.forEach((item) => {
    const group = normalizeDetailsGroup(item.detalhesProduto);
    if (!groupOrder.has(group)) groupOrder.set(group, groupOrder.size);
  });

  return [...items].sort((first, second) => {
    const firstGroup = groupOrder.get(normalizeDetailsGroup(first.detalhesProduto)) ?? 0;
    const secondGroup = groupOrder.get(normalizeDetailsGroup(second.detalhesProduto)) ?? 0;

    if (firstGroup !== secondGroup) return firstGroup - secondGroup;
    return compareUniformSizeAndBabyLookText(first, second);
  });
}
