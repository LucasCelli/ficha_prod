import type { Metadata } from "next";
import { requireSuperadmin } from "@/features/auth/session";
import { CatalogosOverview } from "@/features/catalogos/catalogos-overview";
import { listCatalogItems } from "@/features/catalogos/data";
import type { CatalogKind } from "@/features/catalogos/types";
import { catalogKinds } from "@/features/catalogos/types";

export const metadata: Metadata = {
  title: "Catálogos - Fichas Técnicas",
};

type CatalogosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeKind(value: string | string[] | undefined): CatalogKind {
  const candidate = Array.isArray(value) ? value[0] : value;
  return catalogKinds.includes(candidate as CatalogKind) ? (candidate as CatalogKind) : "produto";
}

export default async function CatalogosPage({ searchParams }: CatalogosPageProps) {
  await requireSuperadmin();

  const params = await searchParams;
  const selectedKind = normalizeKind(params.tipo);
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const result = await listCatalogItems();

  return <CatalogosOverview editId={editId} result={result} selectedKind={selectedKind} />;
}
