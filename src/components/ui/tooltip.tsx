"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  children: ReactNode;
  label: string;
};

export function Tooltip({ children, label }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    side: "bottom" | "top";
    top: number;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;

      if (!trigger || !tooltip) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportPadding = 8;
      let left = triggerRect.left + triggerRect.width / 2;
      const minLeft = viewportPadding + tooltipRect.width / 2;
      const maxLeft = window.innerWidth - viewportPadding - tooltipRect.width / 2;
      left = Math.min(Math.max(left, minLeft), maxLeft);

      let side: "bottom" | "top" = "top";
      let top = triggerRect.top - 10;

      if (triggerRect.top - tooltipRect.height - 10 < viewportPadding) {
        side = "bottom";
        top = triggerRect.bottom + 10;
      }

      setPosition({ left, side, top });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, label]);

  const tooltipStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        top: position.top,
      }
    : undefined;

  return (
    <span
      ref={triggerRef}
      className="ui-tooltip"
      data-dismissed={dismissed ? "true" : undefined}
      data-open={open ? "true" : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onClickCapture={() => {
        setDismissed(true);
        setOpen(false);
      }}
      onFocus={() => {
        if (!dismissed) {
          setOpen(true);
        }
      }}
      onPointerEnter={() => {
        setDismissed(false);
        setOpen(true);
      }}
      onPointerLeave={() => {
        setOpen(false);
      }}
    >
      {children}
      {typeof document !== "undefined" && open
        ? createPortal(
            <span
              className="ui-tooltip__content"
              data-side={position?.side ?? "top"}
              ref={tooltipRef}
              role="tooltip"
              style={tooltipStyle}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
