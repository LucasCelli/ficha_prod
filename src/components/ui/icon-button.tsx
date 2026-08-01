"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";
import { motionTransition } from "./motion-presets";
import { Tooltip } from "./tooltip";

type IconButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  /**
   * - `solid` (padrao): visual do design system (tamanho, borda, tons).
   * - `bare`: sem visual proprio. Para controles herdados que ja tem CSS
   *   dedicado e so precisam do contrato do primitivo (rotulo, tooltip,
   *   pending e alvo de toque de 44px).
   */
  appearance?: "solid" | "bare";
  children: ReactNode;
  /** Rotulo acessivel. Vira tambem o texto do Tooltip, salvo `tooltip={false}`. */
  label: string;
  pending?: boolean;
  /** `sm` e `md` sao o tamanho visual; a area clicavel minima de 44px
   *  e garantida em ponteiro grosso pelo CSS. Ignorado em `appearance="bare"`. */
  size?: "sm" | "md" | "lg";
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  tooltip?: boolean;
  /**
   * Texto do tooltip quando ele deve ser mais curto que o rotulo acessivel.
   * O `label` costuma incluir o nome do registro ("Editar ficha Fulano") para
   * ficar util fora de contexto; o tooltip visual nao precisa repetir isso.
   */
  tooltipLabel?: string;
  tooltipSide?: "top" | "right";
};

/**
 * Botao icon-only padrao: rotulo acessivel obrigatorio, tooltip do design system
 * (nunca `title=""` nativo), estado pending e tons semanticos.
 */
export function IconButton({
  appearance = "solid",
  children,
  className,
  label,
  pending = false,
  size = "md",
  tone = "neutral",
  tooltip = true,
  tooltipLabel,
  tooltipSide = "top",
  type = "button",
  ...props
}: IconButtonProps) {
  const isDisabled = Boolean(props.disabled || props["aria-disabled"] || pending);
  const classes = (
    appearance === "bare"
      ? ["icon-touch", className]
      : ["ui-icon-button", `ui-icon-button--${size}`, `ui-icon-button--${tone}`, className]
  )
    .filter(Boolean)
    .join(" ");

  const button = (
    <motion.button
      aria-busy={pending || undefined}
      aria-label={label}
      className={classes}
      data-pending={pending ? "true" : undefined}
      type={type}
      whileTap={isDisabled ? undefined : { scale: 0.94 }}
      transition={motionTransition.fast}
      {...props}
    >
      {pending ? <Loader2 aria-hidden="true" className="ui-icon-button__spinner" size={16} /> : children}
    </motion.button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip label={tooltipLabel ?? label} side={tooltipSide}>
      {button}
    </Tooltip>
  );
}
