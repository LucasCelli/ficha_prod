import type { ReactNode } from "react";

type StatusPanelProps = {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  tone?: "neutral" | "info" | "danger";
};

export function StatusPanel({ actions, description, eyebrow, title, tone = "neutral" }: StatusPanelProps) {
  return (
    <section className={`status-panel status-panel--${tone}`} aria-labelledby="status-panel-title">
      <div className="status-panel__marker" aria-hidden="true" />
      <div className="status-panel__content">
        {eyebrow ? <p className="status-panel__eyebrow">{eyebrow}</p> : null}
        <h1 id="status-panel-title" className="status-panel__title">
          {title}
        </h1>
        <p className="status-panel__description">{description}</p>
        {actions ? <div className="status-panel__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
