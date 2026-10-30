export function hasOnlyPantsProducts(products: readonly string[]) {
  return products.length > 0 && products.every(isPantsProduct);
}

function isPantsProduct(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /\bcalcas?\b/.test(normalized);
}
