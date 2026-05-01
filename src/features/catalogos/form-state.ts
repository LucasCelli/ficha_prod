export type CatalogoFieldErrors = Partial<Record<"aliases" | "composition" | "description" | "kind" | "name" | "sortOrder", string>>;

export type CatalogoFormState = {
  fieldErrors?: CatalogoFieldErrors;
  message?: string;
  status: "idle" | "error" | "success";
};

export function getInitialCatalogoFormState(): CatalogoFormState {
  return {
    status: "idle",
  };
}
