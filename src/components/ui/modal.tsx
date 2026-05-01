"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type ModalProps = {
  children: ReactNode;
  onClose?: () => void;
  onCloseHref?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
};

export function Modal({ children, onClose, onCloseHref, size = "md", title }: ModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    if (onCloseHref) {
      router.push(onCloseHref);
    }
  }, [onClose, onCloseHref, router]);

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        return;
      }

      if (e.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => {
      const firstFocusable =
        dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [closeModal]);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div
        className={`modal-content modal-content--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        ref={dialogRef}
      >
        <button
          className="modal-close"
          onClick={closeModal}
          aria-label="Fechar"
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>
        {title && <h2 id="modal-title" className="sr-only">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
