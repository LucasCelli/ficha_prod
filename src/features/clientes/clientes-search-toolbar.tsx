"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useQueryState } from "nuqs";

type ClientesSearchToolbarProps = {
  initialTerm?: string;
};

export function ClientesSearchToolbar({ initialTerm = "" }: ClientesSearchToolbarProps) {
  const [queryTerm, setQueryTerm] = useQueryState("termo", {
    defaultValue: "",
    history: "replace",
    shallow: false,
  });
  const [, setPage] = useQueryState("page", {
    history: "replace",
    shallow: false,
  });
  const [term, setTerm] = useState(queryTerm || initialTerm);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void setPage(null);
      void setQueryTerm(term.trim() || null);
    }, 360);

    return () => window.clearTimeout(handle);
  }, [setPage, setQueryTerm, term]);

  return (
    <div className="clientes-toolbar" role="search">
      <div className="field">
        <label htmlFor="termo">Buscar cliente</label>
        <div className="clientes-search-field">
          <Search aria-hidden="true" size={18} />
          <input
            id="termo"
            name="termo"
            onChange={(event) => setTerm(event.currentTarget.value)}
            placeholder="Nome do cliente..."
            type="search"
            value={term}
          />
        </div>
      </div>
    </div>
  );
}
