"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

type FloatingMenuProps = {
  children: ReactNode;
  label: string;
  trigger: ReactNode;
};

type FloatingMenuLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  danger?: boolean;
};

type FloatingMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  danger?: boolean;
};

export function FloatingMenu({ children, label, trigger }: FloatingMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".floating-menu__trigger")?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="floating-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="icon-action floating-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {trigger}
      </button>
      {open ? (
        <div className="floating-menu__content" id={menuId} onClick={() => setOpen(false)} role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function FloatingMenuLink({ children, className, danger = false, ...props }: FloatingMenuLinkProps) {
  return (
    <Link className={getItemClassName(className, danger)} role="menuitem" {...props}>
      {children}
    </Link>
  );
}

export function FloatingMenuButton({ children, className, danger = false, type = "button", ...props }: FloatingMenuButtonProps) {
  return (
    <button className={getItemClassName(className, danger)} role="menuitem" type={type} {...props}>
      {children}
    </button>
  );
}

function getItemClassName(className: string | undefined, danger: boolean) {
  return ["floating-menu__item", danger ? "floating-menu__item--danger" : null, className].filter(Boolean).join(" ");
}
