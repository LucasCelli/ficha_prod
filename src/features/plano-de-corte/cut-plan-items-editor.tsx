"use client";

import { useState, type ReactNode } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, CustomDatalist, SortableHandle, SortableInstructions, Tooltip, type CustomDatalistOption } from "@/components/ui";
import { assertStableSortableIds } from "@/lib/sortable-items";
import { compareUniformSizeAndBabyLookText } from "@/lib/uniform-sizes";
import { inferCutPlanGarmentType, isPantsGarment, isShortsGarment, type CutPlanFabric, type CutPlanItem, type GarmentType, type SleeveType } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;

function getItemType(item: CutPlanItem) {
  const garmentType = item.garmentType ?? inferCutPlanGarmentType(item.size);
  if (garmentType === "PANTS") return "PANTS_BRIM";
  if (garmentType === "SHORTS") return "SHORTS_BRIM";
  return isPantsGarment(garmentType) || isShortsGarment(garmentType) ? garmentType : `${garmentType}:${item.sleeveType}`;
}

function changeItemType(item: CutPlanItem, type: string): Partial<CutPlanItem> {
  const sizeWithoutGarment = item.size.replace(/^(?:SHORT|BERMUDA|CALÇA)\s+/i, "");
  const selectedGarmentType = type as GarmentType;
  if (isPantsGarment(selectedGarmentType) || isShortsGarment(selectedGarmentType)) return {
    garmentType: selectedGarmentType,
    size: `${isPantsGarment(selectedGarmentType) ? "CALÇA" : "BERMUDA"} ${sizeWithoutGarment}`.trim(),
    sleeveType: "CURTA",
  };
  const [garmentType, sleeveType] = type.split(":") as [GarmentType, SleeveType];
  return { garmentType, size: sizeWithoutGarment, sleeveType };
}

type Props = {
  /** Sem `afterId` a linha entra no fim; o evento de clique nunca pode chegar aqui. */
  addItem: (afterId?: string) => void;
  duplicateItem: (id: string, direction: "above" | "below") => void;
  fabrics: CutPlanFabric[];
  items: CutPlanItem[];
  moveItem: (itemId: string, target: string | number) => void;
  removeItem: (id: string) => void;
  separateSleeves: boolean;
  sizeOptions: CustomDatalistOption[];
  sortItems: () => void;
  updateItem: (id: string, patch: Partial<CutPlanItem>) => void;
};

function SortableRow({ children, id, index }: { children: (handleRef: (element: Element | null) => void) => ReactNode; id: string; index: number }) {
  const { handleRef, isDragging, isDropping, ref } = useSortable({ group: "cut-plan-items", id, index, transition: { duration: 90, easing: "cubic-bezier(0.2, 0, 0, 1)" }, type: "cut-plan-item" });
  return <div className={`cut-plan-items__row${isDragging || isDropping ? " is-dragging" : ""}`} data-index={index} ref={ref}>{children(handleRef)}</div>;
}

