"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ClipboardList, Eye, MoreHorizontal, Pencil, Printer, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, FloatingMenu, FloatingMenuButton, FloatingMenuLink, Tooltip } from "@/components/ui";
import {
  deleteFichaAction,
  markFichaEntregueFormAction,
  removeFichaListaIaAction,
  removeFichaListaNomesRawAction,
  revertFichaToPendenteAction,
} from "./actions";
import type { FichaStatus } from "./data";
import { FichaNameListBadge } from "./ficha-name-list-badge";
import { getInitialFichaDeleteActionState, getInitialFichaStatusActionState } from "./form-state";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaRowActionsProps = {
  fichaId: string;
  fichaLabel: string;
  canOrganizeNameList?: boolean;
  fullDeliverButton?: boolean;
  hasRawNameList?: boolean;
  hasOrganizedNameList?: boolean;
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
  canOrganizeNameList = false,
  fullDeliverButton = false,
  hasRawNameList = false,
  hasOrganizedNameList = false,
  previewHref,
  printHref,
  returnTo,
  status,
}: FichaRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState(() => createConfirmationCode());
  const [deleteState, deleteFormAction] = useActionState(deleteFichaAction, getInitialFichaDeleteActionState());
  const [removeListaIaState, removeListaIaFormAction] = useActionState(removeFichaListaIaAction, getInitialFichaStatusActionState());
  const [removeListaRawState, removeListaRawFormAction] = useActionState(removeFichaListaNomesRawAction, getInitialFichaStatusActionState());
  const [revertState, revertFormAction] = useActionState(revertFichaToPendenteAction, getInitialFichaStatusActionState());
  const editHref = `/fichas/${fichaId}`;
  const organizeNameListHref = `/ferramentas/organizar-nomes-ia?fichaId=${encodeURIComponent(fichaId)}`;

  useEffect(() => {
    if (deleteState.status === "error" && deleteState.message) {
      toast.error("Não foi possível excluir", {
        description: deleteState.message,
      });
    }
  }, [deleteState.message, deleteState.status]);

  useEffect(() => {
    const errorMessage = removeListaIaState.message ?? removeListaRawState.message;
    if ((removeListaIaState.status === "error" || removeListaRawState.status === "error") && errorMessage) {
      toast.error("NÃ£o foi possÃ­vel remover lista", {
        description: errorMessage,
      });
    }
  }, [removeListaIaState.message, removeListaIaState.status, removeListaRawState.message, removeListaRawState.status]);

  useEffect(() => {
    if (revertState.status === "error" && revertState.message) {
      toast.error("Não foi possível reverter", {
        description: revertState.message,
      });
    }
  }, [revertState.message, revertState.status]);

  function openDeleteModal() {
    setConfirmationCode(createConfirmationCode());
    setDeleteOpen(true);
  }

  function openRevertModal() {
    setRevertOpen(true);
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
            {canOrganizeNameList ? (
              <FloatingMenuLink href={organizeNameListHref}>
                <ClipboardList aria-hidden="true" size={16} />
                Organizar Lista de Nomes
              </FloatingMenuLink>
            ) : null}
            {hasRawNameList ? <FichaNameListBadge appearance="menu-item" fichaId={fichaId} labelOverride="Ver lista bruta" tipo="bruta" /> : null}
            <NameListRemoveMenuItems
              fichaId={fichaId}
              hasOrganizedNameList={hasOrganizedNameList}
              hasRawNameList={hasRawNameList}
              removeListaIaFormAction={removeListaIaFormAction}
              removeListaRawFormAction={removeListaRawFormAction}
              returnTo={returnTo}
            />
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

        {status === "entregue" ? (
          <Tooltip label="Reverter para pendente">
            <button
              aria-label={`Reverter ficha ${fichaLabel} para pendente`}
              className="icon-action icon-action--warning"
              onClick={openRevertModal}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={17} />
            </button>
          </Tooltip>
        ) : (
          <form action={markFichaEntregueFormAction}>
            <input name="id" type="hidden" value={fichaId} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <Tooltip label="Marcar como entregue">
              <button
                aria-label={`Marcar ficha ${fichaLabel} como entregue`}
                className="icon-action icon-action--success"
                type="submit"
              >
                <CheckCircle2 aria-hidden="true" size={17} />
              </button>
            </Tooltip>
          </form>
        )}

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
          {canOrganizeNameList ? (
            <FloatingMenuLink href={organizeNameListHref}>
              <ClipboardList aria-hidden="true" size={16} />
              Organizar Lista de Nomes
            </FloatingMenuLink>
          ) : null}
          {hasRawNameList ? <FichaNameListBadge appearance="menu-item" fichaId={fichaId} labelOverride="Ver lista bruta" tipo="bruta" /> : null}
          <NameListRemoveMenuItems
            fichaId={fichaId}
            hasOrganizedNameList={hasOrganizedNameList}
            hasRawNameList={hasRawNameList}
            removeListaIaFormAction={removeListaIaFormAction}
            removeListaRawFormAction={removeListaRawFormAction}
            returnTo={returnTo}
          />
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

      {revertOpen ? (
        <RevertFichaDialog
          fichaId={fichaId}
          fichaLabel={fichaLabel}
          formAction={revertFormAction}
          onClose={() => setRevertOpen(false)}
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

type RevertFichaDialogProps = {
  fichaId: string;
  fichaLabel: string;
  formAction: (payload: FormData) => void;
  onClose: () => void;
  returnTo: string;
};

type NameListRemoveMenuItemsProps = {
  fichaId: string;
  hasOrganizedNameList: boolean;
  hasRawNameList: boolean;
  removeListaIaFormAction: (payload: FormData) => void;
  removeListaRawFormAction: (payload: FormData) => void;
  returnTo: string;
};

function NameListRemoveMenuItems({
  fichaId,
  hasOrganizedNameList,
  hasRawNameList,
  removeListaIaFormAction,
  removeListaRawFormAction,
  returnTo,
}: NameListRemoveMenuItemsProps) {
  return (
    <>
      {hasOrganizedNameList ? (
        <form action={removeListaIaFormAction} className="floating-menu__form">
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <RemoveNameListSubmitButton label="Remover lista de nomes (organizada)" />
        </form>
      ) : null}
      {hasRawNameList ? (
        <form action={removeListaRawFormAction} className="floating-menu__form">
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <RemoveNameListSubmitButton label="Remover lista de nomes (bruta)" />
        </form>
      ) : null}
    </>
  );
}

function RemoveNameListSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className="floating-menu__item floating-menu__item--danger" disabled={pending} role="menuitem" type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <Trash2 aria-hidden="true" size={16} />}
      {pending ? "Removendo..." : label}
    </button>
  );
}

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
    <AlertDialog
      description={`Esta ação remove a ficha de ${fichaLabel} e seus itens vinculados. Digite o código para confirmar.`}
      onClose={onClose}
      size="sm"
      title="Remover ficha"
    >
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

