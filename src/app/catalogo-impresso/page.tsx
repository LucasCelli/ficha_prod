import type { Metadata } from "next";
import { requireSuperadmin } from "@/features/auth/session";
import { CatalogPrintAdminOverview } from "@/features/catalogo-impresso/admin-overview";
import { getCatalogPrintDashboard } from "@/features/catalogo-impresso/data";

export const metadata: Metadata = { title: "Catálogo impresso - Fichas Técnicas" };

export default async function CatalogoImpressoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperadmin();
  const params = await searchParams;
  const viewValue = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = viewValue === "sources" || viewValue === "categories" || viewValue === "settings" ? viewValue : "articles";
  return <CatalogPrintAdminOverview data={await getCatalogPrintDashboard()} initialView={view} />;
}
