export type UsuarioFieldErrors = {
  active?: string;
  displayName?: string;
  pin?: string;
  username?: string;
};

export type UsuarioFormState = {
  fieldErrors?: UsuarioFieldErrors;
  message?: string;
  status: "idle" | "success" | "error";
};

export function getInitialUsuarioFormState(): UsuarioFormState {
  return {
    status: "idle",
  };
}
