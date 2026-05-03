"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type ModalProps = {
  children: ReactNode;
  onClose?: () => void;
  onCloseHref?: string;
  size?: "sm" | "md" | "lg" | "print";
  title?: string;
};

export function Modal({ children, onClose, onCloseHref, size = "md", title }: ModalProps) {
  const router = useRouter();

  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    if (onCloseHref) {
      router.push(onCloseHref);
    }
  }, [onClose, onCloseHref, router]);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal-content modal-content--${size}`}>
          <Dialog.Close asChild>
            <button className="modal-close" aria-label="Fechar" type="button">
              <X aria-hidden="true" size={20} />
            </button>
          </Dialog.Close>
          {title ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
