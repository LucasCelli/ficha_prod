"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast as sonnerToast } from "sonner";
import { toastEventName, type ToastOptions } from "@/lib/toast";

type ToastContextValue = {
  dismiss: (id: string) => void;
  show: (options: ToastOptions) => string | number;
};

type ToastProviderProps = {
  children: ReactNode;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: ToastProviderProps) {
  const dismiss = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const { type = "info", message, title, duration } = options;

    let toastFn: typeof sonnerToast.success;
    switch (type) {
      case "success":
        toastFn = sonnerToast.success;
        break;
      case "error":
        toastFn = sonnerToast.error;
        break;
      case "warning":
        toastFn = sonnerToast.warning;
        break;
      default:
        toastFn = sonnerToast.info;
    }

    const displayMessage = title ? `${title}: ${message}` : message;

    return toastFn(displayMessage, {
      duration: duration === 0 ? Infinity : (duration ?? 4000),
      id: options.id,
    });
  }, []);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastOptions>;
      show(customEvent.detail);
    }

    window.addEventListener(toastEventName, handleToast);

    return () => window.removeEventListener(toastEventName, handleToast);
  }, [show]);

  const value = useMemo(() => ({ dismiss, show }), [dismiss, show]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
