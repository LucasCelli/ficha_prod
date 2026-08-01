import type { ReactNode } from "react";

type StatusPanelProps = {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  /** `h1` por padrao. Use `h2` quando a tela ja tiver um `h1`. */
  headingLevel?: "h1" | "h2";
  /** Precisa ser unico quando houver mais de um StatusPanel na mesma tela. */
  id?: string;
  title: string;
  tone?: "neutral" | "info" | "danger";
};

export function StatusPanel({
  actions,
  description,
  eyebrow,
  headingLevel = "h1",
  id = "status-panel-title",
  title,
  tone = "neutral",
}: StatusPanelProps) {
  const Heading = headingLevel;

  return (
    <section className={`status-panel status-panel--${tone}`} aria-labelledby={id}>
      <div className="status-panel__marker" aria-hidden="true" />
      <div className="status-panel__content">
        {eyebrow ? <p className="status-panel__eyebrow">{eyebrow}</p> : null}
        <Heading id={id} className="status-panel__title">
          {title}
        </Heading>
        <p className="status-panel__description">{description}</p>
        {actions ? <div className="status-panel__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
