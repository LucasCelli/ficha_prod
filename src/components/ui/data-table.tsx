import type { ReactNode } from "react";

type DataTableColumn = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
};

type DataTableProps = {
  columns: DataTableColumn[];
  children: ReactNode;
  caption: string;
};

export function DataTable({ caption, children, columns }: DataTableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
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
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