export function CutPlanItemsEditor({ addItem, duplicateItem, fabrics, items, moveItem, removeItem, separateSleeves, sizeOptions, sortItems, updateItem }: Props) {
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  assertStableSortableIds(items, "Planejador de corte");

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

  return <section aria-labelledby="cut-plan-items-title" className="cut-plan-items">
    <SortableInstructions />
    <div className="cut-plan-items__toolbar"><h3 className="cut-plan__subheading" id="cut-plan-items-title">Itens do plano</h3><Button variant="ghost" onClick={sortItems} disabled={items.length < 2}><RotateCcw size={18} /> Ordenar por tamanho</Button><Button variant="secondary" onClick={() => addItem()}><Plus size={18} /> Adicionar tamanho</Button></div>
    <div className={`cut-plan-items__head${separateSleeves ? " has-sleeves" : ""}`} aria-hidden="true"><span></span><span>Tamanho</span><span>Tipo</span><span>Quantidade</span><span>Tecido do corpo</span>{separateSleeves ? <span>Tecido das mangas</span> : null}<span>Ações</span></div>
    <DragDropProvider onDragEnd={(event) => {
      if (event.canceled) return;
      const { source } = event.operation;
      if (!isSortable(source) || source.initialIndex === source.index) return;
      moveItem(String(source.id), source.index);
    }}>
      <div className={`cut-plan-items__list${separateSleeves ? " has-sleeves" : ""}`} data-sortable-list="">{items.length ? items.map((item, index) => <SortableRow id={item.id} index={index} key={item.id}>{(handleRef) => <>
        <SortableHandle className="cut-plan-items__drag" handleRef={handleRef} itemLabel={item.size || `linha ${index + 1}`} onMove={(target) => moveItem(item.id, target)} position={index + 1} total={items.length} />
        <div className="cut-plan-items__cell field"><span>Tamanho</span><CustomDatalist aria-label={`Tamanho da linha ${index + 1}`} id={`cut-plan-size-${item.id}`} onValueChange={(value) => updateItem(item.id, { size: value.toUpperCase() })} options={sizeOptions} placeholder="Escolha um tamanho" value={item.size} /></div>
        <label className="cut-plan-items__cell field"><span>Tipo</span><select aria-label={`Modelagem da linha ${index + 1}`} value={getItemType(item)} onChange={(event) => updateItem(item.id, changeItemType(item, event.currentTarget.value))}><option value="T_SHIRT:CURTA">Camiseta · manga curta</option><option value="T_SHIRT:LONGA">Camiseta · manga longa</option><option value="BABY_LOOK:CURTA">Babylook · manga curta</option><option value="BABY_LOOK:LONGA">Babylook · manga longa</option><option value="DRESS_SHIRT:CURTA">Camisa social · manga curta</option><option value="DRESS_SHIRT:LONGA">Camisa social · manga longa</option><option value="CAMISETE:CURTA">Camisete · manga curta</option><option value="CAMISETE:LONGA">Camisete · manga longa</option><option value="PANTS_BRIM">Calça de Brim (Plano)</option><option value="SHORTS_BRIM">Bermuda de Brim (Plano)</option><option value="PANTS_HELANCA">Calça de Helanca (Tubular)</option><option value="SHORTS_HELANCA">Bermuda de Helanca (Tubular)</option><option value="LAB_COAT:CURTA">Jaleco de Brim (Plano)</option></select></label>
        <label className="cut-plan-items__cell field"><span>Quantidade</span><input aria-label={`Quantidade da linha ${index + 1}`} inputMode="numeric" min="0" step="1" type="number" value={quantityDrafts[item.id] ?? (Number.isFinite(item.quantity) && item.quantity !== 0 ? String(item.quantity) : "")} onBlur={() => handleQuantityBlur(item)} onChange={(event) => handleQuantityChange(item, event.currentTarget.value)} onFocus={() => handleQuantityFocus(item)} placeholder="Qtd." /></label>
        <label className="cut-plan-items__cell field"><span>Tecido</span><select aria-label={`Tecido da linha ${index + 1}`} value={item.fabricId} onChange={(event) => updateItem(item.id, { fabricId: event.currentTarget.value })}>{fabrics.map((fabric) => <option value={fabric.id} key={fabric.id}>{fabricLabel(fabric)}</option>)}</select></label>
        {separateSleeves ? <label className="cut-plan-items__cell field"><span>Tecido das mangas</span><select aria-label={`Tecido das mangas da linha ${index + 1}`} disabled={isPantsGarment(item.garmentType ?? inferCutPlanGarmentType(item.size)) || isShortsGarment(item.garmentType ?? inferCutPlanGarmentType(item.size))} value={item.sleeveFabricId ?? ""} onChange={(event) => updateItem(item.id, { sleeveFabricId: event.currentTarget.value })}><option value="">Selecione</option>{fabrics.filter((fabric) => fabric.id !== item.fabricId).map((fabric) => <option value={fabric.id} key={fabric.id}>{fabricLabel(fabric)}</option>)}</select></label> : null}
        <div className="cut-plan-items__actions"><div><Tooltip label="Duplicar acima"><button aria-label={`Duplicar linha ${index + 1} acima`} onClick={() => duplicateItem(item.id, "above")} type="button"><ArrowUp size={14} /></button></Tooltip><Tooltip label="Duplicar abaixo"><button aria-label={`Duplicar linha ${index + 1} abaixo`} onClick={() => duplicateItem(item.id, "below")} type="button"><ArrowDown size={14} /></button></Tooltip></div><Tooltip label="Remover"><button aria-label={`Remover linha ${index + 1}`} className="is-danger" onClick={() => removeItem(item.id)} type="button"><Trash2 size={16} /></button></Tooltip></div>
      </>}</SortableRow>) : <div className="cut-plan-items__empty">Nenhum tamanho adicionado ainda.</div>}</div>
    </DragDropProvider>
    <div className="cut-plan-items__total" aria-live="polite"><span>Total de peças</span><strong>{items.reduce((total, item) => total + (Number.isFinite(item.quantity) ? item.quantity : 0), 0)}</strong></div>
  </section>;
}

export function sortCutPlanItems(items: CutPlanItem[]) {
  return [...items].sort((a, b) =>
    compareUniformSizeAndBabyLookText({ tamanho: a.size }, { tamanho: b.size }) ||
    a.sleeveType.localeCompare(b.sleeveType),
  );
}
