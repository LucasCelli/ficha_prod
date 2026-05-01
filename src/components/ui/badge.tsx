import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
};

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  const classes = ["ui-badge", `ui-badge--${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
