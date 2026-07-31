"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, CircleAlert, CircleX, Save } from "lucide-react";
import { Button } from "@/components/ui";
import { addDaysToInput, createUtcDateFromInput, getBusinessTodayInput, getDateInputDifferenceInDays } from "@/lib/dates";
import type { ProductFormItem } from "./ficha-form-seed";

type FieldProps = {
  children: ReactNode;
  error?: string;
  full?: boolean;
  label: string;
  name: string;
  required?: boolean;
};

export function DeliveryDeadlineAlert({ deliveryDate }: { deliveryDate: string }) {
  const daysRemaining = getDateInputDifferenceInDays(deliveryDate);
  if (!deliveryDate || daysRemaining === null) return null;

  const tone = getDeadlineTone(daysRemaining);
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? CircleAlert : CircleX;
  const businessDaysRemaining = daysRemaining >= 0 ? getBusinessDaysRemaining(deliveryDate) : null;

  return (
    <div className="delivery-deadline-alert" data-tone={tone} role="status">
      <Icon aria-hidden="true" size={18} />
      <span>
        {getDeadlineMessage(daysRemaining, tone)}
        {businessDaysRemaining !== null ? <>{" "}<strong>({formatBusinessDayCount(businessDaysRemaining)}!)</strong></> : null}
      </span>
    </div>
  );
}

function getDeadlineTone(daysRemaining: number) {
  if (daysRemaining <= 7) return "danger";
  if (daysRemaining <= 14) return "warning";
  return "success";
}

function getDeadlineMessage(daysRemaining: number, tone: "danger" | "success" | "warning") {
  if (daysRemaining < 0) return `Prazo vencido! Entrega atrasada há ${formatDayCount(Math.abs(daysRemaining))}.`;
  const remaining = formatDayCount(daysRemaining);
  if (tone === "danger") return `Prazo curto! Restam ${remaining} para a entrega desse pedido!`;
  if (tone === "warning") return `Prazo moderado. Restam ${remaining} para a entrega desse pedido!`;
  return `Restam ${remaining} para a entrega desse pedido!`;
}

function formatDayCount(value: number) {
  return `${value} ${value === 1 ? "dia" : "dias"}`;
}

function formatBusinessDayCount(value: number) {
  return `${value} ${value === 1 ? "dia útil" : "dias úteis"}`;
}

function getBusinessDaysRemaining(target: string) {
  const calendarDays = getDateInputDifferenceInDays(target);
  if (calendarDays === null || calendarDays < 0) return null;
  let businessDays = 0;
  const today = getBusinessTodayInput();
  for (let offset = 1; offset <= calendarDays; offset += 1) {
    const day = createUtcDateFromInput(addDaysToInput(today, offset)).getUTCDay();
    if (day !== 0 && day !== 6) businessDays += 1;
  }
  return businessDays;
}

export function Field({ children, error, full = false, label, name, required = false }: FieldProps) {
  return (
    <div className={full ? "field field--full" : "field"}>
      <label htmlFor={name}>{label}{required ? " *" : ""}</label>
      {children}
      {error ? <p className="field-error" id={`${name}-error`}>{error}</p> : null}
    </div>
  );
}

export function SubmitButton({ isUploading, label }: { isUploading: boolean; label: string }) {
  const { pending } = useFormStatus();
  const isPending = pending || isUploading;
  const pendingLabel = isUploading ? "Enviando imagens..." : label === "Salvar alterações" ? "Salvando alterações..." : "Salvando ficha...";
  return (
    <Button aria-disabled={isPending} disabled={isPending} type="submit">
      {isPending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {isPending ? pendingLabel : label}
    </Button>
  );
}

export function sumProductQuantities(items: ProductFormItem[]) {
  return items.reduce((total, item) => {
    const quantity = Number.parseInt(String(item.quantidade ?? "").trim(), 10);
    return total + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
}