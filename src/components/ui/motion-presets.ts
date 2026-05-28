import type { Transition, Variants } from "motion/react";

export const motionEase = [0.22, 1, 0.36, 1] as const;

export const motionDuration = {
  fast: 0.14,
  normal: 0.2,
  slow: 0.28,
} as const;

export const motionTransition = {
  fast: { duration: motionDuration.fast, ease: "easeOut" },
  normal: { duration: motionDuration.normal, ease: motionEase },
  slow: { duration: motionDuration.slow, ease: motionEase },
} satisfies Record<string, Transition>;

export const dialogOverlayMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dialogContentMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98, x: "-50%", y: "-48%" },
  visible: { opacity: 1, scale: 1, x: "-50%", y: "-50%" },
  exit: { opacity: 0, scale: 0.98, x: "-50%", y: "-48%" },
};

export const pageMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const popoverMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -4 },
};

export const tooltipMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98, x: "-50%", y: -4 },
  visible: { opacity: 1, scale: 1, x: "-50%", y: 0 },
  exit: { opacity: 0, scale: 0.98, x: "-50%", y: -4 },
};

export const tooltipBottomMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98, x: "-50%", y: 4 },
  visible: { opacity: 1, scale: 1, x: "-50%", y: 0 },
  exit: { opacity: 0, scale: 0.98, x: "-50%", y: 4 },
};

export const tooltipRightMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98, x: -4 },
  visible: { opacity: 1, scale: 1, x: 0 },
  exit: { opacity: 0, scale: 0.98, x: -4 },
};

export const listItemMotion: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0, marginBottom: 0, y: -6 },
};

export const collapseMotion: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

export function transitionForReducedMotion(reduceMotion: boolean | null, transition: Transition = motionTransition.normal) {
  return reduceMotion ? { duration: 0 } : transition;
}
