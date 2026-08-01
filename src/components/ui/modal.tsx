"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";
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

  const closedRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);

  const closeModal = useCallback(() => {
    // A saida pode ser disparada pelo onExitComplete ou pelo fallback abaixo.
    // Sem esta guarda, fechar duas vezes empilharia navegacoes.
    if (closedRef.current) return;
    closedRef.current = true;

    if (fallbackRef.current !== null) {
      window.clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }

    if (onClose) {
      onClose();
      return;
    }

    if (onCloseHref) {
      router.replace(onCloseHref, { scroll: false });
    }
  }, [onClose, onCloseHref, router]);

  const requestClose = useCallback(() => {
    setVisible(false);

    // `onExitComplete` nao dispara de forma confiavel quando a saida interrompe
    // a animacao de entrada, e a URL ficava presa em ?modal=novo. A navegacao
    // nao pode depender de um callback de animacao.
    if (fallbackRef.current === null) {
      fallbackRef.current = window.setTimeout(closeModal, 400);
    }
  }, [closeModal]);

  useEffect(
    () => () => {
      if (fallbackRef.current !== null) window.clearTimeout(fallbackRef.current);
    },
    [],
  );

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
                    <IconButton appearance="bare" className="modal-close" label="Fechar" tooltip={false}>
                      <X aria-hidden="true" size={20} />
                    </IconButton>
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
