import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className, type = "button", variant = "primary", ...props }: ButtonProps) {
  const classes = ["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
