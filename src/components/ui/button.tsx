"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

type ButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning";
};

export function Button({ children, className, type = "button", variant = "primary", ...props }: ButtonProps) {
  const classes = ["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ");
  const isDisabled = Boolean(props.disabled || props["aria-disabled"]);

  return (
    <motion.button
      className={classes}
      type={type}
      whileTap={isDisabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
