export type CatalogoFieldErrors = Partial<Record<
  "aliases" | "composition" | "description" | "fabricType" | "fabricWidthCm" | "kind" |
  "measureBackHeightCm" | "measureBackWidthCm" | "measureFrontHeightCm" | "measureFrontWidthCm" |
  "measureLongSleeveHeightCm" | "measureLongSleeveWidthCm" |
  "measureShortSleeveHeightCm" | "measureShortSleeveWidthCm" | "name" | "sortOrder",
  string
>>;

export type CatalogoFormState = {
  fieldErrors?: CatalogoFieldErrors;
  message?: string;
  status: "idle" | "error" | "success";
};

export type CatalogoDeleteActionState = {
  message?: string;
  status: "idle" | "error";
};

export function getInitialCatalogoFormState(): CatalogoFormState {
  return {
    status: "idle",
  };
}

export function getInitialCatalogoDeleteActionState(): CatalogoDeleteActionState {
  return {
    status: "idle",
  };
}
