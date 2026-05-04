type LoadingBarProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function LoadingBar({ className, size = "md" }: LoadingBarProps) {
  const classes = ["loading-bar", `loading-bar--${size}`, className].filter(Boolean).join(" ");

  return (
    <span aria-hidden="true" className={classes}>
      <span className="loading-bar__beam" />
    </span>
  );
}
