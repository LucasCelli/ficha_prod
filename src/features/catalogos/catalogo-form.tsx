"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { CircleHelp, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, Tooltip } from "@/components/ui";
import { saveCatalogItemAction } from "./actions";
import { getInitialCatalogoFormState } from "./form-state";
import type { CatalogItem, CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogoFormProps = {
  item?: CatalogItem;
  returnTo?: string;
  selectedKind: CatalogKind;
};

function getMetadataText(item: CatalogItem | undefined, key: string) {
  const metadata = item?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function FieldLabel({ htmlFor, info, label }: { htmlFor?: string; info: string; label: string }) {
  return (
    <div className="field-label-row">
      <label htmlFor={htmlFor}>{label}</label>
      <Tooltip label={info}>
        <button aria-label={`Info: ${label}`} className="field-info-button" type="button">
          <CircleHelp aria-hidden="true" size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

export function CatalogoForm({ item, returnTo, selectedKind }: CatalogoFormProps) {
  const [state, formAction] = useActionState(saveCatalogItemAction, getInitialCatalogoFormState());
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastToastRef.current === state.message) return;

    const title = state.status === "success" ? "Catálogo atualizado" : "Pendência no catálogo";
    const description = state.message === title ? undefined : state.message;
    const toastFn = state.status === "success" ? toast.success : toast.error;
    toastFn(title, { description });
    lastToastRef.current = state.message;
  }, [state]);

  return (
    <form action={formAction} className="catalog-form">
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      {item ? <input name="sortOrder" type="hidden" value={item.sort_order} /> : null}
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

      <div className="catalog-form__grid">
        <div className="field">
          <FieldLabel htmlFor="catalog-kind" info="Define em qual campo da ficha este item aparece." label="Categoria" />
          {item ? (
            <>
              <input name="kind" type="hidden" value={item.kind} />
              <div className="readonly-field">{catalogKindLabels[item.kind]}</div>
            </>
          ) : (
            <select id="catalog-kind" name="kind" defaultValue={selectedKind}>
              {catalogKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {catalogKindLabels[kind]}
                </option>
              ))}
            </select>
          )}
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
          <FieldLabel
            htmlFor="catalog-aliases"
            info="Variações pesquisáveis: apelidos, grafias antigas ou códigos importados que apontam para este nome na ficha."
            label="Aliases"
          />
          <input id="catalog-aliases" defaultValue={item?.aliases.join(", ")} name="aliases" placeholder="Variação 1, variação 2…" />
        </div>

        <div className="field">
          <FieldLabel
            htmlFor="catalog-composition"
            info="Aparece como detalhe nas sugestões da ficha, principalmente para tecidos e materiais."
            label="Composição"
          />
          <input id="catalog-composition" defaultValue={getMetadataText(item, "composition")} name="composition" placeholder="100% poliéster…" />
        </div>

        <label className="checkbox-field catalog-form__active">
          <input defaultChecked={item?.active ?? true} name="active" type="checkbox" />
          <span>Ativo</span>
        </label>

        <div className="field catalog-form__description">
          <FieldLabel
            htmlFor="catalog-description"
            info="Nota interna do catálogo. Não entra como detalhe automático na ficha."
            label="Descrição"
          />
          <textarea id="catalog-description" defaultValue={item?.description ?? ""} name="description" placeholder="Notas internas…" rows={3} />
        </div>
      </div>

      <div className="catalog-form__actions">
        <SubmitButton isEdit={Boolean(item)} />
      </div>
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  const idleLabel = isEdit ? "Salvar alterações" : "Adicionar item";
  const pendingLabel = isEdit ? "Salvando alterações..." : "Adicionando item...";

  return (
    <Button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
