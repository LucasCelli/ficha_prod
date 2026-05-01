import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  const classes = ["ui-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes} {...props}>
      {children}
    </article>
  );
}
