"use client";

import { Plus, Save } from "lucide-react";
import { useActionState, useEffect, useState, type FormEventHandler } from "react";
import { useFormStatus } from "react-dom";
import { Button, Combobox, Modal, type ComboboxOption } from "@/components/ui";
import { createClienteInlineAction } from "@/features/clientes/actions";
import { getInitialClienteInlineFormState } from "@/features/clientes/form-state";
import { forceUppercaseInput } from "@/lib/name-normalizer";

type ClientePickerProps = {
  describedBy?: string;
  initialLabel?: string;
  invalid?: boolean;
  options: ComboboxOption[];
  value: string | null;
};

export function ClientePicker({ describedBy, initialLabel = "", invalid, options: initialOptions, value: initialValue }: ClientePickerProps) {
  const [options, setOptions] = useState(initialOptions);
  const [value, setValue] = useState<string | null>(initialValue);
  const [label, setLabel] = useState(initialLabel);
  const [creating, setCreating] = useState(false);

  function select(nextValue: string | null, option?: ComboboxOption) {
    setValue(nextValue);
    if (option) setLabel(option.label);
  }

  return (
    <div className="cliente-picker">
      <input name="cliente" type="hidden" value={label} />
      <Combobox aria-describedby={describedBy} aria-invalid={invalid} id="cliente" name="clienteId" onInputValueChange={setLabel} onValueChange={select} options={options} placeholder="Buscar cliente…" value={value} />
      <Button className="cliente-picker__new" onClick={() => setCreating(true)} variant="secondary"><Plus aria-hidden="true" size={17} /> Novo Cliente</Button>
      {creating ? <NovoClienteModal onCancel={() => setCreating(false)} onCreated={(cliente) => {
        const option = { description: cliente.empresa ?? undefined, label: cliente.nome, value: cliente.id };
        setOptions((current) => [...current.filter((item) => item.value !== cliente.id), option]);
        select(cliente.id, option);
        setCreating(false);
      }} /> : null}
    </div>
  );
}

function NovoClienteModal({ onCancel, onCreated }: { onCancel: () => void; onCreated: (cliente: { empresa: string | null; id: string; nome: string }) => void }) {
  const [state, action] = useActionState(createClienteInlineAction, getInitialClienteInlineFormState());
  useEffect(() => { if (state.status === "success" && state.cliente) onCreated(state.cliente); }, [onCreated, state]);

  return (
    <Modal description="Cadastre o cliente e retorne à ficha." onClose={onCancel} size="sm" title="Novo cliente">
      <form
        action={action}
        className="cliente-inline-form"
        noValidate
        onSubmit={(event) => event.stopPropagation()}
      >
        <header><h2>Novo cliente</h2></header>
        {state.message ? <div className="form-banner" role="alert">{state.message}</div> : null}
        <InlineField error={state.fieldErrors?.nome} label="Nome" name="nome" onInput={forceUppercaseInput} required />
        <InlineField error={state.fieldErrors?.empresa} label="Empresa/Instituição" name="empresa" />
        <InlineField error={state.fieldErrors?.telefone} label="Telefone" name="telefone" type="tel" />
        <InlineField error={state.fieldErrors?.email} label="E-mail" name="email" type="email" />
        <div className="form-actions"><Button onClick={onCancel} variant="ghost">Cancelar</Button><SaveClienteButton /></div>
      </form>
    </Modal>
  );
}

function InlineField({ error, label, name, onInput, required = false, type = "text" }: { error?: string; label: string; name: string; onInput?: FormEventHandler<HTMLInputElement>; required?: boolean; type?: string }) {
  return <div className="field"><label htmlFor={`novo-cliente-${name}`}>{label}{required ? " *" : ""}</label><input aria-describedby={error ? `novo-cliente-${name}-error` : undefined} aria-invalid={Boolean(error)} id={`novo-cliente-${name}`} name={name} onInput={onInput} type={type} />{error ? <p className="field-error" id={`novo-cliente-${name}-error`}>{error}</p> : null}</div>;
}

function SaveClienteButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={17} />}{pending ? "Salvando…" : "Salvar cliente"}</Button>;
}
