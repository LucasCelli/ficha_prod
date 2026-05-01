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

export function getInitialClienteFormState(): ClienteFormState {
  return {
    status: "idle",
  };
}
