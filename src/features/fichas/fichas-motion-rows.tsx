"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { motionTransition, transitionForReducedMotion } from "@/components/ui/motion-presets";

export function FichasMotionRows({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

export function FichaMotionRow({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.tr
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
      layout="position"
      transition={transitionForReducedMotion(reduceMotion, motionTransition.normal)}
    >
      {children}
    </motion.tr>
  );
}
