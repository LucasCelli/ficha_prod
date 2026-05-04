"use client";

import type { FormEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { saveOperadorAction } from "./actions";
import { getInitialUsuarioFormState } from "./form-state";
import type { Operador } from "./types";

type UsuarioFormProps = {
  operador?: Operador;
};

export function UsuarioForm({ operador }: UsuarioFormProps) {
  const [state, formAction] = useActionState(saveOperadorAction, getInitialUsuarioFormState());
  const [showPin, setShowPin] = useState(false);
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastToastRef.current === state.message) return;

    const title = state.status === "success" ? "Operador salvo" : "Pendência no operador";
    const description = state.message === title ? undefined : state.message;
    const toastFn = state.status === "success" ? toast.success : toast.error;
    toastFn(title, { description });
    lastToastRef.current = state.message;
  }, [state]);

  function handlePinInput(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const digitsOnly = input.value.replace(/\D/g, "");
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
  }

  return (
    <form action={formAction} className="usuario-form">
      {operador ? <input name="id" type="hidden" value={operador.id} /> : null}

      <div className="usuario-form__grid">
        <div className="field">
          <label htmlFor="operator-display-name">Nome</label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.displayName)}
            autoComplete="name"
            defaultValue={operador?.display_name}
            id="operator-display-name"
            name="displayName"
            placeholder="Nome da pessoa"
          />
          {state.fieldErrors?.displayName ? <small className="field-error">{state.fieldErrors.displayName}</small> : null}
        </div>

        <div className="field">
          <label htmlFor="operator-username">Usuário</label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.username)}
            autoComplete="username"
            defaultValue={operador?.username}
            id="operator-username"
            name="username"
            placeholder="usuario"
          />
          {state.fieldErrors?.username ? <small className="field-error">{state.fieldErrors.username}</small> : null}
        </div>

        <div className="field">
          <label htmlFor="operator-pin">{operador ? "Novo PIN" : "PIN inicial"}</label>
          <div className="pin-input">
            <input
              aria-describedby="operator-pin-hint"
              aria-invalid={Boolean(state.fieldErrors?.pin)}
              autoComplete="new-password"
              id="operator-pin"
              inputMode="numeric"
              name="pin"
              onInput={handlePinInput}
              pattern="[0-9]*"
              placeholder={operador ? "Manter atual" : "Mínimo 4 dígitos"}
              type={showPin ? "text" : "password"}
            />
            <button
              aria-label={showPin ? "Ocultar PIN digitado" : "Mostrar PIN digitado"}
              className="pin-input__toggle"
              onClick={() => setShowPin((value) => !value)}
              type="button"
            >
              {showPin ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </div>
          {state.fieldErrors?.pin ? <small className="field-error">{state.fieldErrors.pin}</small> : null}
          <small className="field-hint" id="operator-pin-hint">
            {operador ? "Preencha somente para trocar o PIN." : "O PIN não fica visível depois de salvo."}
          </small>
        </div>
      </div>

      <label className="checkbox-field usuario-form__status">
        <input defaultChecked={operador?.active ?? true} name="active" type="checkbox" />
        <span>Operador ativo</span>
      </label>

      <div className="usuario-form__actions">
        <Button type="submit">
          <Save aria-hidden="true" size={18} />
          {operador ? "Salvar alterações" : "Cadastrar operador"}
        </Button>
        {operador ? (
          <Link className="ui-button ui-button--secondary" href="/usuarios">
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
