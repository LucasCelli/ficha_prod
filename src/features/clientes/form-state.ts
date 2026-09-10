export type ClienteFieldErrors = Partial<
  Record<
    | "email"
    | "empresa"
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

export type ClienteInlineResult = {
  empresa: string | null;
  id: string;
  nome: string;
};

export type ClienteInlineFormState = {
  cliente?: ClienteInlineResult;
  fieldErrors?: ClienteFieldErrors;
  message?: string;
  status: "idle" | "error" | "success";
};

export function getInitialClienteInlineFormState(): ClienteInlineFormState {
  return { status: "idle" };
}

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
