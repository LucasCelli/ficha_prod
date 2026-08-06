"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleHelp, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui";
import { saveCatalogItemAction } from "./actions";
import { getInitialCatalogoFormState } from "./form-state";
import type { CatalogItem, CatalogKind } from "./types";
import { catalogKindLabels, catalogKinds } from "./types";

type CatalogoFormProps = {
  item?: CatalogItem;
  returnTo?: string;
  selectedKind: CatalogKind;
};

type SizeWidthKey = "front" | "back" | "shortSleeve" | "longSleeve";
type SizeWidths = Record<SizeWidthKey, string>;

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
      <IconButton appearance="bare" className="field-info-button" label={info}>
        <CircleHelp aria-hidden="true" size={14} />
      </IconButton>
    </div>
  );
}

export function CatalogoForm({ item, returnTo, selectedKind }: CatalogoFormProps) {
  const [state, formAction] = useActionState(saveCatalogItemAction, getInitialCatalogoFormState());
  const [kind, setKind] = useState<CatalogKind>(item?.kind ?? selectedKind);
  const [sizeWidths, setSizeWidths] = useState<SizeWidths>(() => ({
    back: item?.measure_back_width_cm?.toString() ?? "",
    front: item?.measure_front_width_cm?.toString() ?? "",
    longSleeve: item?.measure_long_sleeve_width_cm?.toString() ?? "",
    shortSleeve: item?.measure_short_sleeve_width_cm?.toString() ?? "",
  }));
  const independentWidthsRef = useRef(new Set<SizeWidthKey>([
    ...(item?.measure_front_width_cm != null ? ["front" as const] : []),
    ...(item?.measure_back_width_cm != null ? ["back" as const] : []),
    ...(item?.measure_short_sleeve_width_cm != null ? ["shortSleeve" as const] : []),
    ...(item?.measure_long_sleeve_width_cm != null ? ["longSleeve" as const] : []),
  ]));
  const lastToastRef = useRef<string | null>(null);
  const isSize = kind === "tamanho";
  const isFabric = kind === "tecido";

  function updateSizeWidth(source: SizeWidthKey, paired: SizeWidthKey, value: string) {
    independentWidthsRef.current.add(source);
    setSizeWidths((current) => ({
      ...current,
      [source]: value,
      ...(!independentWidthsRef.current.has(paired) ? { [paired]: value } : {}),
    }));
  }

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
            <select id="catalog-kind" name="kind" value={kind} onChange={(event) => setKind(event.currentTarget.value as CatalogKind)}>
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

        {isSize ? (
          <fieldset className="catalog-form__measurements">
            <legend>Medidas do molde</legend>
            <p>Largura e altura em centímetros usadas pelo Plano de Corte. Preencha as quatro partes ou deixe tudo vazio.</p>
            <div>
              <MeasurementPair
                height={{ defaultValue: item?.measure_front_height_cm, error: state.fieldErrors?.measureFrontHeightCm, name: "measureFrontHeightCm" }}
                label="Frente"
                width={{ error: state.fieldErrors?.measureFrontWidthCm, name: "measureFrontWidthCm", onChange: (value) => updateSizeWidth("front", "back", value), value: sizeWidths.front }}
              />
              <MeasurementPair
                height={{ defaultValue: item?.measure_back_height_cm, error: state.fieldErrors?.measureBackHeightCm, name: "measureBackHeightCm" }}
                label="Costas"
                width={{ error: state.fieldErrors?.measureBackWidthCm, name: "measureBackWidthCm", onChange: (value) => updateSizeWidth("back", "front", value), value: sizeWidths.back }}
              />
              <MeasurementPair
                height={{ defaultValue: item?.measure_short_sleeve_height_cm, error: state.fieldErrors?.measureShortSleeveHeightCm, name: "measureShortSleeveHeightCm" }}
                label="Manga curta"
                width={{ error: state.fieldErrors?.measureShortSleeveWidthCm, name: "measureShortSleeveWidthCm", onChange: (value) => updateSizeWidth("shortSleeve", "longSleeve", value), value: sizeWidths.shortSleeve }}
              />
              <MeasurementPair
                height={{ defaultValue: item?.measure_long_sleeve_height_cm, error: state.fieldErrors?.measureLongSleeveHeightCm, name: "measureLongSleeveHeightCm" }}
                label="Manga longa"
                width={{ error: state.fieldErrors?.measureLongSleeveWidthCm, name: "measureLongSleeveWidthCm", onChange: (value) => updateSizeWidth("longSleeve", "shortSleeve", value), value: sizeWidths.longSleeve }}
              />
            </div>
          </fieldset>
        ) : null}

        {isFabric ? (
          <fieldset className="catalog-form__fabric-settings">
            <legend>Configuração de corte</legend>
            <div>
              <div className="field">
                <label htmlFor="catalog-fabric-width">Largura</label>
                <div className="catalog-form__unit-input">
                  <input aria-invalid={Boolean(state.fieldErrors?.fabricWidthCm)} defaultValue={item?.fabric_width_cm ?? ""} id="catalog-fabric-width" inputMode="decimal" min="0.1" name="fabricWidthCm" step="0.1" type="number" />
                  <span>cm</span>
                </div>
                {state.fieldErrors?.fabricWidthCm ? <small className="field-error">{state.fieldErrors.fabricWidthCm}</small> : null}
              </div>
              <div className="field">
                <label htmlFor="catalog-fabric-type">Tipo</label>
                <select aria-invalid={Boolean(state.fieldErrors?.fabricType)} defaultValue={item?.fabric_type ?? ""} id="catalog-fabric-type" name="fabricType">
                  <option disabled value="">Selecione</option>
                  <option value="PLANO">Plano</option>
                  <option value="TUBULAR">Tubular</option>
                </select>
                {state.fieldErrors?.fabricType ? <small className="field-error">{state.fieldErrors.fabricType}</small> : null}
              </div>
            </div>
          </fieldset>
        ) : null}

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

type MeasurementFieldProps = {
  defaultValue?: number | null;
  error?: string;
  name: string;
  onChange?: (value: string) => void;
  value?: string;
};

function MeasurementPair({ height, label, width }: { height: MeasurementFieldProps; label: string; width: MeasurementFieldProps }) {
  return <section className="catalog-form__measurement-pair">
    <h3>{label}</h3>
    <div>
      <MeasurementField {...width} label="Largura" />
      <MeasurementField {...height} label="Altura" />
    </div>
  </section>;
}

function MeasurementField({ defaultValue, error, label, name, onChange, value }: MeasurementFieldProps & { label: string }) {
  return <div className="field">
    <label htmlFor={`catalog-${name}`}>{label}</label>
    <div className="catalog-form__unit-input">
      <input
        aria-invalid={Boolean(error)}
        defaultValue={value === undefined ? defaultValue ?? "" : undefined}
        id={`catalog-${name}`}
        inputMode="decimal"
        min="0.1"
        name={name}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        step="0.1"
        type="number"
        value={value}
      />
      <span>cm</span>
    </div>
    {error ? <small className="field-error">{error}</small> : null}
  </div>;
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
