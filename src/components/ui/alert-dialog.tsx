"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type AlertDialogProps = {
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md";
  title: string;
};

export function AlertDialog({ children, onClose, size = "sm", title }: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="modal-overlay" />
        <AlertDialogPrimitive.Content className={`modal-content modal-content--${size}`}>
          <AlertDialogPrimitive.Cancel asChild>
            <button className="modal-close" aria-label="Fechar" type="button">
              <X aria-hidden="true" size={20} />
            </button>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Title className="sr-only">{title}</AlertDialogPrimitive.Title>
          {children}
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
