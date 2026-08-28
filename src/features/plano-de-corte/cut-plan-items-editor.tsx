"use client";

import { useState, type ReactNode } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, CustomDatalist, SortableHandle, SortableInstructions, Tooltip, type CustomDatalistOption } from "@/components/ui";
import { compareUniformSizeAndBabyLookText } from "@/lib/uniform-sizes";
import type { CutPlanFabric, CutPlanItem, SleeveType } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;

const GARMENT_TYPES = ["SHORT", "BERMUDA", "CALÇA", "SAIA", "MACACÃO"] as const;

function getItemType(item: CutPlanItem) {
  return GARMENT_TYPES.find((type) => item.size.toUpperCase().startsWith(`${type} `)) ?? item.sleeveType;
}

function changeItemType(item: CutPlanItem, type: string): Partial<CutPlanItem> {
  const sizeWithoutGarment = item.size.replace(/^(?:SHORT|BERMUDA|CALÇA|SAIA|MACACÃO)\s+/i, "");
  if (type === "CURTA" || type === "LONGA") return { size: sizeWithoutGarment, sleeveType: type as SleeveType };
  return { size: `${type} ${sizeWithoutGarment}`.trim(), sleeveType: "CURTA" };
}

type Props = {
  /** Sem `afterId` a linha entra no fim; o evento de clique nunca pode chegar aqui. */
  addItem: (afterId?: string) => void;
  duplicateItem: (id: string, direction: "above" | "below") => void;
  fabrics: CutPlanFabric[];
  items: CutPlanItem[];
  moveItem: (itemId: string, target: string | number) => void;
  removeItem: (id: string) => void;
  sizeOptions: CustomDatalistOption[];
  sortItems: () => void;
  updateItem: (id: string, patch: Partial<CutPlanItem>) => void;
};

function SortableRow({ children, id, index }: { children: (handleRef: (element: Element | null) => void) => ReactNode; id: string; index: number }) {
  const { handleRef, isDragging, isDropping, ref } = useSortable({ group: "cut-plan-items", id, index, transition: { duration: 90, easing: "cubic-bezier(0.2, 0, 0, 1)" }, type: "cut-plan-item" });
  return <div className={`cut-plan-items__row${isDragging || isDropping ? " is-dragging" : ""}`} data-index={index} ref={ref}>{children(handleRef)}</div>;
}

export function CutPlanItemsEditor({ addItem, duplicateItem, fabrics, items, moveItem, removeItem, sizeOptions, sortItems, updateItem }: Props) {
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  function handleQuantityFocus(item: CutPlanItem) {
    if (!Number.isFinite(item.quantity) || item.quantity === 0) return;
    setQuantityDrafts((current) => item.id in current ? current : { ...current, [item.id]: "" });
  }
  function handleQuantityChange(item: CutPlanItem, value: string) {
    setQuantityDrafts((current) => ({ ...current, [item.id]: value }));
    updateItem(item.id, { quantity: value === "" ? Number.NaN : Number(value) });
  }
  function handleQuantityBlur(item: CutPlanItem) {
    setQuantityDrafts((current) => {
      if (!(item.id in current)) return current;
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  return <div className="cut-plan-items">
    <SortableInstructions />
    <div className="cut-plan-items__toolbar"><Button variant="secondary" onClick={sortItems} disabled={items.length < 2}><RotateCcw size={18} /> Ordenar por tamanho</Button><Button variant="secondary" onClick={() => addItem()}><Plus size={18} /> Adicionar tamanho</Button></div>
    <div className="cut-plan-items__head" aria-hidden="true"><span></span><span>Tamanho</span><span>Tipo</span><span>Quantidade</span><span>Tecido</span><span>Ações</span></div>
    <DragDropProvider onDragEnd={(event) => { if (event.canceled) return; const source = event.operation.source?.id; const target = event.operation.target?.id; if (source == null || target == null || source === target) return; moveItem(String(source), String(target)); }}>
      <div className="cut-plan-items__list" data-sortable-list="">{items.length ? items.map((item, index) => <SortableRow id={item.id} index={index} key={item.id}>{(handleRef) => <>
        <SortableHandle className="cut-plan-items__drag" handleRef={handleRef} itemLabel={item.size || `linha ${index + 1}`} onMove={(target) => moveItem(item.id, target)} position={index + 1} total={items.length} />
        <div className="cut-plan-items__cell field"><span>Tamanho</span><CustomDatalist aria-label={`Tamanho da linha ${index + 1}`} id={`cut-plan-size-${item.id}`} onValueChange={(value) => updateItem(item.id, { size: value.toUpperCase() })} options={sizeOptions} placeholder="Escolha um tamanho" value={item.size} /></div>
        <label className="cut-plan-items__cell field"><span>Tipo</span><select aria-label={`Manga da linha ${index + 1}`} value={getItemType(item)} onChange={(event) => updateItem(item.id, changeItemType(item, event.currentTarget.value))}><option value="CURTA">Manga curta</option><option value="LONGA">Manga longa</option><option value="SHORT">Short</option><option value="BERMUDA">Bermuda</option><option value="CALÇA">Calça</option><option value="SAIA">Saia</option><option value="MACACÃO">Macacão</option></select></label>
        <label className="cut-plan-items__cell field"><span>Quantidade</span><input aria-label={`Quantidade da linha ${index + 1}`} inputMode="numeric" min="0" step="1" type="number" value={quantityDrafts[item.id] ?? (Number.isFinite(item.quantity) && item.quantity !== 0 ? String(item.quantity) : "")} onBlur={() => handleQuantityBlur(item)} onChange={(event) => handleQuantityChange(item, event.currentTarget.value)} onFocus={() => handleQuantityFocus(item)} placeholder="Qtd." /></label>
        <label className="cut-plan-items__cell field"><span>Tecido</span><select aria-label={`Tecido da linha ${index + 1}`} value={item.fabricId} onChange={(event) => updateItem(item.id, { fabricId: event.currentTarget.value })}>{fabrics.map((fabric) => <option value={fabric.id} key={fabric.id}>{fabricLabel(fabric)}</option>)}</select></label>
        <div className="cut-plan-items__actions"><div><Tooltip label="Duplicar acima"><button aria-label={`Duplicar linha ${index + 1} acima`} onClick={() => duplicateItem(item.id, "above")} type="button"><ArrowUp size={14} /></button></Tooltip><Tooltip label="Duplicar abaixo"><button aria-label={`Duplicar linha ${index + 1} abaixo`} onClick={() => duplicateItem(item.id, "below")} type="button"><ArrowDown size={14} /></button></Tooltip></div><Tooltip label="Remover"><button aria-label={`Remover linha ${index + 1}`} className="is-danger" onClick={() => removeItem(item.id)} type="button"><Trash2 size={16} /></button></Tooltip></div>
      </>}</SortableRow>) : <div className="cut-plan-items__empty">Nenhum tamanho adicionado ainda.</div>}</div>
    </DragDropProvider>
    <div className="cut-plan-items__total" aria-live="polite"><span>Total de peças</span><strong>{items.reduce((total, item) => total + (Number.isFinite(item.quantity) ? item.quantity : 0), 0)}</strong></div>
  </div>;
}

export function sortCutPlanItems(items: CutPlanItem[]) {
  return [...items].sort((a, b) =>
    compareUniformSizeAndBabyLookText({ tamanho: a.size }, { tamanho: b.size }) ||
    a.sleeveType.localeCompare(b.sleeveType),
  );
}
