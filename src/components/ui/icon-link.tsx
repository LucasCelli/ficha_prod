import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Tooltip } from "./tooltip";

type IconLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  /** Ver `IconButton`: `bare` mantem o CSS herdado do controle. */
  appearance?: "solid" | "bare";
  children: ReactNode;
  /** Rotulo acessivel. Vira tambem o texto do Tooltip, salvo `tooltip={false}`. */
  label: string;
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
 * Par de `IconButton` para acoes que sao navegacao.
 *
 * Existe porque boa parte das acoes icon-only do produto sao links (abrir
 * previa, editar), e trocar `<Link>` por `<button>` quebraria abrir em nova aba,
 * copiar endereco e o prefetch do App Router.
 */
export function IconLink({
  appearance = "solid",
  children,
  className,
  label,
  size = "md",
  tone = "neutral",
  tooltip = true,
  tooltipLabel,
  tooltipSide = "top",
  ...props
}: IconLinkProps) {
  const classes = (
    appearance === "bare"
      ? ["icon-touch", className]
      : ["ui-icon-button", `ui-icon-button--${size}`, `ui-icon-button--${tone}`, className]
  )
    .filter(Boolean)
    .join(" ");

  const link = (
    <Link aria-label={label} className={classes} {...props}>
      {children}
    </Link>
  );

  if (!tooltip) return link;

  return (
    <Tooltip label={tooltipLabel ?? label} side={tooltipSide}>
      {link}
    </Tooltip>
  );
}
