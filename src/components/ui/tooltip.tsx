"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  motionTransition,
  tooltipBottomMotion,
  tooltipMotion,
  transitionForReducedMotion,
} from "./motion-presets";

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
  const reduceMotion = useReducedMotion();

  function handleOpen() {
    setDismissed(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  useEffect(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    function handleFocusOut(event: FocusEvent) {
      if (!trigger?.contains(event.relatedTarget as Node | null)) {
        handleClose();
      }
    }

    function handleClick() {
      setDismissed(true);
      handleClose();
    }

    trigger.addEventListener("mouseenter", handleOpen);
    trigger.addEventListener("mouseleave", handleClose);
    trigger.addEventListener("focusin", handleOpen);
    trigger.addEventListener("focusout", handleFocusOut);
    trigger.addEventListener("click", handleClick, { capture: true });

    return () => {
      trigger.removeEventListener("mouseenter", handleOpen);
      trigger.removeEventListener("mouseleave", handleClose);
      trigger.removeEventListener("focusin", handleOpen);
      trigger.removeEventListener("focusout", handleFocusOut);
      trigger.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

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
      let top = triggerRect.top - 40;

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
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onPointerEnter={handleOpen}
      onPointerLeave={handleClose}
    >
      {children}
      {typeof document !== "undefined" && (open || position)
        ? createPortal(
            <AnimatePresence initial={false}>
              {open ? (
                <motion.span
                  animate="visible"
                  className="ui-tooltip__content"
                  data-open="true"
                  data-side={position?.side ?? "top"}
                  exit="exit"
                  initial={reduceMotion ? false : "hidden"}
                  ref={tooltipRef}
                  role="tooltip"
                  style={tooltipStyle}
                  transition={transitionForReducedMotion(reduceMotion, motionTransition.fast)}
                  variants={position?.side === "bottom" ? tooltipBottomMotion : tooltipMotion}
                >
                  {label}
                </motion.span>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </span>
  );
}
