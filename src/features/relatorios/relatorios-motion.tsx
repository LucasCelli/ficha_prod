"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import type { HTMLMotionProps } from "motion/react";
import { motion, useInView } from "motion/react";

type MotionBlockProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
};

type MotionSectionProps = HTMLMotionProps<"section"> & {
  children: ReactNode;
  delay?: number;
};

const viewport = { amount: 0.18, margin: "0px 0px -8% 0px", once: true } as const;

function getTransition(delay = 0) {
  return {
    delay,
    duration: 0.9,
    ease: [0.22, 1, 0.36, 1] as const,
  };
}

export function RelatorioMotionBlock({ children, delay = 0, ...props }: MotionBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useInView(ref, viewport);

  return (
    <motion.div
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      ref={ref}
      transition={getTransition(delay)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RelatorioMotionSection({ children, delay = 0, ...props }: MotionSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const visible = useInView(ref, viewport);

  return (
    <motion.section
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 34 }}
      ref={ref}
      transition={getTransition(delay)}
      {...props}
    >
      {children}
    </motion.section>
  );
}
