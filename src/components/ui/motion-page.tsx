"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTransition, pageMotion, transitionForReducedMotion } from "./motion-presets";

type MotionPageProps = {
  children: ReactNode;
};

export function MotionPage({ children }: MotionPageProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="app-main">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={pathname}
          className="app-main__motion"
          variants={pageMotion}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          exit={reduceMotion ? undefined : "exit"}
          transition={transitionForReducedMotion(reduceMotion, motionTransition.normal)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
