"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, Badge, SortableHandle, SortableInstructions } from "@/components/ui";
import { deleteCatalogItemsAction, saveCatalogItemOrderAction } from "./actions";
import { CatalogItemActions } from "./catalog-item-actions";
import type { CatalogItem, CatalogKind } from "./types";

type CatalogItemsTableProps = {
  closeHref: string;
  items: CatalogItem[];
  selectedKind: CatalogKind;
};

function SortableCatalogRow({ children, disabled, id, index }: { children: (handleRef: (element: Element | null) => void) => ReactNode; disabled: boolean; id: string; index: number }) {
  const { handleRef, isDragging, isDropping, ref } = useSortable({
    disabled,
    group: "catalog-items",
    id,
    index,
    transition: { duration: 90, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    type: "catalog-item",
  });

  return <div className={`catalog-items-table__row${isDragging || isDropping ? " catalog-items-table__row--dragging" : ""}`} data-index={index} data-saving={disabled ? "true" : undefined} ref={ref} role="row">{children(handleRef)}</div>;
}

function getComposition(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>).composition;
  return typeof value === "string" ? value : "";
}

function getSizeMeasurements(item: CatalogItem) {
  const values = [
    ["F", item.measure_front_height_cm, item.measure_front_width_cm],
    ["C", item.measure_back_height_cm, item.measure_back_width_cm],
    ["MC", item.measure_short_sleeve_height_cm, item.measure_short_sleeve_width_cm],
    ["ML", item.measure_long_sleeve_height_cm, item.measure_long_sleeve_width_cm],
  ] as const;
  if (values.some(([, height, width]) => height === null || width === null)) return "";
  return values.map(([label, height, width]) => `${label} ${height}×${width} cm`).join(" · ");
}

function getFabricSettings(item: CatalogItem) {
  if (item.fabric_width_cm === null || !item.fabric_type) return "";
  return `${item.fabric_width_cm} cm · ${item.fabric_type === "TUBULAR" ? "Tubular" : "Plano"}`;
}

function haveSameOrder(left: CatalogItem[], right: CatalogItem[]) {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}

