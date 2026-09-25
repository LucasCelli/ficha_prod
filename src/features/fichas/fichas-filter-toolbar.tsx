"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Printer, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui";
import type { FichaFilters } from "./data";
import { DatePickerField } from "./date-picker-field";
import { getPrintPeriodError } from "./print-period";
import { PrintTriggerButton } from "./print-trigger-button";

type FichasFilterToolbarProps = {
  canPrint: boolean;
  filters: FichaFilters;
  printHref: string;
};

const SEARCH_DEBOUNCE_MS = 450;

export function FichasFilterToolbar({ canPrint, filters, printHref }: FichasFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const exportMenuRef = useRef<HTMLDivElement>(null);
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
      <div className="field">
        <label htmlFor="arte">Personalização</label>
        <select
          id="arte"
          name="arte"
          onChange={(event) =>
            updateFilter(searchParams, pathname, router, startTransition, "arte", event.target.value)
          }
          value={filters.arte ?? ""}
        >
          <option value="">Todas</option>
          <option value="sem_personalizacao">Sem personalização</option>
          <option value="sublimacao">Sublimação</option>
          <option value="serigrafia">Serigrafia</option>
          <option value="bordado">Bordado</option>
          <option value="patch">PATCH Termocolante</option>
          <option value="dtf">DTF Têxtil</option>
          <option value="transfer">Transfer</option>
          <option value="sublimacao_serigrafia">Sublimação e Serigrafia</option>
          <option value="serigrafia_dtf">Serigrafia e DTF</option>
          <option value="serigrafia_bordado">Serigrafia e Bordado</option>
        </select>
      </div>
      <div className="field fichas-toolbar__event">
        <label id="evento-label" htmlFor="evento">Evento</label>
        <Tooltip label="Filtrar fichas de evento">
          <label aria-labelledby="evento-label" className="checkbox-filter event-filter" htmlFor="evento">
            <input
              checked={filters.evento === true}
              id="evento"
              name="evento"
              onChange={(event) =>
                updateFilter(searchParams, pathname, router, startTransition, "evento", event.target.checked ? "true" : "")
              }
              type="checkbox"
            />
            <Star aria-hidden="true" className="event-filter__icon" size={20} />
          </label>
        </Tooltip>
      </div>
      <div className="field">
        <label htmlFor="dataInicio">Entrega inicial</label>
        <DatePickerField
          id="dataInicio"
          initialValue={filters.dataInicio}
          key={`dataInicio-${filters.dataInicio ?? ""}`}
          name="dataInicio"
          onValueChange={(value) =>
            updateFilter(searchParams, pathname, router, startTransition, "dataInicio", value)
          }
        />
      </div>
      <div className="field">
        <label htmlFor="dataFim">Entrega final</label>
        <DatePickerField
          id="dataFim"
          initialValue={filters.dataFim}
          key={`dataFim-${filters.dataFim ?? ""}`}
          name="dataFim"
          onValueChange={(value) =>
            updateFilter(searchParams, pathname, router, startTransition, "dataFim", value)
          }
        />
      </div>
      <div className="fichas-toolbar__export" ref={exportMenuRef}>
        <button
          aria-disabled={!canPrint}
          aria-expanded={isExportMenuOpen}
          aria-haspopup="menu"
          className="ui-button ui-button--secondary fichas-toolbar__export-trigger"
          disabled={!canPrint}
          onClick={() => {
            const periodError = getPrintPeriodError(filters.dataInicio, filters.dataFim);

            if (periodError) {
              toast.error(periodError);
              document.getElementById(filters.dataInicio ? "dataFim" : "dataInicio")?.focus();
              return;
            }

            setIsExportMenuOpen((current) => !current);
          }}
          type="button"
        >
          <Printer aria-hidden="true" size={18} />
          Imprimir
          <ChevronDown aria-hidden="true" size={16} />
        </button>
        {isExportMenuOpen ? (
          <div className="fichas-toolbar__export-menu" role="menu">
            <PrintTriggerButton
              href={getPrintHref(printHref, false)}
              label="Imprimir somente o período selecionado"
              onClick={() => setIsExportMenuOpen(false)}
              role="menuitem"
            >
              Somente período selecionado
            </PrintTriggerButton>
            <PrintTriggerButton
              href={getPrintHref(printHref, true)}
              label="Imprimir incluindo atrasadas"
              onClick={() => setIsExportMenuOpen(false)}
              role="menuitem"
            >
              Incluir atrasadas
            </PrintTriggerButton>
          </div>
        ) : null}
      </div>
      <div className="fichas-toolbar__status" aria-live="polite">
        {isPending ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            <span>Atualizando…</span>
          </>
        ) : null}
      </div>
    </form>
  );
}

function getPrintHref(printHref: string, includeOverdue: boolean) {
  const [pathname, query = ""] = printHref.split("?");
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
  key: keyof Pick<FichaFilters, "arte" | "busca" | "dataFim" | "dataInicio" | "evento"> | "status",
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
