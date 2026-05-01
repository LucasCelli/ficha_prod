import type { ReactNode } from "react";

type EmptyStateProps = {
  actions?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ actions, description, title }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state__marker" aria-hidden="true" />
      <div className="empty-state__content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </section>
  );
}
