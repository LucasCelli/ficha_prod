import type { Metadata } from "next";
import { Suspense } from "react";
import { Modal } from "@/components/ui/modal";
import { FichasOverview } from "@/features/fichas/fichas-overview";
import {
  FichaPrintPreviewContent,
  FichaPrintPreviewError,
  FichaPrintPreviewLoading,
  FichaPrintPreviewShell,
} from "@/features/fichas/ficha-print-preview-modal";
import {
  type FichaDetailResult,
  getFichaById,
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
  const printId =
    typeof params?.print === "string"
      ? params.print
      : typeof params?.preview === "string"
        ? params.preview
        : null;
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
    if (key !== "preview" && key !== "print" && value !== undefined && value !== "undefined" && value !== "") {
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
      {printId ? (
        <Modal onCloseHref={onCloseHref} size="print" title="Prévia de impressão">
          <FichaPrintPreviewShell
            duplicateHref={`/fichas/nova?duplicar=${encodeURIComponent(printId)}`}
            printHref={`/fichas/${encodeURIComponent(printId)}/imprimir`}
          >
            <Suspense fallback={<FichaPrintPreviewLoading />}>
              <FichaPrintPreviewModalSlot printId={printId} />
            </Suspense>
          </FichaPrintPreviewShell>
        </Modal>
      ) : null}
    </>
  );
}

async function FichaPrintPreviewModalSlot({ printId }: { printId: string }) {
  const printResult: FichaDetailResult = await getFichaById(printId);

  if (printResult.kind !== "ok" || !printResult.ficha) {
    return <FichaPrintPreviewError />;
  }

  return <FichaPrintPreviewContent ficha={printResult.ficha} />;
}
