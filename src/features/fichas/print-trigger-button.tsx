"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

const FRAME_CLEANUP_MS = 60_000;
const PRINT_JOB_SIGNAL = "ficha:print-dialog-opened";
const PRINT_SIGNAL_TIMEOUT_MS = 45_000;

type PrintTriggerButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  href: string;
  label: string;
};

export function PrintTriggerButton({ children, className, disabled, href, label, onClick, type = "button", ...props }: PrintTriggerButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const isDisabled = disabled || isPrinting;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented || isDisabled) {
      return;
    }

    const separator = href.includes("?") ? "&" : "?";
    const frame = document.createElement("iframe");
    const printJobId = `print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toastId = `${href}:print`;
    let cleanupJob: (() => void) | null = null;

    setIsPrinting(true);
    frame.className = "print-trigger-frame";
    frame.title = label;
    frame.setAttribute("aria-hidden", "true");

    toast.loading("Preparando impressão", {
      description: "Carregando a ficha para impressão.",
      duration: Infinity,
      id: toastId,
    });

    function finish(ready = false) {
      toast.dismiss(toastId);
      setIsPrinting(false);
      cleanupJob?.();
      cleanupJob = null;

      if (ready) {
        toast.success("Impressão pronta", {
          description: "A janela de impressão foi aberta.",
        });
      }
    }

    cleanupJob = watchPrintSignal(printJobId, finish);

    frame.onload = () => {
      window.setTimeout(() => frame.remove(), FRAME_CLEANUP_MS);
    };

    frame.onerror = () => {
      finish();
      frame.remove();
      toast.error("Falha ao imprimir", {
        description: "Não foi possível abrir a impressão desta ficha.",
      });
    };

    document.body.appendChild(frame);
    frame.src = `${href}${separator}_print=${Date.now()}&_printJob=${encodeURIComponent(printJobId)}`;
  }

  return (
    <button
      aria-disabled={isDisabled}
      aria-label={label}
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function watchPrintSignal(printJobId: string, onReady: (ready?: boolean) => void) {
  const timeoutId = window.setTimeout(() => {
    onReady(false);
  }, PRINT_SIGNAL_TIMEOUT_MS);

  function handleMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type !== PRINT_JOB_SIGNAL || data.printJobId !== printJobId) {
      return;
    }

    onReady(true);
  }

  window.addEventListener("message", handleMessage);

  return () => {
    window.clearTimeout(timeoutId);
    window.removeEventListener("message", handleMessage);
  };
}
