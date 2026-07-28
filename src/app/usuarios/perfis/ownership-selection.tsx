"use client";

import { type ReactNode, useRef, useState } from "react";

export function OwnershipSelection({ children }: { children: ReactNode }) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const [allSelected, setAllSelected] = useState(false);

  function selectionInputs() {
    return Array.from(
      rowsRef.current?.querySelectorAll<HTMLInputElement>('input[name="fichaIds"]') ?? [],
    );
  }

  function toggleAll(checked: boolean) {
    selectionInputs().forEach((input) => {
      input.checked = checked;
    });
    setAllSelected(checked);
  }

  function syncSelection() {
    const inputs = selectionInputs();
    setAllSelected(inputs.length > 0 && inputs.every((input) => input.checked));
  }

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => toggleAll(event.currentTarget.checked)}
        />{" "}
        Marcar todos
      </label>
      <div ref={rowsRef} onChange={syncSelection}>
        {children}
      </div>
    </>
  );
}