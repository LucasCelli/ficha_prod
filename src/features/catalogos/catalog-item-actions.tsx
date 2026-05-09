"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog } from "@/components/ui";
import { deleteCatalogItemAction } from "./actions";
import { getInitialCatalogoDeleteActionState } from "./form-state";

type CatalogItemActionsProps = {
  editHref: string;
  itemId: string;
  itemName: string;
  returnTo: string;
};

export function CatalogItemActions({ editHref, itemId, itemName, returnTo }: CatalogItemActionsProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteCatalogItemAction, getInitialCatalogoDeleteActionState());

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error("Não foi possível excluir", {
        description: state.message,
      });
    }
  }, [state.message, state.status]);

  return (
    <div className="catalog-item-actions">
      <Link aria-label={`Editar ${itemName}`} className="catalog-item-actions__button" href={editHref}>
        <Pencil aria-hidden="true" size={14} />
      </Link>
      <button aria-label={`Excluir ${itemName}`} className="catalog-item-actions__button catalog-item-actions__button--danger" onClick={() => setOpen(true)} type="button">
        <Trash2 aria-hidden="true" size={14} />
      </button>

      {open ? (
        <DeleteCatalogItemDialog
          formAction={formAction}
          itemId={itemId}
          itemName={itemName}
          onClose={() => setOpen(false)}
          returnTo={returnTo}
        />
      ) : null}
    </div>
  );
}

type DeleteCatalogItemDialogProps = {
  formAction: (payload: FormData) => void;
  itemId: string;
  itemName: string;
  onClose: () => void;
  returnTo: string;
};

function DeleteCatalogItemDialog({ formAction, itemId, itemName, onClose, returnTo }: DeleteCatalogItemDialogProps) {
  return (
    <AlertDialog
      description={`${itemName} será removido do catálogo.`}
      onClose={onClose}
      size="sm"
      title="Excluir item"
    >
      <section className="confirm-dialog" aria-describedby="delete-catalog-item-description">
        <header className="confirm-dialog__header">
          <div>
            <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
            <h2>Excluir item</h2>
          </div>
        </header>

        <p id="delete-catalog-item-description">
          <strong>{itemName}</strong> será removido do catálogo.
        </p>

        <form action={formAction} className="confirm-dialog__form">
          <input name="id" type="hidden" value={itemId} />
          <input name="returnTo" type="hidden" value={returnTo} />

          <div className="confirm-dialog__actions">
            <button className="ui-button ui-button--ghost" onClick={onClose} type="button">
              Cancelar
            </button>
            <DeleteSubmitButton />
          </div>
        </form>
      </section>
    </AlertDialog>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className="ui-button ui-button--danger" disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Trash2 aria-hidden="true" size={16} />}
      {pending ? "Excluindo..." : "Excluir item"}
    </button>
  );
}
