"use client";

import { useId, useMemo, useRef, useState } from "react";

export type CustomDatalistOption = {
  aliases?: string[];
  details?: string[];
  label: string;
  metadata?: Record<string, string>;
  value?: string;
};

type CustomDatalistProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  defaultValue?: string;
  id: string;
  inputMode?: "text" | "numeric";
  name?: string;
  onValueChange?: (value: string, option?: CustomDatalistOption) => void;
  options: CustomDatalistOption[];
  placeholder?: string;
  value?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function CustomDatalist({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  defaultValue = "",
  id,
  inputMode = "text",
  name,
  onValueChange,
  options,
  placeholder,
  value,
}: CustomDatalistProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentValue = value ?? internalValue;
  const filteredOptions = useMemo(() => {
    const search = normalize(currentValue);
    if (!search) return options.slice(0, 12);

    return options
      .filter((option) => {
        const optionText = [option.label, option.value, ...(option.aliases ?? [])].filter(Boolean).join(" ");
        return normalize(optionText).includes(search);
      })
      .slice(0, 12);
  }, [currentValue, options]);

  function setValue(nextValue: string, option?: CustomDatalistOption) {
    setInternalValue(nextValue);
    onValueChange?.(nextValue, option);
  }

  function selectOption(option: CustomDatalistOption) {
    setValue(option.value ?? option.label, option);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="custom-datalist">
      <input
        aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        autoComplete="off"
        id={id}
        inputMode={inputMode}
        name={name}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)));
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          }

          if (event.key === "Enter" && isOpen && filteredOptions[activeIndex]) {
            event.preventDefault();
            selectOption(filteredOptions[activeIndex]);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        value={currentValue}
      />
      {isOpen ? (
        <div className="custom-datalist__menu" id={listboxId} role="listbox">
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <button
                aria-selected={index === activeIndex}
                className="custom-datalist__option"
                id={`${listboxId}-${index}`}
                key={`${option.label}-${option.value ?? option.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {option.details?.length ? <small>{option.details.join(", ")}</small> : null}
              </button>
            ))
          ) : (
            <div className="custom-datalist__empty">Nenhuma sugestão</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
