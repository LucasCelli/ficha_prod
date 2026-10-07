import { compareUniformSizeAndBabyLookText, createUniformSizeDomain, isUniformBabyLookText } from "../../lib/uniform-sizes.ts";
import type { UniformSizeDefinition } from "../../lib/uniform-sizes.ts";

type SortableFichaProductItem = {
  detalhesProduto?: string | null;
  produto?: string | null;
  tamanho?: string | null;
};

const BABY_LOOK_PRODUCT_BY_TRADITIONAL_PRODUCT = new Map([
  ["camiseta manga curta", "Baby Look Manga Curta"],
  ["camiseta manga longa", "Baby Look Manga Longa"],
  ["camisa polo manga curta", "Baby Look Polo Manga Curta"],
  ["camisa polo manga longa", "Baby Look Polo Manga Longa"],
  ["camiseta basica", "Baby Look Básica"],
]);

export function isFichaProductItemBabyLook(item: SortableFichaProductItem) {
  const description = normalizeDetailsGroup(`${item.produto ?? ""} ${item.detalhesProduto ?? ""}`);
  if (/\bcamisete(?:s)?\b/.test(description)) return false;
  if (/\b(?:baby\s*look|babylook|bl)\b/.test(description)) return true;
  if (/\b(?:feminina|feminino|fem)\b/.test(description) && /\bcamiseta(?:s)?\b/.test(description)) return true;
  return isUniformBabyLookText(item.tamanho);
}

export function canonicalizeFichaProductItemSize(item: SortableFichaProductItem, definitions?: readonly UniformSizeDefinition[]) {
  const resolved = createUniformSizeDomain(definitions).resolveSize(item.tamanho);
  if (!resolved.definition) return item.tamanho ?? "";
  return `${isFichaProductItemBabyLook(item) ? "Baby " : ""}${resolved.definition.name}`;
}

export function canonicalizeFichaProductItemProduct(item: SortableFichaProductItem) {
  const product = item.produto ?? "";
  const normalizedProduct = normalizeDetailsGroup(product);

  if (!isUniformBabyLookText(item.tamanho) || /\bcamisete(?:s)?\b/.test(normalizedProduct)) return product;

  return BABY_LOOK_PRODUCT_BY_TRADITIONAL_PRODUCT.get(normalizedProduct) ?? product;
}

function normalizeDetailsGroup(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/** Agrupa detalhes e, dentro deles, produtos pela primeira aparição antes de ordenar os tamanhos. */
export function sortFichaProductItemsForSave<T extends SortableFichaProductItem>(items: readonly T[], definitions?: readonly UniformSizeDefinition[]) {
  const detailsOrder = new Map<string, number>();
  const productOrderByDetails = new Map<string, Map<string, number>>();

  items.forEach((item) => {
    const details = normalizeDetailsGroup(item.detalhesProduto);
    const product = normalizeDetailsGroup(item.produto);
    if (!detailsOrder.has(details)) detailsOrder.set(details, detailsOrder.size);

    const productOrder = productOrderByDetails.get(details) ?? new Map<string, number>();
    if (!productOrder.has(product)) productOrder.set(product, productOrder.size);
    productOrderByDetails.set(details, productOrder);
  });

  return [...items].sort((first, second) => {
    const firstDetails = normalizeDetailsGroup(first.detalhesProduto);
    const secondDetails = normalizeDetailsGroup(second.detalhesProduto);
    const firstDetailsOrder = detailsOrder.get(firstDetails) ?? 0;
    const secondDetailsOrder = detailsOrder.get(secondDetails) ?? 0;

    if (firstDetailsOrder !== secondDetailsOrder) return firstDetailsOrder - secondDetailsOrder;

    const productOrder = productOrderByDetails.get(firstDetails);
    const firstProductOrder = productOrder?.get(normalizeDetailsGroup(first.produto)) ?? 0;
    const secondProductOrder = productOrder?.get(normalizeDetailsGroup(second.produto)) ?? 0;

    if (firstProductOrder !== secondProductOrder) return firstProductOrder - secondProductOrder;
    return compareUniformSizeAndBabyLookText(first, second, definitions);
  });
}
