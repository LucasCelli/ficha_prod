import type { QuadroProducaoFilters, QuadroProducaoResult } from "./data";
import type { InsumoStatus } from "./config";

function buildBoardQuery(filters: QuadroProducaoFilters) {
  const params = new URLSearchParams();

  if (filters.busca) params.set("busca", filters.busca);
  if (filters.arte) params.set("arte", filters.arte);
  if (filters.tecido) params.set("tecido", filters.tecido);
  if (filters.insumo) params.set("insumo", filters.insumo);
  if (filters.semana) params.set("semana", "true");

  const query = params.toString();
  return query ? `/api/quadro-producao?${query}` : "/api/quadro-producao";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "Falha ao executar a operação do quadro.");
  }

  return payload as T;
}

export async function fetchQuadroProducao(filters: QuadroProducaoFilters) {
  const response = await fetch(buildBoardQuery(filters), {
    credentials: "same-origin",
  });

  return parseJsonResponse<QuadroProducaoResult>(response);
}

export async function postKanbanColumn(name: string) {
  const response = await fetch("/api/quadro-producao/columns", {
    body: JSON.stringify({ name }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseJsonResponse<{ column: unknown }>(response);
}

export async function patchKanbanColumn(id: string, name: string) {
  const response = await fetch(`/api/quadro-producao/columns/${encodeURIComponent(id)}`, {
    body: JSON.stringify({ name }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  return parseJsonResponse<{ column: unknown }>(response);
}

export async function postKanbanColumnReorder(columnIds: string[]) {
  const response = await fetch("/api/quadro-producao/columns/reorder", {
    body: JSON.stringify({ columnIds }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseJsonResponse<{ ok: true }>(response);
}

export async function postKanbanColumnSortByDate(id: string) {
  const response = await fetch(`/api/quadro-producao/columns/${encodeURIComponent(id)}/sort-by-date`, {
    credentials: "same-origin",
    method: "POST",
  });

  return parseJsonResponse<{ ok: true }>(response);
}

export async function postManualKanbanCard(payload: {
  arte?: string;
  columnId: string;
  dataEntrega: string;
  evento: boolean;
  insumoStatus: InsumoStatus;
  material?: string;
  title: string;
}) {
  const response = await fetch("/api/quadro-producao/cards/manual", {
    body: JSON.stringify(payload),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseJsonResponse<{ card: { id: string } }>(response);
}

export async function patchKanbanCardMove(id: string, destinationColumnId: string, destinationIndex: number) {
  const response = await fetch(`/api/quadro-producao/cards/${encodeURIComponent(id)}/move`, {
    body: JSON.stringify({ destinationColumnId, destinationIndex }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  return parseJsonResponse<{ ok: true }>(response);
}

export async function patchKanbanCardInsumoStatus(id: string, insumoStatus: InsumoStatus) {
  const response = await fetch(`/api/quadro-producao/cards/${encodeURIComponent(id)}/insumo-status`, {
    body: JSON.stringify({ insumoStatus }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  return parseJsonResponse<{ ok: true }>(response);
}

export async function postKanbanCardEntregar(id: string) {
  const response = await fetch(`/api/quadro-producao/cards/${encodeURIComponent(id)}/entregar`, {
    credentials: "same-origin",
    method: "POST",
  });

  return parseJsonResponse<{ ok: true }>(response);
}
