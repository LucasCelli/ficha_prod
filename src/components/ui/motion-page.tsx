"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          layout={!reduceMotion}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
