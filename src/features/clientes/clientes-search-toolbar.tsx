"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Filter, Search, X } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ClienteFilters } from "./data";

type ClientesSearchToolbarProps = {
  filters: ClienteFilters;
};

const sortOptions = [
  { label: "Atividade recente", value: "recentes" },
  { label: "Mais antigos", value: "antigos" },
  { label: "Mais fichas", value: "mais_fichas" },
  { label: "Nome (A–Z)", value: "nome" },
] as const;

const atividadeOptions = [
  { label: "Todos", value: "" },
  { label: "Ativos (90 dias)", value: "ativos" },
  { label: "Inativos", value: "inativos" },
  { label: "Sem fichas", value: "sem_fichas" },
] as const;

export function ClientesSearchToolbar({ filters }: ClientesSearchToolbarProps) {
  const [queryTerm, setQueryTerm] = useQueryState("termo", {
    defaultValue: "",
    history: "replace",
    shallow: false,
  });
  const [, setSort] = useQueryState("sort", { history: "replace", shallow: false });
  const [, setAtividade] = useQueryState("atividade", { history: "replace", shallow: false });
  const [, setPage] = useQueryState("page", {
    history: "replace",
    shallow: false,
  });
  const [term, setTerm] = useState(queryTerm || filters.termo || "");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void setPage(null);
      void setQueryTerm(term.trim() || null);
    }, 360);

    return () => window.clearTimeout(handle);
  }, [setPage, setQueryTerm, term]);

  return (
    <div className="clientes-toolbar" role="search">
      <div className="field clientes-toolbar__search">
        <label className="sr-only" htmlFor="termo">Buscar cliente</label>
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
          {term.trim() ? (
            <button
              aria-label="Limpar busca"
              className="clientes-search-field__clear"
              onClick={() => setTerm("")}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="field clientes-toolbar__field">
        <label htmlFor="atividade">
          <Filter aria-hidden="true" size={14} />
          Atividade
        </label>
        <select
          id="atividade"
          name="atividade"
          onChange={(event) => {
            void setPage(null);
            void setAtividade(event.currentTarget.value || null);
          }}
          value={filters.atividade ?? ""}
        >
          {atividadeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field clientes-toolbar__field">
        <label htmlFor="sort">
          <ArrowUpDown aria-hidden="true" size={14} />
          Ordenar
        </label>
        <select
          id="sort"
          name="sort"
          onChange={(event) => {
            void setPage(null);
            void setSort(event.currentTarget.value === "recentes" ? null : event.currentTarget.value);
          }}
          value={filters.sort ?? "recentes"}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
