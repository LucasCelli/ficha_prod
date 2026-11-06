export type CatalogPrintActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialCatalogPrintActionState: CatalogPrintActionState = { status: "idle" };
