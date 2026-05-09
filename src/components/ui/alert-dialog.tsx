"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type AlertDialogProps = {
  children: ReactNode;
  description: string;
  onClose: () => void;
  size?: "sm" | "md";
  title: string;
};

export function AlertDialog({ children, description, onClose, size = "sm", title }: AlertDialogProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AlertDialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay asChild>
          <motion.div
            className="modal-overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
          />
        </AlertDialogPrimitive.Overlay>
        <AlertDialogPrimitive.Content asChild>
          <motion.div
            className={`modal-content modal-content--${size}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98, x: "-50%", y: "-48%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
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
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
