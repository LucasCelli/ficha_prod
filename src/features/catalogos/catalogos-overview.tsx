import Link from "next/link";
import { ListPlus, SlidersHorizontal } from "lucide-react";
import { Badge, DataTable, EmptyState } from "@/components/ui";
import type { CatalogosResult } from "./data";
import { CatalogoForm } from "./catalogo-form";
import type { CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogosOverviewProps = {
  editId?: string;
  result: CatalogosResult;
  selectedKind: CatalogKind;
};

const columns = [
  { key: "name", label: "Nome" },
  { key: "aliases", label: "Aliases" },
  { key: "metadata", label: "Metadados" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Ações" },
];

function getComposition(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>).composition;
  return typeof value === "string" ? value : "";
}

export function CatalogosOverview({ editId, result, selectedKind }: CatalogosOverviewProps) {
  const items = result.itemsByKind[selectedKind];
  const selectedItem = items.find((item) => item.id === editId);

  return (
    <section className="catalogos-view" aria-labelledby="catalogos-title">
      <header className="catalogos-view__header">
        <div>
          <span className="eyebrow">Catálogos</span>
          <h1 id="catalogos-title" className="app-title">
            Base controlada de opções
          </h1>
          <p>
            Cadastre produtos, tamanhos, tecidos, cores e acabamentos para alimentar o formulário de fichas sem depender
            de JSONs estáticos.
          </p>
        </div>
      </header>

      {result.kind === "not-configured" ? (
        <EmptyState
          actions={<Link className="ui-button ui-button--secondary" href="/">Voltar ao início</Link>}
          description="Configure as variáveis de ambiente do Supabase para editar os catálogos operacionais."
          title="Supabase ainda não configurado"
        />
      ) : null}

      {result.kind === "error" ? (
        <EmptyState
          description={result.message}
          title="Não foi possível carregar catálogos"
        />
      ) : null}

      {result.kind === "ok" ? (
        <div className="catalogos-layout">
          <nav className="catalogos-tabs" aria-label="Tipos de catálogo">
            {catalogKinds.map((kind) => (
              <Link
                aria-current={kind === selectedKind ? "page" : undefined}
                className="catalogos-tab"
                href={`/catalogos?tipo=${kind}`}
                key={kind}
              >
                <span>{catalogKindLabels[kind]}</span>
                <Badge>{result.itemsByKind[kind].length}</Badge>
              </Link>
            ))}
          </nav>

          <div className="catalogos-content">
            <section className="catalogos-panel" aria-labelledby="catalogos-form-title">
              <div className="catalogos-panel__title">
                <ListPlus aria-hidden="true" size={18} />
                <h2 id="catalogos-form-title">
                  {selectedItem ? `Editar item` : `Adicionar em ${catalogKindLabels[selectedKind]}`}
                </h2>
              </div>
              <CatalogoForm item={selectedItem} selectedKind={selectedKind} />
            </section>

            <section className="catalogos-panel" aria-labelledby="catalogos-list-title">
              <div className="catalogos-panel__title">
                <SlidersHorizontal aria-hidden="true" size={18} />
                <h2 id="catalogos-list-title">{catalogKindLabels[selectedKind]}</h2>
              </div>
              {items.length ? (
                <DataTable caption={`Itens de ${catalogKindLabels[selectedKind]}`} columns={columns}>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="ui-table__primary">
                          <strong>{item.name}</strong>
                          <span className="ui-table__muted">{item.slug}</span>
                        </span>
                      </td>
                      <td>{item.aliases.length ? item.aliases.join(", ") : "Sem aliases"}</td>
                      <td>{getComposition(item.metadata) || item.description || "Sem metadados"}</td>
                      <td>
                        <Badge tone={item.active ? "success" : "warning"}>{item.active ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td>
                        <Link className="ui-button ui-button--secondary" href={`/catalogos?tipo=${selectedKind}&edit=${item.id}`}>
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState
                  description="Nenhum item cadastrado para este tipo ainda."
                  title="Catálogo vazio"
                />
              )}
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
