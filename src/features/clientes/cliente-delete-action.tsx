"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, Tooltip } from "@/components/ui";
import { deleteClienteAction } from "./actions";
import { getInitialClienteDeleteActionState } from "./form-state";

type ClienteDeleteActionProps = {
  clienteId: string;
  clienteNome: string;
  editHref?: string;
  returnTo: string;
  variant?: "inline" | "header";
  viewFichasHref?: string;
};

export function ClienteDeleteAction({
  clienteId,
  clienteNome,
  editHref,
  returnTo,
  variant = "inline",
  viewFichasHref,
}: ClienteDeleteActionProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteClienteAction, getInitialClienteDeleteActionState());

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error("Não foi possível excluir", {
        description: state.message,
      });
    }
  }, [state.message, state.status]);

  return (
    <>
      {variant === "header" ? (
        <>
          {viewFichasHref ? (
            <Link className="ui-button ui-button--secondary" href={viewFichasHref}>
              Ver fichas
            </Link>
          ) : null}
          {editHref ? (
            <Link className="ui-button ui-button--primary" href={editHref}>
              Editar cliente
            </Link>
          ) : null}
          <button className="ui-button ui-button--danger" onClick={() => setOpen(true)} type="button">
            <Trash2 aria-hidden="true" size={16} />
            Excluir cliente
          </button>
        </>
      ) : (
        <span className="cliente-row-actions">
          {viewFichasHref ? (
            <Link className="ui-table__link" href={viewFichasHref}>
              Ver fichas
            </Link>
          ) : null}
          {editHref ? (
            <Link className="ui-table__link" href={editHref}>
              Editar
            </Link>
          ) : null}
          <Tooltip label="Excluir cliente">
            <button
              aria-label={`Excluir cliente ${clienteNome}`}
              className="icon-action icon-action--danger"
              onClick={() => setOpen(true)}
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          </Tooltip>
        </span>
      )}

      {open ? (
        <DeleteClienteDialog
          clienteId={clienteId}
          clienteNome={clienteNome}
          formAction={formAction}
          onClose={() => setOpen(false)}
          returnTo={returnTo}
        />
      ) : null}
    </>
  );
}

type DeleteClienteDialogProps = {
  clienteId: string;
  clienteNome: string;
  formAction: (payload: FormData) => void;
  onClose: () => void;
  returnTo: string;
};

function DeleteClienteDialog({ clienteId, clienteNome, formAction, onClose, returnTo }: DeleteClienteDialogProps) {
  return (
    <AlertDialog
      description={`O cadastro de ${clienteNome} será removido. Fichas existentes mantêm o nome registrado.`}
      onClose={onClose}
      size="sm"
      title="Excluir cliente"
    >
      <section className="confirm-dialog" aria-describedby="delete-cliente-description">
        <header className="confirm-dialog__header">
          <div>
            <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
            <h2>Excluir cliente</h2>
          </div>
        </header>

        <p id="delete-cliente-description">
          O cadastro de <strong>{clienteNome}</strong> será removido. Fichas existentes mantêm o nome registrado.
        </p>

        <form action={formAction} className="confirm-dialog__form">
          <input name="id" type="hidden" value={clienteId} />
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
      {pending ? "Excluindo..." : "Excluir cliente"}
    </button>
  );
}
