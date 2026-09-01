"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type KeyboardEvent } from "react";
import type { CustomDatalistOption } from "./custom-datalist";
import { motionTransition, popoverMotion, transitionForReducedMotion } from "./motion-presets";

type CustomSelectProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  defaultValue?: string;
  id: string;
  name: string;
  options: CustomDatalistOption[];
  placeholder: string;
};

export function CustomSelect({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  defaultValue = "",
  id,
  name,
  options,
  placeholder,
}: CustomSelectProps) {
  const listboxId = useId();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(options.findIndex((option) => option.value === defaultValue), 0),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const selectedOption = options.find((option) => (option.value ?? option.label) === selectedValue);

  function open() {
    const selectedIndex = options.findIndex((option) => (option.value ?? option.label) === selectedValue);
    setActiveIndex(Math.max(selectedIndex, 0));
    setIsOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    setSelectedValue(option.value ?? option.label);
    setActiveIndex(index);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) return open();
      setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) return open();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === "End" && isOpen) {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
    }

    if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault();
      selectOption(activeIndex);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  return (
    <div
      className="custom-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <input name={name} type="hidden" value={selectedValue} />
      <button
        aria-activedescendant={isOpen && options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        className="custom-select__trigger"
        id={id}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        role="combobox"
        type="button"
      >
        <span className={selectedOption ? undefined : "custom-select__placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="custom-select__chevron" size={16} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate="visible"
            className="custom-datalist__menu custom-select__menu"
            exit="exit"
            id={listboxId}
            initial={reduceMotion ? false : "hidden"}
            role="listbox"
            transition={transitionForReducedMotion(reduceMotion, motionTransition.fast)}
            variants={popoverMotion}
          >
            {options.length ? (
              options.map((option, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className="custom-datalist__option"
                  id={`${listboxId}-${index}`}
                  key={option.id ?? option.value ?? option.label}
                  onClick={() => selectOption(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  tabIndex={-1}
                >
                  <span className="custom-datalist__option-text">
                    <span>{option.label}</span>
                  </span>
                </div>
              ))
            ) : (
              <div className="custom-datalist__empty">Nenhuma opção</div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
