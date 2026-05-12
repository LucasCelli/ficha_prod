"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionTransition, transitionForReducedMotion } from "./motion-presets";

type LoadingBarProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function LoadingBar({ className, size = "md" }: LoadingBarProps) {
  const classes = ["loading-bar", `loading-bar--${size}`, className].filter(Boolean).join(" ");
  const reduceMotion = useReducedMotion();

  return (
    <span aria-hidden="true" className={classes}>
      <motion.span
        animate={reduceMotion ? { scaleX: 1 } : { scaleX: [0, 1, 1] }}
        className="loading-bar__beam"
        initial={{ scaleX: 0 }}
        transition={
          reduceMotion
            ? transitionForReducedMotion(true, motionTransition.normal)
            : { duration: 1.2, ease: "linear", repeat: Infinity, times: [0, 0.85, 1] }
        }
      />
    </span>
  );
}
