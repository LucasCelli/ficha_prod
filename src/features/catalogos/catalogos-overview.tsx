import Link from "next/link";
import { ChevronDown, ListPlus, SlidersHorizontal } from "lucide-react";
import { Badge, DataTable, EmptyState, FloatingMenu, FloatingMenuLink, Modal } from "@/components/ui";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import type { CatalogosResult } from "./data";
import { CatalogoForm } from "./catalogo-form";
import { CatalogItemActions } from "./catalog-item-actions";
import type { CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogosOverviewProps = {
  editId?: string;
  modalMode?: string;
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

export function CatalogosOverview({ editId, modalMode, result, selectedKind }: CatalogosOverviewProps) {
  const items = result.itemsByKind[selectedKind];
  const selectedItem = items.find((item) => item.id === editId);
  const closeHref = `/catalogos?tipo=${selectedKind}`;

  return (
    <section className="catalogos-view" aria-labelledby="catalogos-title">
      <RouteToast messages={catalogoToastMessages} paramName="toast" />
      <header className="catalogos-view__header">
        <div>
          <span className="eyebrow">Catálogos</span>
          <h1 id="catalogos-title" className="app-title">
            Catálogos
          </h1>
        </div>
      </header>

      {result.kind === "not-configured" ? (
        <EmptyState
          actions={<Link className="ui-button ui-button--secondary" href="/">Voltar ao início</Link>}
          description="Tente novamente."
          title="Catálogos indisponíveis"
        />
      ) : null}

      {result.kind === "error" ? <EmptyState description={result.message} title="Não foi possível carregar catálogos" /> : null}

      {result.kind === "ok" ? (
        <div className="catalogos-layout">
          <div className="catalogos-toolbar">
            <div className="catalogos-current-kind">
              <span>Categoria</span>
              <strong>{catalogKindLabels[selectedKind]}</strong>
            </div>
            <FloatingMenu
              label="Selecionar categoria de catálogo"
              trigger={
                <>
                  <SlidersHorizontal aria-hidden="true" size={18} />
                  <span>{catalogKindLabels[selectedKind]}</span>
                  <ChevronDown aria-hidden="true" size={16} />
                </>
              }
            >
              {catalogKinds.map((kind) => (
                <FloatingMenuLink aria-current={kind === selectedKind ? "page" : undefined} href={`/catalogos?tipo=${kind}`} key={kind}>
                  <span>{catalogKindLabels[kind]}</span>
                  <Badge>{result.itemsByKind[kind].length}</Badge>
                </FloatingMenuLink>
              ))}
            </FloatingMenu>
            <Link className="ui-button ui-button--primary" href={`/catalogos?tipo=${selectedKind}&modal=novo`}>
              <ListPlus aria-hidden="true" size={18} />
              Novo item
            </Link>
          </div>

          <section className="catalogos-panel" aria-labelledby="catalogos-list-title">
            <div className="catalogos-panel__title catalogos-panel__title--spread">
              <div>
                <SlidersHorizontal aria-hidden="true" size={18} />
                <h2 id="catalogos-list-title">{catalogKindLabels[selectedKind]}</h2>
              </div>
              <Badge>{items.length}</Badge>
            </div>
            {items.length ? (
              <DataTable caption={`Itens de ${catalogKindLabels[selectedKind]}`} columns={columns}>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="ui-table__primary">
                        <strong>{item.name}</strong>
                        <span className="ui-table__muted" style={{ fontFamily: "var(--font-family-mono)", fontSize: "var(--font-size-xs)" }}>{item.slug}</span>
                      </span>
                    </td>
                    <td>{item.aliases.length ? item.aliases.join(", ") : <span className="ui-table__muted">—</span>}</td>
                    <td>{getComposition(item.metadata) || item.description || <span className="ui-table__muted">—</span>}</td>
                    <td>
                      <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    <td>
                      <CatalogItemActions
                        editHref={`/catalogos?tipo=${selectedKind}&edit=${item.id}`}
                        itemId={item.id}
                        itemName={item.name}
                        returnTo={closeHref}
                      />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState description="Nenhum item cadastrado para este tipo ainda." title="Catálogo vazio" />
            )}
          </section>

          {modalMode === "novo" ? (
            <Modal onCloseHref={closeHref} size="md" title={`Adicionar em ${catalogKindLabels[selectedKind]}`}>
              <div className="modal-form">
                <div className="modal-form__header">
                  <span className="eyebrow">Catálogos</span>
                  <h2>Adicionar em {catalogKindLabels[selectedKind]}</h2>
                </div>
                <CatalogoForm returnTo={closeHref} selectedKind={selectedKind} />
              </div>
            </Modal>
          ) : null}

          {selectedItem ? (
            <Modal onCloseHref={closeHref} size="md" title={`Editar ${selectedItem.name}`}>
              <div className="modal-form">
                <div className="modal-form__header">
                  <span className="eyebrow">Catálogos</span>
                  <h2>Editar item</h2>
                </div>
                <CatalogoForm item={selectedItem} returnTo={closeHref} selectedKind={selectedKind} />
              </div>
            </Modal>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const catalogoToastMessages: Record<string, RouteToastMessage> = {
  "catalog-item-created": {
    description: "O item foi adicionado.",
    title: "Item salvo",
    tone: "success",
  },
  "catalog-item-updated": {
    description: "As alterações foram salvas.",
    title: "Item atualizado",
    tone: "success",
  },
  "catalog-item-deleted": {
    description: "O item foi excluido.",
    title: "Item excluido",
    tone: "success",
  },
};
