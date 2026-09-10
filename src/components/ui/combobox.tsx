"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { IconButton } from "./icon-button";

export type ComboboxOption = {
  aliases?: string[];
  description?: string;
  disabled?: boolean;
  label: string;
  value: string;
};

type ComboboxProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  id: string;
  loading?: boolean;
  name?: string;
  onInputValueChange?: (value: string) => void;
  onValueChange: (value: string | null, option?: ComboboxOption) => void;
  options: ComboboxOption[];
  placeholder?: string;
  value: string | null;
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function Combobox({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled = false,
  emptyMessage = "Nenhuma opção encontrada",
  id,
  loading = false,
  name,
  onInputValueChange,
  onValueChange,
  options,
  placeholder = "Selecione…",
  value,
}: ComboboxProps) {
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length || (selected && query === selected.label)) return options.slice(0, 20);
    return options.filter((option) => {
      const searchable = normalize([option.label, option.description, ...(option.aliases ?? [])].filter(Boolean).join(" "));
      return terms.every((term) => searchable.includes(term));
    }).slice(0, 20);
  }, [options, query, selected]);

  function selectOption(option: ComboboxOption) {
    if (option.disabled) return;
    setQuery(option.label);
    onValueChange(option.value, option);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      selectOption(filtered[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="combobox">
        {name ? <input name={name} type="hidden" value={value ?? ""} /> : null}
        <Popover.Trigger asChild>
          <input
            aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-describedby={ariaDescribedBy}
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            autoComplete="off"
            disabled={disabled}
            id={id}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              onInputValueChange?.(event.currentTarget.value);
              setActiveIndex(0);
              onValueChange(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={(event) => { event.preventDefault(); setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            type="text"
            value={query}
          />
        </Popover.Trigger>
        {loading ? <LoaderCircle aria-label="Carregando opções" className="combobox__spinner" size={18} /> : null}
        {value ? (
          <IconButton
            appearance="bare"
            className="combobox__clear"
            label="Limpar seleção"
            onClick={() => { setQuery(""); onInputValueChange?.(""); onValueChange(null); setOpen(true); }}
            tooltip={false}
          >
            <X aria-hidden="true" size={16} />
          </IconButton>
        ) : (
          <ChevronDown aria-hidden="true" className="combobox__chevron" size={18} />
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="combobox__content"
          onOpenAutoFocus={(event) => event.preventDefault()}
          sideOffset={6}
        >
          <div id={listboxId} role="listbox">
            {loading ? <div className="combobox__empty">Carregando…</div> : filtered.length ? filtered.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className="combobox__option"
                disabled={option.disabled}
                id={`${listboxId}-${index}`}
                key={option.value}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                role="option"
                tabIndex={-1}
                type="button"
              >
                <span><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
                {option.value === value ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            )) : <div className="combobox__empty">{emptyMessage}</div>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
