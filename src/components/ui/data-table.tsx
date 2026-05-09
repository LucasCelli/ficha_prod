import type { ReactNode, RefObject } from "react";

type DataTableColumn = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
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
                key={column.key}
                scope="col"
                style={{
                  width: column.width,
                  textAlign: column.align,
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>{children}</tbody>
      </table>
    </div>
  );
}
