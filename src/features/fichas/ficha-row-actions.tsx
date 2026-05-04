"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Eye, MoreHorizontal, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, FloatingMenu, FloatingMenuButton, FloatingMenuLink, Tooltip } from "@/components/ui";
import { deleteFichaAction, markFichaEntregueFormAction } from "./actions";
import type { FichaStatus } from "./data";
import { getInitialFichaDeleteActionState } from "./form-state";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaRowActionsProps = {
  fichaId: string;
  fichaLabel: string;
  fullDeliverButton?: boolean;
  printHref: string;
  previewHref: string;
  returnTo: string;
  status: FichaStatus;
};

function createConfirmationCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function FichaRowActions({
  fichaId,
  fichaLabel,
  fullDeliverButton = false,
  previewHref,
  printHref,
  returnTo,
  status,
}: FichaRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState(() => createConfirmationCode());
  const [deleteState, deleteFormAction] = useActionState(deleteFichaAction, getInitialFichaDeleteActionState());
  const editHref = `/fichas/${fichaId}`;

  useEffect(() => {
    if (deleteState.status === "error" && deleteState.message) {
      toast.error("Não foi possível excluir", {
        description: deleteState.message,
      });
    }
  }, [deleteState.message, deleteState.status]);

  function openDeleteModal() {
    setConfirmationCode(createConfirmationCode());
    setDeleteOpen(true);
  }

  if (fullDeliverButton) {
    return (
      <>
        <div className="ficha-row-actions ficha-row-actions--deliver-only" aria-label={`Ações da ficha ${fichaLabel}`}>
        <form action={markFichaEntregueFormAction} className="ficha-row-actions__deliver-form">
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <FullDeliverSubmitButton fichaLabel={fichaLabel} />
        </form>
          <FloatingMenu label={`Mais ações da ficha ${fichaLabel}`} trigger={<MoreHorizontal aria-hidden="true" size={18} />}>
            <FloatingMenuLink href={previewHref} prefetch={false} scroll={false}>
              <Eye aria-hidden="true" size={16} />
              Prévia de impressão
            </FloatingMenuLink>
            <PrintTriggerButton className="floating-menu__item" href={printHref} label={`Imprimir ficha ${fichaLabel}`} role="menuitem">
              <Printer aria-hidden="true" size={16} />
              Imprimir
            </PrintTriggerButton>
            <FloatingMenuLink href={editHref}>
              <Pencil aria-hidden="true" size={16} />
              Editar
            </FloatingMenuLink>
            <FloatingMenuButton danger onClick={openDeleteModal}>
              <Trash2 aria-hidden="true" size={16} />
              Deletar
            </FloatingMenuButton>
          </FloatingMenu>
        </div>

        {deleteOpen ? (
          <DeleteFichaDialog
            confirmationCode={confirmationCode}
            fichaId={fichaId}
            fichaLabel={fichaLabel}
            formAction={deleteFormAction}
            onClose={() => setDeleteOpen(false)}
            returnTo={returnTo}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="ficha-row-actions" aria-label={`Ações da ficha ${fichaLabel}`}>
        <Tooltip label="Prévia de impressão">
          <Link aria-label={`Abrir prévia de impressão da ficha ${fichaLabel}`} className="icon-action" href={previewHref} prefetch={false} scroll={false}>
            <Eye aria-hidden="true" size={17} />
          </Link>
        </Tooltip>

        <Tooltip label="Imprimir ficha">
          <PrintTriggerButton className="icon-action" href={printHref} label={`Imprimir ficha ${fichaLabel}`}>
            <Printer aria-hidden="true" size={17} />
          </PrintTriggerButton>
        </Tooltip>

        <Tooltip label="Editar ficha">
          <Link aria-label={`Editar ficha ${fichaLabel}`} className="icon-action" href={editHref}>
            <Pencil aria-hidden="true" size={17} />
          </Link>
        </Tooltip>

        <form action={markFichaEntregueFormAction}>
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <Tooltip label={status === "pendente" ? "Marcar como entregue" : "Ficha já entregue"}>
            <button
              aria-label={`Marcar ficha ${fichaLabel} como entregue`}
              className="icon-action icon-action--success"
              disabled={status !== "pendente"}
              type="submit"
            >
              <CheckCircle2 aria-hidden="true" size={17} />
            </button>
          </Tooltip>
        </form>

        <FloatingMenu label={`Mais ações da ficha ${fichaLabel}`} trigger={<MoreHorizontal aria-hidden="true" size={18} />}>
          <FloatingMenuLink href={previewHref} prefetch={false} scroll={false}>
            <Eye aria-hidden="true" size={16} />
            Prévia de impressão
          </FloatingMenuLink>
          <PrintTriggerButton className="floating-menu__item" href={printHref} label={`Imprimir ficha ${fichaLabel}`} role="menuitem">
            <Printer aria-hidden="true" size={16} />
            Imprimir
          </PrintTriggerButton>
          <FloatingMenuLink href={editHref}>
            <Pencil aria-hidden="true" size={16} />
            Editar
          </FloatingMenuLink>
          <FloatingMenuButton danger onClick={openDeleteModal}>
            <Trash2 aria-hidden="true" size={16} />
            Deletar
          </FloatingMenuButton>
        </FloatingMenu>
      </div>

      {deleteOpen ? (
        <DeleteFichaDialog
          confirmationCode={confirmationCode}
          fichaId={fichaId}
          fichaLabel={fichaLabel}
          formAction={deleteFormAction}
          onClose={() => setDeleteOpen(false)}
          returnTo={returnTo}
        />
      ) : null}
    </>
  );
}

type DeleteFichaDialogProps = {
  confirmationCode: string;
  fichaId: string;
  fichaLabel: string;
  formAction: (payload: FormData) => void;
  onClose: () => void;
  returnTo: string;
};

function DeleteFichaDialog({
  confirmationCode,
  fichaId,
  fichaLabel,
  formAction,
  onClose,
  returnTo,
}: DeleteFichaDialogProps) {
  const [typedCode, setTypedCode] = useState("");
  const canDelete = useMemo(() => typedCode.trim().toUpperCase() === confirmationCode, [confirmationCode, typedCode]);

  return (
    <AlertDialog onClose={onClose} size="sm" title="Remover ficha">
      <section className="confirm-dialog" aria-describedby="delete-ficha-description">
        <header className="confirm-dialog__header">
          <div>
            <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
            <h2 id="delete-ficha-title">Remover ficha</h2>
          </div>
        </header>

        <p id="delete-ficha-description">
          Esta ação remove a ficha de <strong>{fichaLabel}</strong> e seus itens vinculados. Digite o código para confirmar.
        </p>

        <form action={formAction} className="confirm-dialog__form">
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <input name="confirmationCode" type="hidden" value={confirmationCode} />

          <div className="confirm-dialog__code" aria-label="Código de confirmação">
            {confirmationCode}
          </div>

          <label className="field" htmlFor={`delete-${fichaId}`}>
            <span>Código de confirmação</span>
            <input
              autoComplete="off"
              data-autofocus
              id={`delete-${fichaId}`}
              inputMode="text"
              maxLength={4}
              name="confirmationInput"
              onChange={(event) => setTypedCode(event.target.value)}
              placeholder="Digite o código..."
              value={typedCode}
            />
          </label>

          <div className="confirm-dialog__actions">
            <button className="ui-button ui-button--ghost" onClick={onClose} type="button">
              Cancelar
            </button>
            <DeleteSubmitButton disabled={!canDelete} />
          </div>
        </form>
      </section>
    </AlertDialog>
  );
}

function DeleteSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button aria-disabled={isDisabled} className="ui-button ui-button--danger" disabled={isDisabled} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Trash2 aria-hidden="true" size={16} />}
      Remover ficha
    </button>
  );
}

function FullDeliverSubmitButton({ fichaLabel }: { fichaLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={`Marcar ficha ${fichaLabel} como entregue`}
      className="ficha-row-actions__deliver-button"
      disabled={pending}
      type="submit"
    >
      {pending ? <span className="button-spinner button-spinner--contrast" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" size={16} />}
      Marcar como entregue
    </button>
  );
}
