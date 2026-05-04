"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import type { ClienteDetail } from "./data";
import { createClienteAction, updateClienteAction } from "./actions";
import { getInitialClienteFormState } from "./form-state";

type ClienteFormProps = {
  cliente?: ClienteDetail;
  mode?: "create" | "edit";
};

export function ClienteForm({ cliente, mode = "create" }: ClienteFormProps) {
  const action = mode === "edit" ? updateClienteAction : createClienteAction;
  const [state, formAction] = useActionState(action, getInitialClienteFormState());
  const formRef = useRef<HTMLFormElement>(null);
  const lastToastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.status !== "error") return;

    if (state.message && lastToastMessageRef.current !== state.message) {
      const message = state.message;
      window.setTimeout(() => {
        toast.error("Pendência no cliente", {
          description: message,
          id: "cliente-form-error",
        });
      }, 0);
      lastToastMessageRef.current = message;
    }

    const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    firstInvalid?.focus();
  }, [state]);

  return (
    <form ref={formRef} className="cliente-form" action={formAction} noValidate>
      {cliente ? <input name="id" type="hidden" value={cliente.id} /> : null}
      {state.message ? (
        <div className="form-banner" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="form-grid">
        <Field label="Nome" name="nome" error={state.fieldErrors?.nome} required>
          <input
            id="nome"
            name="nome"
            aria-describedby={state.fieldErrors?.nome ? "nome-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.nome)}
            autoComplete="organization"
            defaultValue={cliente?.nome}
            placeholder="Nome do cliente…"
          />
        </Field>

        <Field label="Telefone" name="telefone" error={state.fieldErrors?.telefone}>
          <input
            id="telefone"
            name="telefone"
            aria-describedby={state.fieldErrors?.telefone ? "telefone-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.telefone)}
            autoComplete="tel"
            defaultValue={cliente?.telefone ?? undefined}
            inputMode="tel"
            placeholder="(00) 00000-0000…"
          />
        </Field>

        <Field label="E-mail" name="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            autoComplete="email"
            defaultValue={cliente?.email ?? undefined}
            inputMode="email"
            placeholder="cliente@empresa.com…"
            spellCheck={false}
            type="email"
          />
        </Field>
      </div>

      <div className="form-actions">
        <SubmitButton label={mode === "edit" ? "Salvar alterações" : "Salvar cliente"} />
      </div>
    </form>
  );
}

type FieldProps = {
  children: React.ReactNode;
  error?: string;
  label: string;
  name: string;
  required?: boolean;
};

function Field({ children, error, label, name, required = false }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {label}
    </Button>
  );
}
