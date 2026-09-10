type SortableIdentity = { id: unknown };

/** Falha cedo quando uma lista entrega identidades inválidas ao dnd-kit. */
export function assertStableSortableIds(items: readonly SortableIdentity[], listName: string) {
  const ids = new Set<string | number>();

  for (const item of items) {
    if ((typeof item.id !== "string" && typeof item.id !== "number") || item.id === "") {
      throw new Error(`${listName}: todo item arrastável precisa de um ID estável.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`${listName}: ID arrastável duplicado: ${String(item.id)}.`);
    }
    ids.add(item.id);
  }
}
