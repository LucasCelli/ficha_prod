import type { ReactNode, RefObject } from "react";

type DataTableColumn = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  onSort?: () => void;
  sortDirection?: "ascending" | "descending";
};

type DataTableProps = {
  bodyRef?: RefObject<HTMLTableSectionElement | null>;
  className?: string;
  columns: DataTableColumn[];
  children: ReactNode;
  caption: string;
};

export function DataTable({ bodyRef, caption, children, className, columns }: DataTableProps) {
  const tableClassName = ["ui-table", className].filter(Boolean).join(" ");

  return (
    <div className="ui-table-wrap">
      <table className={tableClassName}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                aria-sort={column.sortDirection}
                key={column.key}
                scope="col"
                style={{
                  width: column.width,
                  textAlign: column.align,
                }}
              >
                {column.onSort ? (
                  <button className="ui-table__sort-button" onClick={column.onSort} type="button">
                    <span>{column.label}</span>
                    <span aria-hidden="true">{column.sortDirection === "ascending" ? "↑" : column.sortDirection === "descending" ? "↓" : "↕"}</span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>{children}</tbody>
      </table>
    </div>
  );
}
