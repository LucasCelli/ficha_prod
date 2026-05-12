"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  dialogContentMotion,
  dialogOverlayMotion,
  motionTransition,
  transitionForReducedMotion,
} from "./motion-presets";

type AlertDialogProps = {
  children: ReactNode;
  description: string;
  onClose: () => void;
  size?: "sm" | "md";
  title: string;
};

export function AlertDialog({ children, description, onClose, size = "sm", title }: AlertDialogProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  return (
    <AlertDialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) setVisible(false);
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AnimatePresence initial={false} onExitComplete={onClose}>
          {visible ? (
            <>
              <AlertDialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  animate="visible"
                  className="modal-overlay"
                  exit="exit"
                  initial={reduceMotion ? false : "hidden"}
                  transition={transitionForReducedMotion(reduceMotion, motionTransition.fast)}
                  variants={dialogOverlayMotion}
                />
              </AlertDialogPrimitive.Overlay>
              <AlertDialogPrimitive.Content asChild forceMount>
                <motion.div
                  animate="visible"
                  className={`modal-content modal-content--${size}`}
                  exit="exit"
                  initial={reduceMotion ? false : "hidden"}
                  transition={transitionForReducedMotion(reduceMotion, motionTransition.normal)}
                  variants={dialogContentMotion}
                >
                  <AlertDialogPrimitive.Cancel asChild>
                    <button className="modal-close" aria-label="Fechar" type="button">
                      <X aria-hidden="true" size={20} />
                    </button>
                  </AlertDialogPrimitive.Cancel>
                  <AlertDialogPrimitive.Title className="sr-only">{title}</AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="sr-only">{description}</AlertDialogPrimitive.Description>
                  {children}
                </motion.div>
              </AlertDialogPrimitive.Content>
            </>
          ) : null}
        </AnimatePresence>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
