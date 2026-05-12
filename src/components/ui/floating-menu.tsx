"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, CSSProperties, MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [menuPosition, setMenuPosition] = useState<CSSProperties | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const rootElement = rootRef.current;
    if (!triggerElement || !rootElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const rootStyles = window.getComputedStyle(rootElement);
    const minWidth = rootStyles.getPropertyValue("--floating-menu-min-width").trim() || "232px";
    const menuWidth = menuRef.current?.offsetWidth || Number.parseFloat(minWidth) || 232;
    const viewportPadding = 8;
    const top = Math.min(triggerRect.bottom + 8, window.innerHeight - viewportPadding);
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.right - menuWidth),
      Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
    );

    setMenuPosition({
      "--floating-menu-min-width": minWidth,
      left,
      top,
    } as CSSProperties);
  }, []);

  function handleMenuClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest('button[type="submit"]')) {
      return;
    }

    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    updateMenuPosition();
    const frame = window.requestAnimationFrame(updateMenuPosition);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div className="floating-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="icon-action floating-menu__trigger"
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="floating-menu__content"
              id={menuId}
              onClick={handleMenuClick}
              ref={menuRef}
              role="menu"
              style={menuPosition ?? undefined}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
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
