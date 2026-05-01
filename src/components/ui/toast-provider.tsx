"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toastEventName, type ToastOptions, type ToastType } from "@/lib/toast";

type ToastItem = Required<Pick<ToastOptions, "message" | "type">> &
  Omit<ToastOptions, "message" | "type"> & {
    id: string;
  };

type ToastContextValue = {
  dismiss: (id: string) => void;
  show: (options: ToastOptions) => string;
};

type ToastProviderProps = {
  children: ReactNode;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const defaultDuration = 4200;

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeToast(options: ToastOptions): ToastItem {
  return {
    ...options,
    id: options.id ?? createToastId(),
    type: options.type ?? "info",
  };
}

function getToastLabel(type: ToastType) {
  const labels = {
    error: "Erro",
    info: "Informação",
    success: "Sucesso",
    warning: "Atenção",
  };

  return labels[type];
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const toast = normalizeToast(options);

    setToasts((current) => [toast, ...current.filter((item) => item.id !== toast.id)].slice(0, 4));

    return toast.id;
  }, []);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastOptions>;
      show(customEvent.detail);
    }

    window.addEventListener(toastEventName, handleToast);

    return () => window.removeEventListener(toastEventName, handleToast);
  }, [show]);

  useEffect(() => {
    const timers = toasts
      .filter((toast) => toast.duration !== 0)
      .map((toast) =>
        window.setTimeout(() => {
          dismiss(toast.id);
        }, toast.duration ?? defaultDuration),
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismiss, toasts]);

  const value = useMemo(() => ({ dismiss, show }), [dismiss, show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-relevant="additions text" className="toast-region">
        {toasts.map((toast) => (
          <section
            className={`toast toast--${toast.type}`}
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            style={{ "--toast-duration": `${toast.duration ?? defaultDuration}ms` } as React.CSSProperties}
          >
            <div className="toast__marker" aria-hidden="true" />
            <div className="toast__content">
              <p className="toast__title">{toast.title ?? getToastLabel(toast.type)}</p>
              <p className="toast__message">{toast.message}</p>
            </div>
            <button aria-label="Fechar notificação" className="toast__dismiss" onClick={() => dismiss(toast.id)} type="button">
              <X aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
            {toast.duration !== 0 ? <span className="toast__timer" aria-hidden="true" /> : null}
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