function RevertFichaDialog({ fichaId, fichaLabel, formAction, onClose, returnTo }: RevertFichaDialogProps) {
  return (
    <AlertDialog
      description={`A ficha de ${fichaLabel} voltará para o status pendente e sairá da lista de entregues.`}
      onClose={onClose}
      size="sm"
      title="Reverter para pendente"
    >
      <section className="confirm-dialog" aria-describedby="revert-ficha-description">
        <header className="confirm-dialog__header">
          <div>
            <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
            <h2 id="revert-ficha-title">Reverter para pendente</h2>
          </div>
        </header>

        <p id="revert-ficha-description">
          A ficha de <strong>{fichaLabel}</strong> voltará para o status pendente e sairá da lista de entregues.
        </p>

        <form action={formAction} className="confirm-dialog__form">
          <input name="id" type="hidden" value={fichaId} />
          <input name="returnTo" type="hidden" value={returnTo} />

          <div className="confirm-dialog__actions">
            <button className="ui-button ui-button--ghost" onClick={onClose} type="button">
              Cancelar
            </button>
            <RevertSubmitButton />
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
      {pending ? "Removendo..." : "Remover ficha"}
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
      {pending ? "Marcando..." : "Marcar como entregue"}
    </button>
  );
}

function RevertSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className="ui-button ui-button--warning" disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : <RotateCcw aria-hidden="true" size={16} />}
      {pending ? "Revertendo..." : "Reverter para pendente"}
    </button>
  );
}
