"use client";

import Image from "next/image";
import { useId, useImperativeHandle, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTransition, popoverMotion, transitionForReducedMotion } from "./motion-presets";

// Miniatura opcional das opcoes: quem monta as options ja entrega a URL na
// mesma proporcao para nao servir imagem maior do que o menu usa.
export const CUSTOM_DATALIST_IMAGE_WIDTH = 72;
export const CUSTOM_DATALIST_IMAGE_HEIGHT = 40;

export type CustomDatalistOption = {
  aliases?: string[];
  details?: string[];
  // Identidade da opcao. Obrigatorio quando duas opcoes podem ter o mesmo
  // rotulo (ex.: dois pedidos do mesmo cliente); sem ele a chave cai no indice.
  id?: string;
  imageUrl?: string | null;
  label: string;
  metadata?: Record<string, string>;
  value?: string;
};

// Permite que quem carrega as opcoes de forma assincrona devolva o foco ao
// campo e reabra o menu quando o resultado chega.
export type CustomDatalistHandle = {
  focusAndOpen: () => void;
};

type CustomDatalistProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  defaultValue?: string;
  id: string;
  inputMode?: "text" | "numeric";
  name?: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onEnterKey?: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string, option?: CustomDatalistOption) => void;
  options: CustomDatalistOption[];
  placeholder?: string;
  ref?: Ref<CustomDatalistHandle>;
  value?: string;
  "data-product-column"?: string;
  "data-product-index"?: number;
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
  onBlur,
  onEnterKey,
  onFocus,
  onKeyDown,
  onValueChange,
  options,
  placeholder,
  ref,
  value,
  "data-product-column": dataProductColumn,
  "data-product-index": dataProductIndex,
}: CustomDatalistProps) {
  const listboxId = useId();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentValue = value ?? internalValue;
  const filteredOptions = useMemo(() => {
    // Cada termo digitado e procurado em separado: uma busca por "pedro 6571"
    // encontra a opcao mesmo que o numero da venda esteja em outro campo.
    const terms = normalize(currentValue).split(/\s+/).filter(Boolean);
    if (!terms.length) return options.slice(0, 12);

    return options
      .filter((option) => {
        const optionText = normalize([option.label, option.value, ...(option.aliases ?? [])].filter(Boolean).join(" "));
        return terms.every((term) => optionText.includes(term));
      })
      .slice(0, 12);
  }, [currentValue, options]);

  useImperativeHandle(ref, () => ({
    focusAndOpen() {
      inputRef.current?.focus();
      setActiveIndex(0);
      setIsOpen(true);
    },
  }), []);

  function setValue(nextValue: string, option?: CustomDatalistOption) {
    setInternalValue(nextValue);
    onValueChange?.(nextValue, option);
  }

  function selectOption(option: CustomDatalistOption) {
    const nextValue = option.value ?? option.label;
    setValue(nextValue, option);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.value = nextValue;
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      inputRef.current.focus();
    }
  }

  return (
    <div
      className="custom-datalist"
      onBlur={(event) => {
        // Fecha apenas quando o foco sai do combobox inteiro. Sem timers:
        // nada e removido debaixo do elemento que acabou de receber foco.
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <input
        aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        autoComplete="off"
        data-product-column={dataProductColumn}
        data-product-index={dataProductIndex}
        id={id}
        inputMode={inputMode}
        name={name}
        onBlur={onBlur}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;

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

          if (event.key === "Enter" && (!isOpen || !filteredOptions[activeIndex])) {
            event.preventDefault();
            onEnterKey?.(currentValue);
            setIsOpen(false);
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
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate="visible"
            className="custom-datalist__menu"
            exit="exit"
            id={listboxId}
            initial={reduceMotion ? false : "hidden"}
            role="listbox"
            transition={transitionForReducedMotion(reduceMotion, motionTransition.fast)}
            variants={popoverMotion}
          >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              // As opcoes nao entram na ordem de Tab: o foco permanece no input e a
              // opcao ativa e anunciada por aria-activedescendant. Isso evita que o
              // fechamento por blur remova o elemento que acabou de receber foco.
              <div
                aria-selected={index === activeIndex}
                className={["custom-datalist__option", option.imageUrl ? "custom-datalist__option--media" : null]
                  .filter(Boolean)
                  .join(" ")}
                id={`${listboxId}-${index}`}
                key={option.id ?? `${index}-${option.value ?? option.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                role="option"
                tabIndex={-1}
              >
                {option.imageUrl ? (
                  <Image
                    alt=""
                    className="custom-datalist__thumb"
                    height={CUSTOM_DATALIST_IMAGE_HEIGHT}
                    src={option.imageUrl}
                    unoptimized
                    width={CUSTOM_DATALIST_IMAGE_WIDTH}
                  />
                ) : null}
                <span className="custom-datalist__option-text">
                  <span>{option.label}</span>
                  {option.details?.length ? <small>{option.details.join(" · ")}</small> : null}
                </span>
              </div>
            ))
          ) : (
            <div className="custom-datalist__empty">Nenhuma sugestão</div>
          )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
