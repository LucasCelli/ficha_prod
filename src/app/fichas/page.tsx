import type { Metadata } from "next";
import { FichasOverview } from "@/features/fichas/fichas-overview";
import { FichaPreview } from "@/features/fichas/ficha-preview";
import { Modal } from "@/components/ui/modal";
import {
  listFichas,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
  normalizePageFilter,
  normalizeTextFilter,
} from "@/features/fichas/data";

export const metadata: Metadata = {
  title: "Fichas | Fichas Técnicas",
};

type FichasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FichasPage({ searchParams }: FichasPageProps) {
  const params = await searchParams;
  const previewId = typeof params?.preview === "string" ? params.preview : null;
  const busca = normalizeTextFilter(params?.busca) ?? normalizeTextFilter(params?.cliente) ?? normalizeTextFilter(params?.arte);

  const filters = {
    busca,
    dataFim: normalizeDateFilter(params?.dataFim),
    dataInicio: normalizeDateFilter(params?.dataInicio),
    evento: normalizeBooleanFilter(params?.evento),
    page: normalizePageFilter(params?.page),
    status: normalizeFichaStatus(params?.status),
  };
  const result = await listFichas(filters);

  const searchParamsObj = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (key !== "preview" && value !== undefined && value !== "undefined" && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParamsObj.append(key, v));
      } else {
        searchParamsObj.set(key, value);
      }
    }
  });
  const onCloseHref = searchParamsObj.toString() ? `/fichas?${searchParamsObj.toString()}` : "/fichas";

  return (
    <>
      <FichasOverview filters={filters} result={result} />
      {previewId && (
        <Modal onCloseHref={onCloseHref} size="lg" title="Visualização da Ficha">
          <FichaPreview id={previewId} />
        </Modal>
      )}
    </>
  );
}
