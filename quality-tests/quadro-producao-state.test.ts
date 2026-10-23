import assert from "node:assert/strict";
import test from "node:test";
import type { KanbanBoardColumn, KanbanCardSummary } from "../src/features/quadro-producao/data.ts";
import {
  getCardDndId,
  getCardIdFromDndId,
  getCardPlacement,
  getColumnDndId,
  moveCard,
  removeCard,
  sortAllColumnsByDeliveryDate,
  sortColumnByDeliveryDate,
} from "../src/features/quadro-producao/quadro-producao-state.ts";

function card(id: string, columnId: string, kanbanOrder: number, dataEntrega = "2026-10-23"): KanbanCardSummary {
  return {
    arte: null,
    clienteAuxiliar: null,
    clienteNome: id,
    dataEntrega,
    evento: false,
    id,
    isManualCard: false,
    itemQuantity: 1,
    kanbanColumnId: columnId,
    kanbanOrder,
    kanbanStatus: "pendente",
    material: null,
    numeroVenda: null,
    status: "pendente",
    thumbUrl: null,
    vendedor: null,
  };
}

function column(id: string, cardIds: string[]): KanbanBoardColumn {
  const cards = cardIds.map((cardId, index) => card(cardId, id, index));
  return {
    cards,
    color_token: null,
    created_at: "2026-10-23T00:00:00.000Z",
    displayName: id,
    id,
    is_system: false,
    name: id,
    openCount: cards.length,
    order_index: 0,
    slug: id,
    updated_at: "2026-10-23T00:00:00.000Z",
  };
}

function ids(board: KanbanBoardColumn[], columnId: string) {
  return board.find((item) => item.id === columnId)?.cards.map((item) => item.id) ?? [];
}

test("reordena A sem alterar conteudo ou referencia de B e C", () => {
  const board = [column("A", ["A1", "A2", "A3"]), column("B", ["B1"]), column("C", ["C1", "C2"])];
  const moved = moveCard(board, "A1", { columnId: "A", index: 2 });

  assert.deepEqual(ids(moved, "A"), ["A2", "A3", "A1"]);
  assert.strictEqual(moved[1], board[1]);
  assert.strictEqual(moved[2], board[2]);
  assert.deepEqual(moved[0]?.cards.map(({ kanbanColumnId, kanbanOrder }) => [kanbanColumnId, kanbanOrder]), [
    ["A", 0], ["A", 1], ["A", 2],
  ]);
});

test("reordena C sem alterar A ou B", () => {
  const board = [column("A", ["A1"]), column("B", ["B1", "B2"]), column("C", ["C1", "C2", "C3"])];
  const moved = moveCard(board, "C3", { columnId: "C", index: 0 });

  assert.deepEqual(ids(moved, "C"), ["C3", "C1", "C2"]);
  assert.strictEqual(moved[0], board[0]);
  assert.strictEqual(moved[1], board[1]);
});

test("movimento entre colunas toca apenas origem e destino, inclusive destino vazio", () => {
  const board = [column("A", ["A1", "A2"]), column("B", []), column("C", ["C1"] )];
  const moved = moveCard(board, "A2", { columnId: "B", index: 0 });

  assert.deepEqual(ids(moved, "A"), ["A1"]);
  assert.deepEqual(ids(moved, "B"), ["A2"]);
  assert.strictEqual(moved[2], board[2]);
  assert.equal(moved[1]?.cards[0]?.kanbanColumnId, "B");
  assert.equal(moved[1]?.cards[0]?.kanbanOrder, 0);
});

test("no-op preserva todas as referencias", () => {
  const board = [column("A", ["A1", "A2"]), column("B", ["B1"])];
  assert.strictEqual(moveCard(board, "A1", { columnId: "A", index: 0 }), board);
  assert.strictEqual(moveCard(board, "inexistente", { columnId: "A", index: 0 }), board);
});

