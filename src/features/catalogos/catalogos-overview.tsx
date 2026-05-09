import Link from "next/link";
import { ChevronDown, ListPlus, SlidersHorizontal } from "lucide-react";
import { Badge, EmptyState, FloatingMenu, FloatingMenuLink, Modal } from "@/components/ui";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import type { CatalogosResult } from "./data";
import { CatalogItemsTable } from "./catalog-items-table";
import { CatalogoForm } from "./catalogo-form";
import type { CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogosOverviewProps = {
  editId?: string;
  modalMode?: string;
  result: CatalogosResult;
  selectedKind: CatalogKind;
};

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
              <CatalogItemsTable closeHref={closeHref} items={items} selectedKind={selectedKind} />
            ) : (
              <EmptyState description="Nenhum item cadastrado para este tipo ainda." title="Catálogo vazio" />
            )}
          </section>

          {modalMode === "novo" ? (
            <Modal onCloseHref={closeHref} size="md" title="Novo item">
              <div className="modal-form">
                <div className="modal-form__header">
                  <span className="eyebrow">Catálogos</span>
                  <h2>Novo item</h2>
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
