"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useState } from "react";

type PrintTriggerButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  href: string;
  label: string;
};

export function PrintTriggerButton({ children, className, disabled, href, label, onClick, type = "button", ...props }: PrintTriggerButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const isDisabled = disabled || isPrinting;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented || isDisabled) {
      return;
    }

    const separator = href.includes("?") ? "&" : "?";
    const frame = document.createElement("iframe");

    setIsPrinting(true);
    frame.className = "print-trigger-frame";
    frame.title = label;
    frame.onload = () => {
      window.setTimeout(() => setIsPrinting(false), 1200);
      window.setTimeout(() => frame.remove(), 12000);
    };
    document.body.appendChild(frame);
    frame.src = `${href}${separator}_print=${Date.now()}`;
  }

  return (
    <>
      <button
        aria-disabled={isDisabled}
        aria-label={label}
        className={className}
        disabled={isDisabled}
        onClick={handleClick}
        type={type}
        {...props}
      >
        {children}
      </button>
    </>
  );
}
