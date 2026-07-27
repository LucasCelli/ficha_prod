"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { CalendarDays } from "lucide-react";
import { formatDateInput, formatLocalDateInput, parseDateInputToLocalDate } from "@/lib/dates";

type DatePickerFieldProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  id: string;
  initialValue?: string | null;
  name: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
};

export function DatePickerField({
  "aria-describedby": describedBy,
  "aria-invalid": invalid = false,
  id,
  initialValue,
  name,
  onValueChange,
  required = false,
}: DatePickerFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDateInputToLocalDate(value);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="date-picker" ref={wrapperRef}>
      <input ref={inputRef} name={name} type="hidden" value={value} />
      <button
        id={id}
        aria-describedby={describedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="date-picker__trigger"
        data-invalid={invalid ? "true" : "false"}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={17} />
        <span data-placeholder={value ? "false" : "true"}>{formatDateLabel(value)}</span>
      </button>
      {isOpen ? (
        <div className="date-picker__popover" role="dialog" aria-label="Selecionar data">
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={(date) => {
              if (!date && required) return;
              const nextValue = formatLocalDateInput(date);
              setValue(nextValue);
              onValueChange?.(nextValue);
              setIsOpen(false);
            }}
            modifiers={{
              weekend: { dayOfWeek: [0, 6] },
            }}
            modifiersClassNames={{
              weekend: "rdp-day--weekend",
            }}
            weekStartsOn={0}
          />
        </div>
      ) : null}
    </div>
  );
}

function formatDateLabel(value: string) {
  if (!parseDateInputToLocalDate(value)) return "Selecionar data";
  return formatDateInput(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}