test("movimentos rapidos consecutivos nao duplicam nem perdem cards", () => {
  let board = [column("A", ["A1", "A2", "A3"]), column("B", ["B1", "B2"]), column("C", [])];
  board = moveCard(board, "A3", { columnId: "B", index: 1 });
  board = moveCard(board, "B1", { columnId: "C", index: 0 });
  board = moveCard(board, "A1", { columnId: "B", index: 3 });
  board = moveCard(board, "A3", { columnId: "A", index: 0 });

  const allIds = board.flatMap((item) => item.cards.map(({ id }) => id));
  assert.deepEqual([...allIds].sort(), ["A1", "A2", "A3", "B1", "B2"]);
  assert.equal(new Set(allIds).size, allIds.length);
  for (const item of board) {
    assert.deepEqual(item.cards.map(({ kanbanOrder }) => kanbanOrder), item.cards.map((_, index) => index));
  }
});

test("ordenacao global ordena dentro de cada coluna e preserva as colunas", () => {
  const a = column("A", ["A1", "A2", "A3", "A4"]);
  a.cards = [
    card("A1", "A", 0, "2026-12-01"),
    card("A2", "A", 1, ""),
    card("A3", "A", 2, "2026-01-05"),
    card("A4", "A", 3, "2026-01-05"),
  ];
  const b = column("B", ["B1", "B2", "B3"]);
  b.cards = [
    card("B1", "B", 0, "2026-02-30"),
    card("B2", "B", 1, "2025-12-31"),
    card("B3", "B", 2, "2026-03-01"),
  ];

  const sorted = sortAllColumnsByDeliveryDate([a, b]);
  assert.deepEqual(ids(sorted, "A"), ["A3", "A4", "A1", "A2"]);
  assert.deepEqual(ids(sorted, "B"), ["B2", "B3", "B1"]);
  assert.deepEqual(sorted.flatMap((item) => item.cards.map(({ kanbanColumnId }) => kanbanColumnId)), ["A", "A", "A", "A", "B", "B", "B"]);
});

test("ordenacao de uma coluna e movimento manual posterior coexistem", () => {
  const a = column("A", ["A1", "A2", "A3"]);
  a.cards = [
    card("A1", "A", 0, "2026-12-01"),
    card("A2", "A", 1, "2026-01-01"),
    card("A3", "A", 2, "2026-06-01"),
  ];
  const b = column("B", ["B1"]);

  const sorted = sortColumnByDeliveryDate([a, b], "A");
  const manuallyMoved = moveCard(sorted, "A1", { columnId: "A", index: 0 });
  assert.deepEqual(ids(manuallyMoved, "A"), ["A1", "A2", "A3"]);
  assert.strictEqual(manuallyMoved[1], b);
});

test("remocao normaliza somente a coluna afetada", () => {
  const board = [column("A", ["A1", "A2", "A3"]), column("B", ["B1"]), column("C", ["C1"])];
  const next = removeCard(board, "A2");
  assert.deepEqual(ids(next, "A"), ["A1", "A3"]);
  assert.strictEqual(next[1], board[1]);
  assert.strictEqual(next[2], board[2]);
  assert.deepEqual(next[0]?.cards.map(({ kanbanOrder }) => kanbanOrder), [0, 1]);
});

test("IDs de DnD sao estaveis, reversiveis e separados por namespace", () => {
  assert.equal(getCardDndId("same-id"), "kanban-card:same-id");
  assert.equal(getColumnDndId("same-id"), "kanban-column:same-id");
  assert.notEqual(getCardDndId("same-id"), getColumnDndId("same-id"));
  assert.equal(getCardIdFromDndId(getCardDndId("card-1")), "card-1");
  assert.equal(getCardIdFromDndId(getColumnDndId("card-1")), null);
});

test("posicao persistida inclui ancoras visiveis anterior e seguinte", () => {
  const board = [column("A", ["A1", "A2", "A3"]), column("B", [])];
  assert.deepEqual(getCardPlacement(board, "A2"), {
    columnId: "A",
    index: 1,
    nextCardId: "A3",
    previousCardId: "A1",
  });
  assert.deepEqual(getCardPlacement(board, "A1"), {
    columnId: "A",
    index: 0,
    nextCardId: "A2",
    previousCardId: null,
  });
});