function getUniqueItemsById(items: CatalogItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function moveItem(items: CatalogItem[], itemId: string, destinationIndex: number) {
  const sourceIndex = items.findIndex((item) => item.id === itemId);

  if (sourceIndex < 0) return items;

  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(Math.max(0, Math.min(destinationIndex, nextItems.length)), 0, item);
  return nextItems;
}

export function CatalogItemsTable({ closeHref, items, selectedKind }: CatalogItemsTableProps) {
  const router = useRouter();
  const [deleteSelectionOpen, setDeleteSelectionOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();
  const latestItemsRef = useRef(items);
  const rollbackItemsRef = useRef(items);
  const activeDragRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const [localItems, setLocalItems] = useState<CatalogItem[] | null>(null);

  const persistOrder = useCallback(async (nextItems: CatalogItem[], rollbackItems: CatalogItem[]) => {
    const result = await saveCatalogItemOrderAction(selectedKind, nextItems.map((item) => item.id));

    isSavingRef.current = false;
    setIsSaving(false);

    if (result.status === "error") {
      setLocalItems(rollbackItems);
      setOrderMessage("Ordem nao salva.");
      toast.error("Ordem nao salva", { description: result.message || "Tente novamente." });
      return;
    }

    setOrderMessage("Ordem salva.");
    setLocalItems(null);
    router.refresh();
  }, [router, selectedKind]);

  const visibleItems = useMemo(() => getUniqueItemsById(localItems ?? items), [items, localItems]);

  // Mesma persistencia usada pelo arraste, disparada pelo teclado.
  //
  // Diferente do arraste, movimentos consecutivos NAO sao bloqueados enquanto a
  // ordem anterior salva. Bloquear obrigaria a desabilitar o handle, e um botao
  // desabilitado perde o foco: o usuario de teclado ficava impedido de mover o
  // mesmo item duas vezes seguidas. Cada movimento persiste a lista inteira,
  // entao a ultima escrita e a que vale.
  const moveItemByKeyboard = useCallback(
    (itemId: string, destinationIndex: number) => {
      const rollbackItems = latestItemsRef.current;
      const nextItems = moveItem(rollbackItems, itemId, destinationIndex);
      if (haveSameOrder(nextItems, rollbackItems)) return;

      isSavingRef.current = true;
      setIsSaving(true);
      setOrderMessage("Salvando ordem.");
      setLocalItems(nextItems);

      startTransition(() => {
        void persistOrder(nextItems, rollbackItems);
      });
    },
    [persistOrder, startTransition],
  );
  const visibleItemIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);
  const effectiveSelectedIds = useMemo(() => [...selectedItemIds].filter((id) => visibleItemIds.has(id)), [selectedItemIds, visibleItemIds]);
  const selectedCount = effectiveSelectedIds.length;
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedItemIds.has(item.id));

  useEffect(() => {
    latestItemsRef.current = visibleItems;
  }, [visibleItems]);

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((current) => {
      const nextSelected = new Set(current);

      if (nextSelected.has(itemId)) {
        nextSelected.delete(itemId);
      } else {
        nextSelected.add(itemId);
      }

      return nextSelected;
    });
  }

  function toggleVisibleSelection() {
    setSelectedItemIds((current) => {
      if (allVisibleSelected) {
        return new Set();
      }

      return new Set([...current, ...visibleItems.map((item) => item.id)]);
    });
  }

  function clearSelection() {
    setSelectedItemIds(new Set());
  }

  function deleteSelectedItems() {
    const ids = effectiveSelectedIds;

    if (!ids.length) return;

    startTransition(async () => {
      const result = await deleteCatalogItemsAction(selectedKind, ids);

      if (result.status === "error") {
        toast.error("Não foi possível excluir", { description: result.message });
        return;
      }

      setDeleteSelectionOpen(false);
      setSelectedItemIds(new Set());
      toast.success("Itens excluídos", { description: `${result.deletedCount} item(ns) removido(s).` });
      router.refresh();
    });
  }

  return (
    <>
      <span className="sr-only" aria-live="polite">{orderMessage}</span>
      <SortableInstructions />
      <div className="catalog-items-table-wrap" role="region" aria-label="Itens do catálogo">
        <div className="catalog-items-table-toolbar">
          <label className="catalog-items-table-select-all">
            <input checked={allVisibleSelected} onChange={toggleVisibleSelection} type="checkbox" />
            <span>{selectedCount ? `${selectedCount} selecionado(s)` : "Selecionar"}</span>
          </label>
          {selectedCount ? (
            <button className="catalog-items-table-toolbar__button" onClick={clearSelection} type="button">
              Limpar
            </button>
          ) : null}
          <button
            className="catalog-items-table-toolbar__button catalog-items-table-toolbar__button--danger"
            disabled={!selectedCount}
            onClick={() => setDeleteSelectionOpen(true)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} />
            Excluir
          </button>
        </div>
        <div className="catalog-items-table" role="table">
          <div className="catalog-items-table__head" role="row">
            <span role="columnheader" />
            <span role="columnheader" />
            <span role="columnheader">Nome</span>
            <span role="columnheader">Aliases</span>
            <span role="columnheader">{selectedKind === "tamanho" ? "Medidas" : selectedKind === "tecido" ? "Corte" : "Metadados"}</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Ações</span>
          </div>
          <DragDropProvider
            onDragStart={(event) => {
              rollbackItemsRef.current = latestItemsRef.current;
              activeDragRef.current = event.operation.source?.id != null ? String(event.operation.source.id) : null;
            }}
            onDragEnd={(event) => {
              const itemId = activeDragRef.current;
              activeDragRef.current = null;
              if (!itemId || event.canceled || event.operation.target?.id == null) return;

              const rollbackItems = rollbackItemsRef.current;
              const destinationIndex = rollbackItems.findIndex((item) => item.id === String(event.operation.target?.id));
              const nextItems = moveItem(rollbackItems, itemId, destinationIndex);
              if (destinationIndex < 0 || haveSameOrder(nextItems, rollbackItems)) return;

              isSavingRef.current = true;
              setIsSaving(true);
              setOrderMessage("Salvando ordem.");
              setLocalItems(nextItems);
              startTransition(() => { void persistOrder(nextItems, rollbackItems); });
            }}
          >
          <div className="catalog-items-table__body" data-sortable-list="" role="rowgroup">
            {visibleItems.map((item, index) => (
              <SortableCatalogRow disabled={isSaving} id={item.id} index={index} key={item.id}>
              {(handleRef) => <>
                <span className="catalog-items-table__cell catalog-items-table__selection-cell" role="cell">
                  <input
                    aria-label={`Selecionar ${item.name}`}
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    type="checkbox"
                  />
                </span>
                <span className="catalog-items-table__cell catalog-items-table__order-cell" role="cell">
                  <SortableHandle
                    className="catalog-items-table__drag"
                    handleRef={handleRef}
                    itemLabel={item.name}
                    onMove={(nextIndex) => moveItemByKeyboard(item.id, nextIndex)}
                    position={index + 1}
                    size={15}
                    total={visibleItems.length}
                  />
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <span className="ui-table__primary">
                    <strong>{item.name}</strong>
                    <span className="ui-table__muted catalog-items-table__slug">{item.slug}</span>
                  </span>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <span className="catalog-items-table__clip">
                    {item.aliases.length ? item.aliases.join(", ") : <span className="ui-table__muted">-</span>}
                  </span>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <span className="catalog-items-table__clip">
                    {(selectedKind === "tamanho" ? getSizeMeasurements(item) : selectedKind === "tecido" ? getFabricSettings(item) : getComposition(item.metadata) || item.description) || <span className="ui-table__muted">-</span>}
                  </span>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</Badge>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <CatalogItemActions editHref={`/catalogos?tipo=${selectedKind}&edit=${item.id}`} itemId={item.id} itemName={item.name} returnTo={closeHref} />
                </span>
              </>}
              </SortableCatalogRow>
            ))}
          </div>
          </DragDropProvider>
        </div>
      </div>
      {deleteSelectionOpen ? (
        <AlertDialog
          description={`${selectedCount} item(ns) serão removidos do catálogo.`}
          onClose={() => setDeleteSelectionOpen(false)}
          size="sm"
          title="Excluir itens"
        >
          <section className="confirm-dialog" aria-describedby="delete-catalog-items-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
                <h2>Excluir itens</h2>
              </div>
            </header>

            <p id="delete-catalog-items-description">
              <strong>{selectedCount}</strong> item(ns) serão removidos do catálogo.
            </p>

            <div className="confirm-dialog__actions">
              <button className="ui-button ui-button--ghost" onClick={() => setDeleteSelectionOpen(false)} type="button">
                Cancelar
              </button>
              <button className="ui-button ui-button--danger" onClick={deleteSelectedItems} type="button">
                <Trash2 aria-hidden="true" size={16} />
                Excluir itens
              </button>
            </div>
          </section>
        </AlertDialog>
      ) : null}
    </>
  );
}
