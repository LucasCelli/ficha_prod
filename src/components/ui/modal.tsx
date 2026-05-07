"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

type ModalProps = {
  children: ReactNode;
  onClose?: () => void;
  onCloseHref?: string;
  size?: "sm" | "md" | "lg" | "print";
  title?: string;
};

export function Modal({ children, onClose, onCloseHref, size = "md", title }: ModalProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

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
        <Dialog.Overlay asChild>
          <motion.div
            className="modal-overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className={`modal-content modal-content--${size}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98, x: "-50%", y: "-48%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
          <Dialog.Close asChild>
            <button className="modal-close" aria-label="Fechar" type="button">
              <X aria-hidden="true" size={20} />
            </button>
          </Dialog.Close>
          {title ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : null}
          {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
