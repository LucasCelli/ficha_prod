"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { FichaFilters } from "./data";

type FichasFilterToolbarProps = {
  canExportPdf: boolean;
  filters: FichaFilters;
  pdfHref: string;
};

const SEARCH_DEBOUNCE_MS = 450;
const PDF_EXPORT_TIMEOUT_MS = 12_000;

export function FichasFilterToolbar({ canExportPdf, filters, pdfHref }: FichasFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const exportTimeoutRef = useRef<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const externalSearchValue = filters.busca ?? "";
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [searchDraftValue, setSearchDraftValue] = useState(externalSearchValue);
  const searchValue = isEditingSearch ? searchDraftValue : externalSearchValue;

  useEffect(() => {
    if (!isEditingSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updateFilter(searchParams, pathname, router, startTransition, "busca", searchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isEditingSearch, pathname, router, searchParams, searchValue, startTransition]);

  useEffect(() => {
    return () => {
      if (exportTimeoutRef.current) {
        window.clearTimeout(exportTimeoutRef.current);
        exportTimeoutRef.current = null;
      }
    };
  }, [pdfHref]);

  function handleExportPdf() {
    if (!canExportPdf || isExportingPdf) {
      return;
    }

    if (exportTimeoutRef.current) {
      window.clearTimeout(exportTimeoutRef.current);
    }

    setIsExportingPdf(true);
    exportTimeoutRef.current = window.setTimeout(() => {
      setIsExportingPdf(false);
      exportTimeoutRef.current = null;
    }, PDF_EXPORT_TIMEOUT_MS);

    window.location.assign(pdfHref);
  }

  return (
    <form
      className="fichas-toolbar"
      action="/fichas"
      aria-busy={isPending}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="field fichas-toolbar__search">
        <label htmlFor="busca">Busca</label>
        <input
          id="busca"
          name="busca"
          onBlur={() => setIsEditingSearch(false)}
          onChange={(event) => setSearchDraftValue(event.target.value)}
          onFocus={() => {
            setSearchDraftValue(externalSearchValue);
            setIsEditingSearch(true);
          }}
          placeholder="Cliente, alias, tecido, personalização, venda ou vendedor…"
          value={searchValue}
        />
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          onChange={(event) =>
            updateFilter(searchParams, pathname, router, startTransition, "status", event.target.value)
          }
          value={filters.status ?? ""}
        >
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasados</option>
          <option value="entregue">Entregue</option>
        </select>
      </div>
      <label className="checkbox-filter" htmlFor="evento">
        <input
          checked={filters.evento === true}
          id="evento"
          name="evento"
          onChange={(event) =>
            updateFilter(searchParams, pathname, router, startTransition, "evento", event.target.checked ? "true" : "")
          }
          type="checkbox"
        />
        <span>Evento</span>
      </label>
      <div className="field">
        <label htmlFor="dataInicio">Entrega inicial</label>
        <input
          id="dataInicio"
          name="dataInicio"
          onChange={(event) =>
            updateFilter(searchParams, pathname, router, startTransition, "dataInicio", event.target.value)
          }
          type="date"
          value={filters.dataInicio ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor="dataFim">Entrega final</label>
        <input
          id="dataFim"
          name="dataFim"
          onChange={(event) =>
            updateFilter(searchParams, pathname, router, startTransition, "dataFim", event.target.value)
          }
          type="date"
          value={filters.dataFim ?? ""}
        />
      </div>
      <div className="fichas-toolbar__status" aria-live="polite">
        {isPending ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            <span>Atualizando…</span>
          </>
        ) : null}
      </div>
      <button
        aria-disabled={!canExportPdf || isExportingPdf}
        className="ui-button ui-button--secondary"
        disabled={!canExportPdf || isExportingPdf}
        onClick={handleExportPdf}
        type="button"
      >
        {isExportingPdf ? <span className="button-spinner" aria-hidden="true" /> : <FileText aria-hidden="true" size={18} />}
        {isExportingPdf ? "Exportando" : "Exportar PDF"}
      </button>
    </form>
  );
}

function updateFilter(
  searchParams: URLSearchParams,
  pathname: string,
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  startTransition: (callback: () => void) => void,
  key: keyof Pick<FichaFilters, "busca" | "dataFim" | "dataInicio" | "evento"> | "status",
  value: string,
) {
  const params = new URLSearchParams(searchParams.toString());
  const normalizedValue = value.trim();
  const currentValue = params.get(key) ?? "";

  if (currentValue === normalizedValue) {
    return;
  }

  params.delete("page");
  params.delete("preview");

  if (normalizedValue) {
    params.set(key, normalizedValue);
  } else {
    params.delete(key);
  }

  startTransition(() => {
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  });
}
