"use client";

import type { DragEvent, KeyboardEvent } from "react";
import { GripVertical } from "lucide-react";

type SortableHandleProps = {
  /** Classe do handle esperada pelo `handlerSelector` do fluid-dnd. */
  className: string;
  disabled?: boolean;
  /** Rotulo do item reordenado, ex.: "Camiseta preta". */
  itemLabel: string;
  /** Move o item para o indice destino (0-based). */
  onMove: (nextIndex: number) => void;
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  /** Posicao atual (1-based). */
  position: number;
  size?: number;
  total: number;
};

export const SORTABLE_INSTRUCTIONS_ID = "sortable-handle-instructions";

/**
 * Handle de reordenacao com paridade entre ponteiro e teclado.
 *
 * O arraste continua sendo do fluid-dnd (via `className` + `handlerSelector`);
 * este componente adiciona o caminho por teclado que faltava: setas movem o item,
 * Home/End levam para as pontas. O foco acompanha o item movido.
 *
 * A lista precisa ter `data-sortable-list` para o foco reencontrar o handle.
 * Renderize `<SortableInstructions />` uma unica vez por pagina.
 */
export function SortableHandle({ className, disabled, itemLabel, onDragEnd, onDragStart, onMove, position, size = 16, total }: SortableHandleProps) {
  const index = position - 1;
  const handleClass = className.split(" ")[0];

  function move(event: KeyboardEvent<HTMLButtonElement>, nextIndex: number) {
    if (disabled) return;
    const target = Math.min(Math.max(nextIndex, 0), total - 1);
    if (target === index) return;

    event.preventDefault();
    const list = event.currentTarget.closest("[data-sortable-list]");
    onMove(target);

    // O item se move junto com o handle: devolve o foco para a nova posicao.
    requestAnimationFrame(() => {
      list?.querySelectorAll<HTMLButtonElement>(`.${handleClass}`)[target]?.focus();
    });
  }

  return (
    <button
      aria-describedby={SORTABLE_INSTRUCTIONS_ID}
      aria-label={`Reordenar ${itemLabel}. Posição ${position} de ${total}.`}
      className={`${className} sortable-handle`}
      disabled={disabled}
      draggable={!disabled && Boolean(onDragStart)}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") move(event, index - 1);
        else if (event.key === "ArrowDown" || event.key === "ArrowRight") move(event, index + 1);
        else if (event.key === "Home") move(event, 0);
        else if (event.key === "End") move(event, total - 1);
      }}
      type="button"
    >
      <GripVertical aria-hidden="true" size={size} />
    </button>
  );
}

/** Instrucoes compartilhadas. Renderizar uma unica vez por pagina. */
export function SortableInstructions() {
  return (
    <p className="sr-only" id={SORTABLE_INSTRUCTIONS_ID}>
      Use as setas para cima e para baixo para mover o item. Home move para o início e End para o fim.
    </p>
  );
}
