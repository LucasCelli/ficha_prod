export type ToastType = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  duration?: number;
  id?: string;
  message: string;
  title?: string;
  type?: ToastType;
};

export const toastEventName = "ficha:toast";

export function notify(options: ToastOptions) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastOptions>(toastEventName, {
      detail: options,
    }),
  );
}

export const toast = {
  error(message: string, options: Omit<ToastOptions, "message" | "type"> = {}) {
    notify({ ...options, message, type: "error" });
  },
  info(message: string, options: Omit<ToastOptions, "message" | "type"> = {}) {
    notify({ ...options, message, type: "info" });
  },
  success(message: string, options: Omit<ToastOptions, "message" | "type"> = {}) {
    notify({ ...options, message, type: "success" });
  },
  warning(message: string, options: Omit<ToastOptions, "message" | "type"> = {}) {
    notify({ ...options, message, type: "warning" });
  },
};
