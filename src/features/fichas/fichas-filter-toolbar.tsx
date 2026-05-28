"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileText, X } from "lucide-react";
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
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!isExportMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !exportMenuRef.current?.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExportMenuOpen(false);
        exportMenuRef.current?.querySelector<HTMLButtonElement>(".fichas-toolbar__export-trigger")?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExportMenuOpen]);

  function handleExportPdf(includeOverdue: boolean) {
    if (!canExportPdf || isExportingPdf) {
      return;
    }

    if (exportTimeoutRef.current) {
      window.clearTimeout(exportTimeoutRef.current);
    }

    setIsExportingPdf(true);
    setIsExportMenuOpen(false);
    exportTimeoutRef.current = window.setTimeout(() => {
      setIsExportingPdf(false);
      exportTimeoutRef.current = null;
    }, PDF_EXPORT_TIMEOUT_MS);

    window.location.assign(getPdfHref(pdfHref, includeOverdue));
  }

  function clearSearch() {
    setSearchDraftValue("");
    setIsEditingSearch(true);
    updateFilter(searchParams, pathname, router, startTransition, "busca", "");
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
        <div className="fichas-toolbar__search-control">
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
          {searchValue.trim() ? (
            <button
              aria-label="Limpar busca"
              className="fichas-toolbar__search-clear"
              onClick={clearSearch}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
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
          <option value="atrasado">Atrasado</option>
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
      <div className="fichas-toolbar__export" ref={exportMenuRef}>
        <button
          aria-disabled={!canExportPdf || isExportingPdf}
          aria-expanded={isExportMenuOpen}
          aria-haspopup="menu"
          className="ui-button ui-button--secondary fichas-toolbar__export-trigger"
          disabled={!canExportPdf || isExportingPdf}
          onClick={() => setIsExportMenuOpen((current) => !current)}
          type="button"
        >
          {isExportingPdf ? <span className="button-spinner" aria-hidden="true" /> : <FileText aria-hidden="true" size={18} />}
          {isExportingPdf ? "Exportando" : "Exportar PDF"}
          <ChevronDown aria-hidden="true" size={16} />
        </button>
        {isExportMenuOpen ? (
          <div className="fichas-toolbar__export-menu" role="menu">
            <button onClick={() => handleExportPdf(false)} role="menuitem" type="button">
              Somente período selecionado
            </button>
            <button onClick={() => handleExportPdf(true)} role="menuitem" type="button">
              Incluir atrasadas
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function getPdfHref(pdfHref: string, includeOverdue: boolean) {
  const [pathname, query = ""] = pdfHref.split("?");
  const params = new URLSearchParams(query);

  if (includeOverdue) {
    params.set("incluirAtrasadas", "true");
  } else {
    params.delete("incluirAtrasadas");
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
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
