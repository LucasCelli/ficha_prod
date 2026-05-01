"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type TooltipProps = {
  children: ReactNode;
  label: string;
};

export function Tooltip({ children, label }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <span
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
      <span className="ui-tooltip__content" role="tooltip">
        {label}
      </span>
    </span>
  );
}
