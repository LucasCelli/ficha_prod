"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { markFichaEntregueAction } from "./actions";
import type { FichaStatus } from "./data";
import { getInitialFichaStatusActionState } from "./form-state";

type FichaStatusActionsProps = {
  fichaId: string;
  status: FichaStatus;
};

const statusTone: Record<FichaStatus, "danger" | "success" | "warning"> = {
  cancelado: "danger",
  entregue: "success",
  pendente: "warning",
};

const statusLabel: Record<FichaStatus, string> = {
  cancelado: "Cancelada",
  entregue: "Entregue",
  pendente: "Pendente",
};

export function FichaStatusActions({ fichaId, status }: FichaStatusActionsProps) {
  const [state, formAction] = useActionState(markFichaEntregueAction, getInitialFichaStatusActionState());
  const isDelivered = status === "entregue";

  return (
    <section className="ficha-status-actions" aria-labelledby="ficha-status-title">
      <div className="ficha-status-actions__copy">
        <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
        <h2 id="ficha-status-title">Status da ficha</h2>
        <p>{isDelivered ? "Esta ficha já foi marcada como entregue." : "Finalize a ficha quando a entrega estiver concluída."}</p>
      </div>

      <form action={formAction}>
        <input name="id" type="hidden" value={fichaId} />
        <StatusSubmitButton disabled={isDelivered} />
      </form>

      {state.message ? (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}

function StatusSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button aria-disabled={isDisabled} disabled={isDisabled} type="submit" variant="secondary">
      {pending ? <span className="button-spinner button-spinner--contrast" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" size={18} />}
      Marcar como entregue
    </Button>
  );
}
