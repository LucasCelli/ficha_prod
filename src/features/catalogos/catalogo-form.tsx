"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { saveCatalogItemAction } from "./actions";
import { getInitialCatalogoFormState } from "./form-state";
import type { CatalogItem, CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogoFormProps = {
  item?: CatalogItem;
  selectedKind: CatalogKind;
};

function getMetadataText(item: CatalogItem | undefined, key: string) {
  const metadata = item?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export function CatalogoForm({ item, selectedKind }: CatalogoFormProps) {
  const [state, formAction] = useActionState(saveCatalogItemAction, getInitialCatalogoFormState());
  const { show } = useToast();
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastToastRef.current === state.message) return;

    show({
      message: state.message,
      title: state.status === "success" ? "Catálogo atualizado" : "Pendência no catálogo",
      type: state.status === "success" ? "success" : "error",
    });
    lastToastRef.current = state.message;
  }, [show, state]);

  return (
    <form action={formAction} className="catalog-form">
      {item ? <input name="id" type="hidden" value={item.id} /> : null}

      <div className="catalog-form__grid">
        <div className="field">
          <label htmlFor="catalog-kind">Tipo</label>
          <select id="catalog-kind" defaultValue={item?.kind ?? selectedKind} name="kind">
            {catalogKinds.map((kind) => (
              <option key={kind} value={kind}>
                {catalogKindLabels[kind]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="catalog-name">Nome</label>
          <input
            id="catalog-name"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            defaultValue={item?.name}
            name="name"
            placeholder="Nome principal…"
          />
          {state.fieldErrors?.name ? <small className="field-error">{state.fieldErrors.name}</small> : null}
        </div>

        <div className="field">
          <label htmlFor="catalog-aliases">Aliases</label>
          <input id="catalog-aliases" defaultValue={item?.aliases.join(", ")} name="aliases" placeholder="Variação 1, variação 2…" />
        </div>

        <div className="field">
          <label htmlFor="catalog-composition">Composição</label>
          <input id="catalog-composition" defaultValue={getMetadataText(item, "composition")} name="composition" placeholder="100% poliéster…" />
        </div>

        <div className="field">
          <label htmlFor="catalog-sort">Ordem</label>
          <input id="catalog-sort" defaultValue={item?.sort_order ?? 0} inputMode="numeric" name="sortOrder" placeholder="0…" type="number" />
        </div>
      </div>

      <div className="catalog-form__bottom">
        <label className="checkbox-field">
          <input defaultChecked={item?.active ?? true} name="active" type="checkbox" />
          <span>Ativo</span>
        </label>

        <div className="field catalog-form__full">
          <label htmlFor="catalog-description">Descrição</label>
          <textarea id="catalog-description" defaultValue={item?.description ?? ""} name="description" placeholder="Notas internas…" rows={3} />
        </div>
      </div>

      <div className="catalog-form__actions">
        <Button type="submit">
          <Save aria-hidden="true" size={18} />
          {item ? "Salvar alterações" : "Adicionar item"}
        </Button>
        {item ? (
          <Link className="ui-button ui-button--secondary" href={`/catalogos?tipo=${selectedKind}`}>
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
