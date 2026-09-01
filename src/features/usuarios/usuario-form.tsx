"use client";

import type { FormEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { appUserRoleLabels, appUserRoles } from "@/features/auth/types";
import { saveUsuarioAction } from "./actions";
import { getInitialUsuarioFormState } from "./form-state";
import type { Usuario } from "./types";

type UsuarioFormProps = {
  usuario?: Usuario;
  returnTo?: string;
};

export function UsuarioForm({ usuario, returnTo }: UsuarioFormProps) {
  const [state, formAction] = useActionState(saveUsuarioAction, getInitialUsuarioFormState());
  const [showPin, setShowPin] = useState(false);
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastToastRef.current === state.message) return;

    const title = state.status === "success" ? "Usuário salvo" : "Pendência no usuário";
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
      {usuario ? <input name="id" type="hidden" value={usuario.id} /> : null}
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

      <div className="usuario-form__grid">
        <div className="field">
          <label htmlFor="operator-display-name">Nome</label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.displayName)}
            autoComplete="name"
            defaultValue={usuario?.display_name}
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
            defaultValue={usuario?.username}
            id="operator-username"
            name="username"
            placeholder="usuario"
          />
          {state.fieldErrors?.username ? <small className="field-error">{state.fieldErrors.username}</small> : null}
        </div>

        <div className="field">
          <label htmlFor="operator-role">Função</label>
          <select
            aria-invalid={Boolean(state.fieldErrors?.role)}
            defaultValue={usuario?.role ?? "vendedor"}
            id="operator-role"
            name="role"
          >
            {appUserRoles.map((role) => (
              <option key={role} value={role}>{appUserRoleLabels[role]}</option>
            ))}
          </select>
          {state.fieldErrors?.role ? <small className="field-error">{state.fieldErrors.role}</small> : null}
        </div>

        <div className="field">
          <label htmlFor="operator-pin">{usuario ? "Novo PIN" : "PIN inicial"}</label>
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
              placeholder={usuario ? "Manter atual" : "Mínimo 4 dígitos"}
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
            {usuario ? "Preencha somente para trocar o PIN." : "O PIN não fica visível depois de salvo."}
          </small>
        </div>
        <label className="checkbox-field usuario-form__status">
          <input aria-describedby={state.fieldErrors?.active ? "usuario-active-error" : undefined} defaultChecked={usuario?.active ?? true} name="active" type="checkbox" />
          <span>Usuário ativo</span>
          {state.fieldErrors?.active ? <small className="field-error" id="usuario-active-error">{state.fieldErrors.active}</small> : null}
        </label>
      </div>

      <div className="usuario-form__actions">
        <SubmitButton isEdit={Boolean(usuario)} />
      </div>
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  const idleLabel = isEdit ? "Salvar alterações" : "Cadastrar usuário";
  const pendingLabel = isEdit ? "Salvando alterações..." : "Cadastrando usuário...";

  return (
    <Button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
