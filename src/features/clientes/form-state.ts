export type ClienteFieldErrors = Partial<
  Record<
    | "email"
    | "nome"
    | "telefone",
    string
  >
>;

export type ClienteFormState = {
  fieldErrors?: ClienteFieldErrors;
  message?: string;
  status: "idle" | "error";
};

export type ClienteDeleteActionState = {
  message?: string;
  status: "idle" | "error";
};

export function getInitialClienteFormState(): ClienteFormState {
  return {
    status: "idle",
  };
}

export function getInitialClienteDeleteActionState(): ClienteDeleteActionState {
  return {
    status: "idle",
  };
}
