export type LoginFormState = {
  fieldErrors?: {
    pin?: string;
    username?: string;
  };
  message?: string;
  status: "idle" | "error";
};
