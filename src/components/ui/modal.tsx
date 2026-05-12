"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  dialogContentMotion,
  dialogOverlayMotion,
  motionTransition,
  transitionForReducedMotion,
} from "./motion-presets";

type ModalProps = {
  children: ReactNode;
  description?: string;
  onClose?: () => void;
  onCloseHref?: string;
  size?: "sm" | "md" | "lg" | "print";
  title?: string;
};

export function Modal({ children, description, onClose, onCloseHref, size = "md", title }: ModalProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    if (onCloseHref) {
      router.push(onCloseHref);
    }
  }, [onClose, onCloseHref, router]);

  const requestClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <Dialog.Portal>
        <AnimatePresence initial={false} onExitComplete={closeModal}>
          {visible ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  animate="visible"
                  className="modal-overlay"
                  exit="exit"
                  initial={reduceMotion ? false : "hidden"}
                  transition={transitionForReducedMotion(reduceMotion, motionTransition.fast)}
                  variants={dialogOverlayMotion}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  animate="visible"
                  className={`modal-content modal-content--${size}`}
                  exit="exit"
                  initial={reduceMotion ? false : "hidden"}
                  transition={transitionForReducedMotion(reduceMotion, motionTransition.normal)}
                  variants={dialogContentMotion}
                >
                  <Dialog.Close asChild>
                    <button className="modal-close" aria-label="Fechar" type="button">
                      <X aria-hidden="true" size={20} />
                    </button>
                  </Dialog.Close>
                  {title ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : null}
                  {title ? <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description> : null}
                  {children}
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
