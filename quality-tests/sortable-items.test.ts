import assert from "node:assert/strict";
import test from "node:test";
import { moveCutPlanItem } from "../src/features/plano-de-corte/item-order.ts";
import { assertStableSortableIds } from "../src/lib/sortable-items.ts";

const item = (id: string) => ({ id, fabricId: "fabric", quantity: 1, size: id, sleeveType: "CURTA" as const });
const ids = (items: Array<{ id: string }>) => items.map(({ id }) => id);

test("reordena o planejador deterministicamente por ID e índice final", () => {
  let items = "ABCDEFGH".split("").map(item);
  items = moveCutPlanItem(items, "H", 1);
  assert.deepEqual(ids(items), ["A", "H", "B", "C", "D", "E", "F", "G"]);
  items = moveCutPlanItem(items, "A", 6);
  items = moveCutPlanItem(items, "D", 5);
  items = moveCutPlanItem(items, "C", 0);
  assert.deepEqual(ids(items), ["C", "H", "B", "E", "F", "D", "A", "G"]);
});

test("drags consecutivos sempre partem da ordem mais recente", () => {
  let items = "ABCD".split("").map(item);
  items = moveCutPlanItem(items, "D", 1);
  items = moveCutPlanItem(items, "C", 0);
  items = moveCutPlanItem(items, "A", 2);
  assert.deepEqual(ids(items), ["C", "D", "A", "B"]);
});

test("exclusão e inserção preservam a ordem dos itens restantes", () => {
  let items = moveCutPlanItem("ABCD".split("").map(item), "D", 1);
  items = items.filter(({ id }) => id !== "D");
  items = [...items, item("E")];
  assert.deepEqual(ids(items), ["A", "B", "C", "E"]);
});

test("rejeita IDs duplicados, vazios, nulos e indefinidos", () => {
  assert.throws(() => assertStableSortableIds([{ id: "A" }, { id: "A" }], "Teste"), /duplicado/);
  assert.throws(() => assertStableSortableIds([{ id: "" }], "Teste"), /ID estável/);
  assert.throws(() => assertStableSortableIds([{ id: null }], "Teste"), /ID estável/);
  assert.throws(() => assertStableSortableIds([{ id: undefined }], "Teste"), /ID estável/);
});
