export function calculateComparison(current: number, previous: number) {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : null;
}

export function projectMonthlyTotal(current: number, elapsedDays: number, monthDays: number) {
  if (current <= 0) return 0;
  return Math.round((current / Math.max(1, elapsedDays)) * Math.max(1, monthDays));
}

export function normalizePersonalStatus(value?: string) {
  return value === "pendente" || value === "entregue" || value === "cancelado" || value === "atrasado"
    ? value
    : "todos";
}
