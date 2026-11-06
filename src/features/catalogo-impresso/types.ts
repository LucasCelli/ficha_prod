import type { Database } from "@/lib/supabase/database.types";

export type CatalogPrintSection = Database["public"]["Enums"]["catalog_print_section"];
export type CatalogPrintSettings = Database["public"]["Tables"]["catalog_print_settings"]["Row"];
export type CatalogPrintCategory = Database["public"]["Tables"]["catalog_print_categories"]["Row"];
export type CatalogPrintImage = Database["public"]["Tables"]["catalog_print_entry_images"]["Row"];
export type CatalogPrintPublication = Database["public"]["Tables"]["catalog_print_publications"]["Row"];

export type CatalogPrintEntry = Database["public"]["Tables"]["catalog_print_entries"]["Row"] & {
  category?: Pick<CatalogPrintCategory, "id" | "name" | "section"> | null;
  images: CatalogPrintImage[];
};

export type CatalogPrintSource = {
  id: string;
  arte: string | null;
  material: string | null;
  created_at: string;
  products: string[];
  images: Array<{ id: string; url: string; alt_text: string | null; width: number | null; height: number | null }>;
  entryCount: number;
};

export const catalogPrintSections = ["produto", "personalizacao"] as const;
export const catalogPrintSectionLabels: Record<CatalogPrintSection, string> = {
  produto: "Produtos",
  personalizacao: "Personalizações",
};

export type CatalogPrintDashboard = {
  categories: CatalogPrintCategory[];
  entries: CatalogPrintEntry[];
  pendingSources: CatalogPrintSource[];
  pendingSourceCount: number;
  publication: (CatalogPrintPublication & { generatedByName?: string | null }) | null;
  settings: CatalogPrintSettings;
};
