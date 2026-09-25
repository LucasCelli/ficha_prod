import { getDateInputDifferenceInDays } from "../../lib/dates.ts";

export const PRINT_MAX_PERIOD_DAYS = 62;

// Guard compartilhado (toolbar + route): o relatório operacional nunca sai sem periodo fechado.
export function getPrintPeriodError(dataInicio?: string, dataFim?: string) {
  if (!dataInicio || !dataFim) {
    return "Selecione entrega inicial e final para imprimir.";
  }

  const span = getDateInputDifferenceInDays(dataFim, dataInicio);

  if (span === null || span < 0) {
    return "A entrega final deve ser igual ou posterior à inicial.";
  }

  if (span > PRINT_MAX_PERIOD_DAYS) {
    return `Período máximo para impressão: ${PRINT_MAX_PERIOD_DAYS} dias.`;
  }

  return null;
}
