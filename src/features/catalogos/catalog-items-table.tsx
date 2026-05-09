"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { DragEndEventData, DragStartEventData } from "fluid-dnd";
import { useDragAndDrop } from "fluid-dnd/react";
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, Badge } from "@/components/ui";
import { useFluidDndEventTargetGuard } from "@/lib/fluid-dnd-event-target-guard";
import { deleteCatalogItemsAction, saveCatalogItemOrderAction } from "./actions";
import { CatalogItemActions } from "./catalog-item-actions";
import type { CatalogItem, CatalogKind } from "./types";

type CatalogItemsTableProps = {
  closeHref: string;
  items: CatalogItem[];
  selectedKind: CatalogKind;
};

function getComposition(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>).composition;
  return typeof value === "string" ? value : "";
}

function haveSameOrder(left: CatalogItem[], right: CatalogItem[]) {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}

function hasUniqueItemIds(items: CatalogItem[]) {
  return new Set(items.map((item) => item.id)).size === items.length;
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
  const activeDragRef = useRef<{ itemId: string } | null>(null);
  const isSavingRef = useRef(false);
  const setFluidItemsRef = useRef<Dispatch<SetStateAction<CatalogItem[]>> | null>(null);

  useFluidDndEventTargetGuard();

  const persistOrder = useCallback(async (nextItems: CatalogItem[], rollbackItems: CatalogItem[]) => {
    const result = await saveCatalogItemOrderAction(selectedKind, nextItems.map((item) => item.id));

    isSavingRef.current = false;
    setIsSaving(false);

    if (result.status === "error") {
      setFluidItemsRef.current?.(rollbackItems);
      setOrderMessage("Ordem nao salva.");
      toast.error("Ordem nao salva", { description: result.message || "Tente novamente." });
      return;
    }

    setOrderMessage("Ordem salva.");
    router.refresh();
  }, [router, selectedKind]);

  const dragConfig = useMemo(() => ({
    animationDuration: 90,
    delayBeforeInsert: 0,
    delayBeforeRemove: 0,
    draggingClass: "catalog-items-table__row--dragging",
    handlerSelector: ".catalog-items-table__drag",
    isDraggable: (element: HTMLElement) => !isSavingRef.current && element.classList.contains("catalog-items-table__row"),
    onDragStart: (data: DragStartEventData<CatalogItem>) => {
      rollbackItemsRef.current = latestItemsRef.current;
      activeDragRef.current = {
        itemId: data.value.id,
      };
    },
    onDragEnd: (data: DragEndEventData<CatalogItem>) => {
      const dragSource = activeDragRef.current;
      const rollbackItems = rollbackItemsRef.current;
      activeDragRef.current = null;

      if (!dragSource) return;

      const nextItems = moveItem(rollbackItems, dragSource.itemId, data.index);

      if (haveSameOrder(nextItems, rollbackItems)) {
        setFluidItemsRef.current?.(rollbackItems);
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);
      setOrderMessage("Salvando ordem.");
      setFluidItemsRef.current?.(nextItems);

      startTransition(() => {
        void persistOrder(nextItems, rollbackItems);
      });
    },
  }), [persistOrder, startTransition]);
  const [listRef, fluidItems, setFluidItems] = useDragAndDrop<CatalogItem, HTMLDivElement>(items, dragConfig);
  const visibleItems = useMemo(() => getUniqueItemsById(fluidItems), [fluidItems]);
  const visibleItemIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);
  const effectiveSelectedIds = useMemo(() => [...selectedItemIds].filter((id) => visibleItemIds.has(id)), [selectedItemIds, visibleItemIds]);
  const selectedCount = effectiveSelectedIds.length;
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedItemIds.has(item.id));

  useEffect(() => {
    latestItemsRef.current = visibleItems;
  }, [visibleItems]);

  useEffect(() => {
    setFluidItemsRef.current = setFluidItems;
  }, [setFluidItems]);

  useEffect(() => {
    if (!hasUniqueItemIds(fluidItems)) {
      setFluidItems(getUniqueItemsById(fluidItems));
      return;
    }

    if (!isSavingRef.current && !haveSameOrder(fluidItems, items)) {
      setFluidItems(items);
    }
  }, [fluidItems, items, setFluidItems]);

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
      <div className="catalog-items-table-wrap" role="region" aria-label="Itens do catalogo">
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
            <span role="columnheader">Metadados</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Ações</span>
          </div>
          <div className="catalog-items-table__body" ref={listRef} role="rowgroup">
            {visibleItems.map((item, index) => (
              <div className="catalog-items-table__row" data-index={index} data-saving={isSaving ? "true" : undefined} key={item.id} role="row">
                <span className="catalog-items-table__cell catalog-items-table__selection-cell" role="cell">
                  <input
                    aria-label={`Selecionar ${item.name}`}
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    type="checkbox"
                  />
                </span>
                <span className="catalog-items-table__cell catalog-items-table__order-cell" role="cell">
                  <span
                    aria-disabled={isSaving}
                    aria-label={`Reordenar ${item.name}`}
                    className="catalog-items-table__drag"
                    role="button"
                    tabIndex={0}
                  >
                    <GripVertical aria-hidden="true" size={15} />
                  </span>
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
                    {getComposition(item.metadata) || item.description || <span className="ui-table__muted">-</span>}
                  </span>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</Badge>
                </span>
                <span className="catalog-items-table__cell" role="cell">
                  <CatalogItemActions editHref={`/catalogos?tipo=${selectedKind}&edit=${item.id}`} itemId={item.id} itemName={item.name} returnTo={closeHref} />
                </span>
              </div>
            ))}
          </div>
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
