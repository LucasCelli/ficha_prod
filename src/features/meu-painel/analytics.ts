export function calculateComparison(current: number, previous: number) {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : null;
}

export function normalizePersonalStatus(value?: string) {
  return value === "pendente" || value === "entregue" || value === "cancelado" || value === "atrasado"
    ? value
    : "todos";
}
