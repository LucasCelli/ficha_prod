"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, FloatingMenu, FloatingMenuButton, FloatingMenuLink } from "@/components/ui";
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
    <>
      <FloatingMenu label={`Ações do item ${itemName}`} trigger={<MoreHorizontal aria-hidden="true" size={18} />}>
        <FloatingMenuLink href={editHref}>
          <Pencil aria-hidden="true" size={16} />
          Editar
        </FloatingMenuLink>
        <FloatingMenuButton danger onClick={() => setOpen(true)}>
          <Trash2 aria-hidden="true" size={16} />
          Excluir
        </FloatingMenuButton>
      </FloatingMenu>

      {open ? (
        <DeleteCatalogItemDialog
          formAction={formAction}
          itemId={itemId}
          itemName={itemName}
          onClose={() => setOpen(false)}
          returnTo={returnTo}
        />
      ) : null}
    </>
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
    <AlertDialog onClose={onClose} size="sm" title="Excluir item">
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
