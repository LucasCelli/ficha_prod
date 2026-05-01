"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { FichaFilters } from "./data";

type FichasFilterToolbarProps = {
  filters: FichaFilters;
  pdfHref: string;
};

const SEARCH_DEBOUNCE_MS = 450;

export function FichasFilterToolbar({ filters, pdfHref }: FichasFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.busca ?? "");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      updateFilter(searchParams, pathname, router, startTransition, "busca", searchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, router, searchParams, searchValue, startTransition]);

  return (
    <form className="fichas-toolbar" action="/fichas" aria-busy={isPending}>
      <div className="field fichas-toolbar__search">
        <label htmlFor="busca">Busca</label>
        <input
          id="busca"
          name="busca"
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Cliente, alias, vendedor ou personalização…"
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
      <a className="ui-button ui-button--secondary" href={pdfHref}>
        <FileText aria-hidden="true" size={18} />
        Exportar PDF
      </a>
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
