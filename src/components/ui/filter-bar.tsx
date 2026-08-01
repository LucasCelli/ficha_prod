import type { ReactNode } from "react";
import Link from "next/link";

type FilterBarProps = {
  children: ReactNode;
  /** Rotulo do grupo de filtros. Obrigatorio: a barra e uma regiao navegavel. */
  label: string;
  className?: string;
};

/** Agrupa controles de filtro com alvo de toque e espacamento padronizados. */
export function FilterBar({ children, className, label }: FilterBarProps) {
  return (
    <div aria-label={label} className={["ui-filter-bar", className].filter(Boolean).join(" ")} role="group">
      {children}
    </div>
  );
}

type FilterFieldProps = {
  children: ReactNode;
  /** Sempre visivel por padrao; use `visuallyHidden` so quando a densidade exigir. */
  label: string;
  htmlFor: string;
  visuallyHidden?: boolean;
};

/** Campo de filtro com label persistente (nunca apenas placeholder). */
export function FilterField({ children, htmlFor, label, visuallyHidden = false }: FilterFieldProps) {
  return (
    <div className="ui-filter-bar__field">
      <label className={visuallyHidden ? "sr-only" : "ui-filter-bar__label"} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

type FilterChipProps = {
  active?: boolean;
  children: ReactNode;
  href: string;
};

/** Chip de filtro navegavel. Mantem estado na URL e alvo de toque de 44px. */
export function FilterChip({ active = false, children, href }: FilterChipProps) {
  return (
    <Link aria-current={active ? "true" : undefined} className="ui-filter-chip" data-active={active ? "true" : undefined} href={href}>
      {children}
    </Link>
  );
}
