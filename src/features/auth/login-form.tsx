"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui";
import { loginAction } from "./actions";
import type { LoginFormState } from "./form-state";

type LoginFormProps = {
  next?: string;
};

const initialState: LoginFormState = {
  status: "idle",
};

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="auth-form" noValidate>
      <input name="next" type="hidden" value={next ?? "/"} />
      <div className="field">
        <label htmlFor="username">Usuario</label>
        <input
          aria-describedby={state.fieldErrors?.username ? "username-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.username)}
          autoComplete="username"
          autoFocus
          id="username"
          name="username"
          required
          type="text"
        />
        {state.fieldErrors?.username ? (
          <p className="field-error" id="username-error">
            {state.fieldErrors.username}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="pin">PIN</label>
        <input
          aria-describedby={state.fieldErrors?.pin ? "pin-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.pin)}
          autoComplete="current-password"
          id="pin"
          inputMode="numeric"
          name="pin"
          required
          type="password"
        />
        {state.fieldErrors?.pin ? (
          <p className="field-error" id="pin-error">
            {state.fieldErrors.pin}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <p className="auth-message" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button disabled={isPending} type="submit">
        {isPending ? <span className="button-spinner" aria-hidden="true" /> : <LogIn aria-hidden="true" size={18} />}
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
