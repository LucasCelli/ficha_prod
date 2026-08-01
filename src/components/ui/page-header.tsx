import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  /** Conteudo abaixo do titulo (metricas, badges). */
  children?: ReactNode;
  eyebrow?: string;
  /** `h1` por padrao. Use `h2` apenas quando ja existir um `h1` na tela. */
  headingLevel?: "h1" | "h2";
  id?: string;
  title: string;
};

/**
 * Cabecalho de tela: garante um unico nivel de titulo consistente por rota
 * e uma unica combinacao de eyebrow + titulo + acoes.
 */
export function PageHeader({ actions, children, eyebrow, headingLevel = "h1", id = "page-title", title }: PageHeaderProps) {
  const Heading = headingLevel;

  return (
    <header className="ui-page-header">
      <div className="ui-page-header__text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <Heading className="ui-page-header__title" id={id}>
          {title}
        </Heading>
        {children}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}
